"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { ProGate } from "@/components/ProGate";

const LOAN_TYPES = [
  { name: "Mortgage", minScore: 620, maxDTI: 43, label: "Home Purchase" },
  { name: "Auto Loan", minScore: 580, maxDTI: 50, label: "Car Loan" },
  { name: "Personal Loan", minScore: 580, maxDTI: 45, label: "Personal Loan" },
  { name: "Student Loan Refi", minScore: 650, maxDTI: 50, label: "Student Refi" },
  { name: "Credit Card", minScore: 580, maxDTI: 50, label: "New Credit Card" },
];

interface ReadinessResult {
  score: number;
  label: "Excellent" | "Good" | "Fair" | "Poor";
  color: string;
  blockers: string[];
}

function calcReadiness(creditScore: number | null, dti: number | null, loan: typeof LOAN_TYPES[0]): ReadinessResult {
  const blockers: string[] = [];
  let scorePoints = 100;

  if (creditScore === null) {
    blockers.push("No credit score on record — add one in Scores");
    return { score: 0, label: "Poor", color: "#ef4444", blockers };
  }

  const scoreDelta = creditScore - loan.minScore;
  if (scoreDelta < 0) {
    blockers.push(`Score is ${Math.abs(scoreDelta)} pts below the minimum (${loan.minScore} required)`);
    scorePoints -= 50 + Math.min(50, Math.abs(scoreDelta) * 0.5);
  } else if (scoreDelta < 40) {
    scorePoints -= 15;
    blockers.push(`Score is close to minimum — aim for ${loan.minScore + 40}+ for better rates`);
  }

  if (dti !== null) {
    if (dti > loan.maxDTI) {
      blockers.push(`DTI is ${dti.toFixed(1)}%, which exceeds the max of ${loan.maxDTI}%`);
      scorePoints -= 30 + Math.min(20, (dti - loan.maxDTI));
    } else if (dti > loan.maxDTI * 0.8) {
      blockers.push(`DTI of ${dti.toFixed(1)}% is approaching the limit — keep it below ${loan.maxDTI * 0.8}% for comfort`);
      scorePoints -= 10;
    }
  } else {
    blockers.push("Enter your monthly income and debt payments to calculate DTI");
    scorePoints -= 20;
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(scorePoints)));
  const label: ReadinessResult["label"] =
    finalScore >= 80 ? "Excellent" : finalScore >= 60 ? "Good" : finalScore >= 40 ? "Fair" : "Poor";
  const color = finalScore >= 80 ? "#14b8a6" : finalScore >= 60 ? "#84cc16" : finalScore >= 40 ? "#f59e0b" : "#ef4444";

  return { score: finalScore, label, color, blockers };
}

function ReadinessCircle({ score, color }: { score: number; color: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <svg viewBox="0 0 88 88" className="w-20 h-20">
      <circle cx="44" cy="44" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
      <circle
        cx="44" cy="44" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 44 44)"
      />
      <text x="44" y="49" textAnchor="middle" fontSize="16" fontWeight="700" fill={color}>{score}</text>
    </svg>
  );
}

export default function ReadinessPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [creditScore, setCreditScore] = useState<number | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlyDebt, setMonthlyDebt] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingIncome, setSavingIncome] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        const [scoresRes, profileRes] = await Promise.all([
          fetch("/api/scores", { headers: { Authorization: `Bearer ${user!.idToken}` } }),
          fetch("/api/users/profile", { headers: { Authorization: `Bearer ${user!.idToken}` } }),
        ]);

        if (scoresRes.ok) {
          const d = await scoresRes.json();
          const sorted = (d.scores || []).sort(
            (a: { recordedAt: string }, b: { recordedAt: string }) =>
              new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
          );
          if (sorted.length > 0) setCreditScore(sorted[0].score);
        }

        if (profileRes.ok) {
          const d = await profileRes.json();
          if (d.profile?.monthlyIncome) setMonthlyIncome(String(d.profile.monthlyIncome));
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  const saveIncome = async () => {
    if (!user || !monthlyIncome) return;
    setSavingIncome(true);
    try {
      await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
        body: JSON.stringify({ monthlyIncome: Number(monthlyIncome) }),
      });
    } catch {
      // ignore
    } finally {
      setSavingIncome(false);
    }
  };

  const income = Number(monthlyIncome) || null;
  const debt = Number(monthlyDebt) || null;
  const dti = income && debt ? (debt / income) * 100 : null;

  return (
    <AuthenticatedLayout activeNav="readiness">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Loan Readiness</h1>
        <p className="text-slate-500 text-sm mb-8">
          See how ready you are for different types of loans based on your credit score and debt-to-income ratio.
        </p>

        <ProGate feature="Loan Readiness">
          {/* Income inputs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-8">
            <h2 className="font-semibold text-slate-800 mb-4">Your Financial Profile</h2>
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="w-8 h-8 border-4 border-[#1a3fd4] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 font-medium mb-1">Latest Credit Score</label>
                  <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700">
                    {creditScore ?? "No score on file"}
                  </div>
                  <Link href="/scores" className="text-xs text-teal-600 hover:underline mt-1 block">
                    {creditScore ? "Update score →" : "Add a score →"}
                  </Link>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 font-medium mb-1">Gross Monthly Income ($)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 5000"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    onClick={saveIncome}
                    disabled={savingIncome || !monthlyIncome}
                    className="mt-2 w-full px-3 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
                  >
                    {savingIncome ? "Saving…" : "Save"}
                  </button>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 font-medium mb-1">Monthly Debt Payments ($)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 800"
                    value={monthlyDebt}
                    onChange={(e) => setMonthlyDebt(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">Total of all recurring debt payments</p>
                </div>
              </div>
            )}

            {dti !== null && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3">
                <span className="text-sm text-slate-600">Your DTI ratio:</span>
                <span className={`font-bold text-lg ${dti > 43 ? "text-red-500" : dti > 36 ? "text-amber-500" : "text-emerald-600"}`}>
                  {dti.toFixed(1)}%
                </span>
                <span className="text-xs text-slate-400">
                  {dti <= 36 ? "Excellent" : dti <= 43 ? "Acceptable" : "High — may limit options"}
                </span>
              </div>
            )}
          </div>

          {/* Loan cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LOAN_TYPES.map((loan) => {
              const result = calcReadiness(creditScore, dti, loan);
              const statusLabel = result.score >= 80 ? "Ready" : result.score >= 60 ? "Almost Ready" : "Not Yet";
              const statusClass = result.score >= 80 ? "bg-emerald-100 text-emerald-700" : result.score >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";

              return (
                <div key={loan.name} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-800">{loan.name}</h3>
                      <p className="text-xs text-slate-400">{loan.label}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusClass}`}>{statusLabel}</span>
                  </div>

                  <div className="flex justify-center mb-3">
                    <ReadinessCircle score={result.score} color={result.color} />
                  </div>

                  <p className="text-center text-sm font-semibold mb-3" style={{ color: result.color }}>{result.label}</p>

                  {result.blockers.length > 0 && (
                    <div className="space-y-1.5">
                      {result.blockers.map((b, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-400 mb-2">Min requirements: {loan.minScore}+ score, &lt;{loan.maxDTI}% DTI</p>
                    {result.score < 80 && (
                      <div className="flex gap-2">
                        <Link href="/simulator" className="text-xs text-teal-600 hover:underline">Simulate →</Link>
                        <Link href="/payoff" className="text-xs text-teal-600 hover:underline">Payoff →</Link>
                        <Link href="/disputes" className="text-xs text-teal-600 hover:underline">Disputes →</Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ProGate>
      </main>
    </AuthenticatedLayout>
  );
}

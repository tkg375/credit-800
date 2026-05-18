"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import dynamic from "next/dynamic";
import { downloadCSV } from "@/lib/export-csv";

const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then((m) => m.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });

const BUREAUS = ["Equifax", "Experian", "TransUnion"] as const;
type Bureau = typeof BUREAUS[number];

const BUREAU_COLORS: Record<Bureau, string> = {
  Equifax: "#14b8a6",
  Experian: "#84cc16",
  TransUnion: "#06b6d4",
};

const BUREAU_BG: Record<Bureau, string> = {
  Equifax: "bg-teal-50 border-teal-200",
  Experian: "bg-lime-50 border-lime-200",
  TransUnion: "bg-cyan-50 border-cyan-200",
};

const BUREAU_TEXT: Record<Bureau, string> = {
  Equifax: "text-teal-700",
  Experian: "text-lime-700",
  TransUnion: "text-cyan-700",
};

interface ScoreEntry {
  id: string;
  score: number;
  source: string;
  bureau: string | null;
  recordedAt: string;
}

function normalizeBureau(b: string | null): Bureau | "Other" {
  if (!b) return "Other";
  const lower = b.toLowerCase();
  if (lower.includes("equifax")) return "Equifax";
  if (lower.includes("experian")) return "Experian";
  if (lower.includes("transunion") || lower.includes("trans union")) return "TransUnion";
  return "Other";
}

function scoreLabel(score: number) {
  if (score < 580) return "Poor";
  if (score < 670) return "Fair";
  if (score < 740) return "Good";
  if (score < 800) return "Very Good";
  return "Excellent";
}

function scoreLabelColor(score: number) {
  if (score < 580) return "text-red-600";
  if (score < 670) return "text-orange-500";
  if (score < 740) return "text-amber-500";
  if (score < 800) return "text-lime-600";
  return "text-teal-600";
}

export default function ScoresPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [importing, setImporting] = useState(false);

  const [newScore, setNewScore] = useState(700);
  const [newSource, setNewSource] = useState("Credit Karma");
  const [newBureau, setNewBureau] = useState("Equifax");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
    if (!user) return;
    fetch("/api/scores", { headers: { Authorization: `Bearer ${user.idToken}` } })
      .then((r) => r.json())
      .then((data) => setScores(
        (data.scores || []).map((s: Record<string, unknown>) => ({
          id: s.id as string,
          score: s.score as number,
          source: (s.source as string) || "Unknown",
          bureau: (s.bureau as string) || null,
          recordedAt: (s.recordedAt as string) || "",
        }))
      ))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  const handleImportScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res = await fetch("/api/scores/import", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
          body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to import");
        setScores(prev => [...prev, {
          id: data.id, score: data.score, source: data.source, bureau: data.bureau, recordedAt: data.recordedAt,
        }].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()));
        alert(`Score ${data.score} imported successfully!`);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to import screenshot.");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleAddScore = async () => {
    if (!user) return;
    setAdding(true);
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
        body: JSON.stringify({ score: newScore, source: newSource, bureau: newBureau || null, recordedAt: new Date(newDate).toISOString() }),
      });
      if (!res.ok) throw new Error("Failed to add score");
      const data = await res.json();
      setScores(prev => [...prev, { id: data.id, score: newScore, source: newSource, bureau: newBureau || null, recordedAt: new Date(newDate).toISOString() }]
        .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()));
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert("Failed to add score entry.");
    } finally {
      setAdding(false);
    }
  };

  // Group scores by bureau
  const byBureau = BUREAUS.reduce((acc, b) => {
    acc[b] = scores.filter(s => normalizeBureau(s.bureau) === b)
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
    return acc;
  }, {} as Record<Bureau, ScoreEntry[]>);

  // Build chart data: one data point per unique date, with a value per bureau
  const allDates = [...new Set(scores.map(s => new Date(s.recordedAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" })))];
  const chartData = allDates.map(date => {
    const point: Record<string, string | number> = { date };
    BUREAUS.forEach(b => {
      const match = byBureau[b].find(s => new Date(s.recordedAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" }) === date);
      if (match) point[b] = match.score;
    });
    return point;
  });

  const hasAnyScores = scores.length > 0;
  const otherScores = scores.filter(s => normalizeBureau(s.bureau) === "Other");

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthenticatedLayout activeNav="scores">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600 bg-clip-text text-transparent whitespace-nowrap">
              Score Tracking
            </h1>
            <p className="text-slate-500 mt-1 text-sm sm:text-base">Track your score across all three bureaus</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <label className={`px-3 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition cursor-pointer flex items-center gap-2 ${importing ? "opacity-50 pointer-events-none" : ""}`}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{importing ? "Scanning..." : "Import Screenshot"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImportScreenshot} disabled={importing} />
            </label>
            <button
              onClick={() => downloadCSV("credit-scores.csv", scores.map(s => ({ score: s.score, source: s.source, bureau: s.bureau || "", recordedAt: s.recordedAt })))}
              disabled={!hasAnyScores}
              className="px-3 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition disabled:opacity-40 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-3 py-2 bg-gradient-to-r from-lime-500 to-teal-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition"
            >
              + Add Score
            </button>
          </div>
        </div>

        {/* Bureau Score Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {BUREAUS.map(bureau => {
            const bureauScores = byBureau[bureau];
            const latest = bureauScores.length > 0 ? bureauScores[bureauScores.length - 1] : null;
            const prev = bureauScores.length > 1 ? bureauScores[bureauScores.length - 2] : null;
            const change = latest && prev ? latest.score - prev.score : null;
            return (
              <div key={bureau} className={`bg-white rounded-2xl border-2 p-5 ${BUREAU_BG[bureau]}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold uppercase tracking-widest ${BUREAU_TEXT[bureau]}`}>{bureau}</span>
                  {change !== null && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${change >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {change >= 0 ? "+" : ""}{change}
                    </span>
                  )}
                </div>
                {latest ? (
                  <>
                    <p className="text-4xl font-black text-slate-900">{latest.score}</p>
                    <p className={`text-sm font-semibold mt-1 ${scoreLabelColor(latest.score)}`}>{scoreLabel(latest.score)}</p>
                    <p className="text-xs text-slate-400 mt-2">{new Date(latest.recordedAt).toLocaleDateString()}</p>
                    <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, ((latest.score - 300) / 550) * 100)}%`, backgroundColor: BUREAU_COLORS[bureau] }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>300</span>
                      <span>850</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{Math.max(0, 800 - latest.score)} pts to 800</p>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-slate-400 text-sm">No score yet</p>
                    <button
                      onClick={() => { setNewBureau(bureau); setShowForm(true); }}
                      className={`mt-2 text-xs font-medium ${BUREAU_TEXT[bureau]} hover:underline`}
                    >
                      + Add {bureau} score
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Score Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
            <h2 className="font-semibold mb-4">Add Score Entry</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bureau</label>
                <select
                  value={newBureau}
                  onChange={(e) => setNewBureau(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                >
                  <option>Equifax</option>
                  <option>Experian</option>
                  <option>TransUnion</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Score</label>
                <input
                  type="number"
                  min={300}
                  max={850}
                  value={newScore}
                  onChange={(e) => setNewScore(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
                <select
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                >
                  <option>Credit Karma</option>
                  <option>Experian</option>
                  <option>MyFICO</option>
                  <option>TransUnion</option>
                  <option>Bank/Card Issuer</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleAddScore} disabled={adding} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50">
                {adding ? "Saving..." : "Save Entry"}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Chart — all 3 bureaus on one chart */}
        {chartData.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
            <h2 className="font-semibold mb-4">Score History by Bureau</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis domain={[300, 850]} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip />
                  <Legend />
                  {BUREAUS.map(b => (
                    <Line
                      key={b}
                      type="monotone"
                      dataKey={b}
                      stroke={BUREAU_COLORS[b]}
                      strokeWidth={2.5}
                      dot={{ fill: BUREAU_COLORS[b], r: 4 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center mb-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No Score Data Yet</h3>
            <p className="text-slate-500 mb-4">Add your first score entry to start tracking progress across all three bureaus.</p>
            <button onClick={() => setShowForm(true)} className="px-6 py-3 bg-gradient-to-r from-lime-500 to-teal-600 text-white rounded-xl font-medium hover:opacity-90 transition">
              Add Your First Score
            </button>
          </div>
        )}

        {/* History Table */}
        {hasAnyScores && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold">All Entries</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 text-xs">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 text-xs">Bureau</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 text-xs">Score</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 text-xs">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...scores].reverse().map((s) => {
                    const b = normalizeBureau(s.bureau);
                    const color = b !== "Other" ? BUREAU_COLORS[b] : "#94a3b8";
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-xs text-slate-500">{new Date(s.recordedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-xs font-medium text-slate-700">{s.bureau || "Unknown"}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-sm text-slate-900">{s.score}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{s.source}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Other/unassigned scores notice */}
        {otherScores.length > 0 && (
          <p className="text-xs text-slate-400 mt-4 text-center">
            {otherScores.length} score{otherScores.length > 1 ? "s" : ""} without a bureau assigned — edit them to assign a bureau for full tracking.
          </p>
        )}
      </main>
    </AuthenticatedLayout>
  );
}

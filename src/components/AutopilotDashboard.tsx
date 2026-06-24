"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { UploadModal } from "@/components/UploadModal";

interface AutopilotRun {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  itemsFound: number;
  lettersGenerated: number;
  lettersMailed: number;
  errors: string[];
}

interface AutopilotStatus {
  isActive: boolean;
  hasValidConsent: boolean;
  consentedAt: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  currentlyRunning: boolean;
  totalRunsCompleted: number;
  totalLettersSent: number;
  recentRuns: AutopilotRun[];
}

function ScoreArc({ score }: { score: number | null }) {
  if (!score) return (
    <div className="flex flex-col items-center justify-center h-32">
      <p className="text-4xl font-black text-slate-300">---</p>
      <p className="text-xs text-slate-400 mt-1">No score yet</p>
    </div>
  );

  const pct = Math.min(Math.max((score - 300) / (850 - 300), 0), 1);
  const color = score >= 750 ? "#22c55e" : score >= 670 ? "#84cc16" : score >= 580 ? "#f59e0b" : "#ef4444";
  const r = 52, cx = 60, cy = 60;
  const circumference = Math.PI * r;
  const dash = pct * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 70" className="w-36 h-24">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round" />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`} />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" fontWeight="900" fill="#0f172a">{score}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="8" fill="#94a3b8">VantageScore</text>
      </svg>
    </div>
  );
}

function RunStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-blue-50 text-[#1a3fd4]",
    running: "bg-teal-100 text-teal-600 animate-pulse",
    failed: "bg-red-100 text-red-700",
    skipped: "bg-slate-100 text-slate-500",
  };
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${map[status] ?? "bg-slate-100 text-slate-500"}`}>{status}</span>;
}

export function AutopilotDashboard() {
  const { user } = useAuth();
  const [apStatus, setApStatus] = useState<AutopilotStatus | null>(null);
  const [scores, setScores] = useState<Record<string, number | null>>({ TransUnion: null, Equifax: null, Experian: null });
  const [latestScore, setLatestScore] = useState<number | null>(null);
  const [scoreChange, setScoreChange] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadModalType, setUploadModalType] = useState<"report" | "letter" | null>(null);
  const [letters, setLetters] = useState<{ id: string; creditorName: string | null; fileName: string; status: string; createdAt?: string; uploadedAt?: string }[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [apRes, scoresRes, lettersRes] = await Promise.all([
        fetch("/api/autopilot/status", { headers: { Authorization: `Bearer ${user.idToken}` } }),
        fetch("/api/scores", { headers: { Authorization: `Bearer ${user.idToken}` } }),
        fetch("/api/letters", { headers: { Authorization: `Bearer ${user.idToken}` } }),
      ]);

      if (apRes.ok) setApStatus(await apRes.json());

      if (scoresRes.ok) {
        const data = await scoresRes.json() as { scores: { score: number; bureau: string; recordedAt: string }[] };
        const raw = data.scores ?? [];
        const sorted = [...raw].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

        const bureauMap: Record<string, number | null> = { TransUnion: null, Equifax: null, Experian: null };
        for (const s of sorted) {
          const b = s.bureau?.toLowerCase() ?? "";
          const key = b.includes("transunion") || b.includes("trans union") ? "TransUnion" : b.includes("equifax") ? "Equifax" : b.includes("experian") ? "Experian" : null;
          if (key) bureauMap[key] = s.score;
        }
        setScores(bureauMap);

        if (sorted.length > 0) {
          const last = sorted[sorted.length - 1].score;
          setLatestScore(last);
          if (sorted.length > 1) setScoreChange(last - sorted[0].score);
        }
      }

      if (lettersRes.ok) {
        const data = await lettersRes.json() as { letters: { id: string; creditorName: string | null; fileName: string; status: string; createdAt: string; uploadedAt: string }[] };
        setLetters((data.letters ?? []).slice(0, 5));
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const nextRun = apStatus?.nextRunAt ? new Date(apStatus.nextRunAt) : null;
  const daysUntilNextRun = nextRun ? Math.max(0, Math.ceil((nextRun.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;
  const lastRun = apStatus?.recentRuns?.[0] ?? null;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-full text-teal-700 text-xs font-semibold mb-3">
          <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
          Autopilot Active
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Your Credit is on Autopilot</h1>
        <p className="text-slate-500 text-sm mt-1">We handle everything — report pulls, dispute letters, and USPS mailing every month.</p>
      </div>

      {/* Score + Next Run row */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {/* Score arc */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Credit Score</p>
          <ScoreArc score={latestScore} />
          {scoreChange !== null && (
            <div className={`flex items-center gap-1 text-sm font-semibold mt-1 ${scoreChange >= 0 ? "text-green-600" : "text-red-500"}`}>
              {scoreChange >= 0 ? "▲" : "▼"} {Math.abs(scoreChange)} pts since start
            </div>
          )}
        </div>

        {/* Next run */}
        <div className="bg-gradient-to-br from-[#1a3fd4] to-[#00d4aa] rounded-2xl p-5 text-white flex flex-col justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-100 mb-3">Next Autopilot Run</p>
          {daysUntilNextRun !== null ? (
            <>
              <p className="text-5xl font-black">{daysUntilNextRun}</p>
              <p className="text-teal-200 text-sm mt-1">days away</p>
              {nextRun && <p className="text-xs text-teal-300 mt-2">{nextRun.toLocaleDateString("en-US", { month: "long", day: "numeric" })}</p>}
            </>
          ) : (
            <>
              <p className="text-2xl font-bold">Ready</p>
              <p className="text-teal-200 text-sm mt-1">First run pending consent</p>
              <Link href="/autopilot" className="mt-3 text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg font-medium transition inline-block">
                Authorize Autopilot →
              </Link>
            </>
          )}
        </div>

        {/* Letters sent */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Total Letters Sent</p>
          <p className="text-5xl font-black bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] bg-clip-text text-transparent">
            {apStatus?.totalLettersSent ?? 0}
          </p>
          <p className="text-slate-500 text-sm mt-1">across {apStatus?.totalRunsCompleted ?? 0} run{apStatus?.totalRunsCompleted !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Bureau scores */}
      <a href="/scores" className="block bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-lg transition mb-8">
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          {(["Equifax", "Experian", "TransUnion"] as const).map((bureau, i) => {
            const score = scores[bureau];
            const colors = ["text-teal-600", "text-lime-600", "text-cyan-600"];
            return (
              <div key={bureau} className="flex flex-col items-center px-2">
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${colors[i]}`}>{bureau}</p>
                <p className={`text-3xl font-black ${score ? "text-slate-900" : "text-slate-300"}`}>{score ?? "—"}</p>
              </div>
            );
          })}
        </div>
      </a>

      {uploadModalType && <UploadModal type={uploadModalType} onClose={() => setUploadModalType(null)} />}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <button onClick={() => setUploadModalType("letter")} className="bg-gradient-to-br from-lime-50 to-teal-50 border border-lime-200 rounded-2xl p-6 flex items-center gap-4 hover:shadow-lg transition text-left w-full">
          <div className="w-11 h-11 bg-gradient-to-br from-[#1a3fd4] to-[#00d4aa] rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-800">Upload Collector Letter</p>
            <p className="text-sm text-slate-500 mt-0.5">Analyze debt collector mail</p>
          </div>
        </button>
        <a href="/disputes" className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-6 flex items-center gap-4 hover:shadow-lg transition">
          <div className="w-11 h-11 bg-gradient-to-br from-[#1a3fd4] to-[#00d4aa] rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-800">View Disputes</p>
            <p className="text-sm text-slate-500 mt-0.5">Track your active disputes</p>
          </div>
        </a>
      </div>

      {/* Last run details */}
      {lastRun && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Last Run</h2>
            <RunStatusBadge status={lastRun.status} />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-slate-800">{lastRun.itemsFound}</p>
              <p className="text-xs text-slate-400 mt-0.5">Items Found</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{lastRun.lettersGenerated}</p>
              <p className="text-xs text-slate-400 mt-0.5">Letters Generated</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-600">{lastRun.lettersMailed}</p>
              <p className="text-xs text-slate-400 mt-0.5">Letters Mailed</p>
            </div>
          </div>
          {lastRun.completedAt && (
            <p className="text-xs text-slate-400 text-center mt-4">
              Completed {new Date(lastRun.completedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          )}
          {lastRun.errors.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-red-600 mb-1">Notes</p>
              {lastRun.errors.map((e, i) => <p key={i} className="text-xs text-slate-500">{e}</p>)}
            </div>
          )}
        </div>
      )}

      {/* Run history */}
      {apStatus && apStatus.recentRuns.length > 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">Run History</h2>
          <div className="space-y-3">
            {apStatus.recentRuns.slice(0, 6).map((run) => (
              <div key={run.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {new Date(run.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  <p className="text-xs text-slate-400">{run.lettersMailed} letter{run.lettersMailed !== 1 ? "s" : ""} mailed · {run.itemsFound} item{run.itemsFound !== 1 ? "s" : ""} found</p>
                </div>
                <RunStatusBadge status={run.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Letter History */}
      {letters.length > 0 && (
        <div className="mb-8">
          <h2 className="font-semibold text-slate-900 mb-4">Letter History</h2>
          <div className="space-y-3">
            {letters.map((l) => (
              <Link key={l.id} href={`/analyze-letter?letter=${l.id}`} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition block">
                <div>
                  <p className="font-medium text-slate-800">{l.creditorName || l.fileName}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{(l.createdAt || l.uploadedAt) ? new Date((l.createdAt || l.uploadedAt)!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  l.status === "complete" ? "bg-emerald-100 text-emerald-700" :
                  l.status === "processing" ? "bg-amber-100 text-amber-700" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {l.status === "complete" ? "Analyzed" : l.status === "processing" ? "Processing" : l.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

    </main>
  );
}

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/lib/use-subscription";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { UploadModal } from "@/components/UploadModal";


interface Dispute {
  id: string;
  bureau: string;
  reason: string;
  status: string;
  outcome: "won" | "denied" | null;
  mailedAt: string | null;
}

interface ReportChanges {
  isFirstReport: boolean;
  newItems: { creditorName: string; accountType: string; balance: number; status: string }[];
  removedItems: { creditorName: string; accountType: string; balance: number }[];
  balanceChanges: { creditorName: string; oldBalance: number; newBalance: number; delta: number }[];
  statusChanges: { creditorName: string; oldStatus: string; newStatus: string }[];
  totalBalanceDelta: number;
  createdAt: string;
}

async function checkDeadlines(
  idToken: string,
  uid: string,
  disputes: Dispute[]
) {
  try {
    // Find SENT disputes where mailedAt + 30 days is within 5 days or already past
    const approaching = disputes.filter((d) => {
      if (d.status !== "SENT" || !d.mailedAt) return false;
      const daysSince = (Date.now() - new Date(d.mailedAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince >= 25; // within 5 days of 30-day deadline
    });

    if (approaching.length === 0) return;

    // Fetch existing deadline_warning notifications to avoid duplicates
    const existingRes = await fetch("/api/notifications", {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const existingData = existingRes.ok ? await existingRes.json() : { notifications: [] };
    const existingUrls = new Set(
      (existingData.notifications || [])
        .filter((n: { type: string; actionUrl?: string }) => n.type === "deadline_warning")
        .map((n: { actionUrl?: string }) => n.actionUrl)
    );

    for (const dispute of approaching) {
      const actionUrl = `/disputes#deadline-${dispute.id}`;
      if (existingUrls.has(actionUrl)) continue;

      const daysSince = Math.floor((Date.now() - new Date(dispute.mailedAt!).getTime()) / (1000 * 60 * 60 * 24));
      const daysLeft = 30 - daysSince;

      await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          type: "deadline_warning",
          title: daysLeft <= 0 ? "Bureau response overdue!" : `Bureau response due in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
          message: `Your dispute with ${dispute.bureau} ${daysLeft <= 0 ? "has passed the 30-day response window" : `expires in ${daysLeft} days`}. Consider escalating.`,
          actionUrl,
        }),
      });
    }
  } catch {
    // non-blocking — ignore errors
  }
}

function DashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const { loading: subLoading } = useSubscription();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scoreHistory, setScoreHistory] = useState<{ score: number; recordedAt: string; bureau: string }[]>([]);
  const [latestScore, setLatestScore] = useState<number | null>(null);
  const [bureauScores, setBureauScores] = useState<Record<string, number | null>>({ Equifax: null, Experian: null, TransUnion: null });
  const [disputableCount, setDisputableCount] = useState(0);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [latestChanges, setLatestChanges] = useState<ReportChanges | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalAssets, setTotalAssets] = useState<number | null>(null);
  const [totalLiabilities, setTotalLiabilities] = useState<number | null>(null);
  const [uploadModalType, setUploadModalType] = useState<"report" | "letter" | null>(null);
  const [letters, setLetters] = useState<{ id: string; creditorName: string | null; fileName: string; status: string; createdAt?: string; uploadedAt?: string }[]>([]);

  useEffect(() => {
  }, [searchParams]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    async function loadDashboard() {
      const fetchDocs = async (collection: string, body: Record<string, unknown> = {}) => {
        const res = await fetch(`/api/data/${collection}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${user!.idToken}` },
          body: JSON.stringify(body),
        });
        if (!res.ok) return [];
        const data = await res.json() as { documents?: (Record<string, unknown> & { id: string })[] };
        return data.documents || [];
      };

      try {
        // Load score history via the same endpoint as /scores page
        const scoresRes = await fetch("/api/scores", {
          headers: { Authorization: `Bearer ${user!.idToken}` },
        });
        const scoresData = scoresRes.ok ? await scoresRes.json() as { scores: Record<string, unknown>[] } : { scores: [] };
        const rawScores = scoresData.scores || [];
        if (rawScores.length > 0) {
          const sorted = [...rawScores].sort(
            (a, b) => new Date(a.recordedAt as string).getTime() - new Date(b.recordedAt as string).getTime()
          );
          setScoreHistory(
            sorted.map((s) => ({
              score: s.score as number,
              recordedAt: s.recordedAt as string,
              bureau: String(s.bureau ?? ""),
            }))
          );
          setLatestScore(sorted[sorted.length - 1].score as number);

          // Latest score per bureau
          const bureauMap: Record<string, number | null> = { Equifax: null, Experian: null, TransUnion: null };
          for (const s of sorted) {
            const b = String(s.bureau || "").toLowerCase();
            const key = b.includes("equifax") ? "Equifax" : b.includes("experian") ? "Experian" : b.includes("transunion") || b.includes("trans union") ? "TransUnion" : null;
            if (key) bureauMap[key] = s.score as number;
          }
          setBureauScores(bureauMap);
        }

        // Load disputable items count
        const items = await fetchDocs("reportItems", {
          extraFilters: [{ field: "isDisputable", op: "EQUAL", value: true }],
        });
        setDisputableCount(items.length);

        // Load recent disputes (with outcome and mailedAt)
        const disputeDocs = await fetchDocs("disputes", { limit: 10 });
        const mappedDisputes: Dispute[] = disputeDocs.map((d: Record<string, unknown> & { id: string }) => ({
          id: d.id,
          bureau: d.bureau as string,
          reason: d.reason as string,
          status: d.status as string,
          outcome: (d.outcome as "won" | "denied") || null,
          mailedAt: (d.mailedAt as string) || null,
        }));
        setDisputes(mappedDisputes);

        // Load most recent report changes (skip first-report entries)
        const changesDocs = await fetchDocs("reportChanges");
        const meaningfulChanges = changesDocs
          .filter((c: Record<string, unknown>) => !c.isFirstReport)
          .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
            new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
          );
        if (meaningfulChanges.length > 0) {
          const c = meaningfulChanges[0] as Record<string, unknown>;
          setLatestChanges({
            isFirstReport: false,
            newItems: (c.newItems as ReportChanges["newItems"]) ?? [],
            removedItems: (c.removedItems as ReportChanges["removedItems"]) ?? [],
            balanceChanges: (c.balanceChanges as ReportChanges["balanceChanges"]) ?? [],
            statusChanges: (c.statusChanges as ReportChanges["statusChanges"]) ?? [],
            totalBalanceDelta: c.totalBalanceDelta as number ?? 0,
            createdAt: c.createdAt as string,
          });
        }

        // Load portfolio net worth
        fetch("/api/portfolio/accounts", {
          headers: { Authorization: `Bearer ${user!.idToken}` },
        })
          .then((r) => r.json())
          .then((d) => {
            const accounts = d.accounts || [];
            const ASSET_TYPES = ["checking", "savings", "investment", "retirement", "crypto", "real_estate", "vehicle", "other_asset"];
            const visible = accounts.filter((a: { isHidden: boolean }) => !a.isHidden);
            const assets = visible.filter((a: { type: string }) => ASSET_TYPES.includes(a.type)).reduce((s: number, a: { balance: number }) => s + a.balance, 0);
            const liabilities = visible.filter((a: { type: string }) => !ASSET_TYPES.includes(a.type)).reduce((s: number, a: { balance: number }) => s + a.balance, 0);
            setTotalAssets(assets);
            setTotalLiabilities(liabilities);
          })
          .catch(() => {});


        // Load letter history
        const lettersRes = await fetch("/api/letters", { headers: { Authorization: `Bearer ${user!.idToken}` } });
        if (lettersRes.ok) {
          const lettersData = await lettersRes.json() as { letters: { id: string; creditorName: string | null; fileName: string; status: string; createdAt?: string; uploadedAt?: string }[] };
          setLetters((lettersData.letters ?? []).slice(0, 5));
        }

        // Fire-and-forget: health report trigger
        fetch("/api/users/health-report", {
          method: "POST",
          headers: { Authorization: `Bearer ${user!.idToken}` },
        }).catch(() => {});

        // Fire-and-forget: weekly progress email
        fetch("/api/users/weekly-report", {
          method: "POST",
          headers: { Authorization: `Bearer ${user!.idToken}` },
        }).catch(() => {});

        // Fire-and-forget: check deadlines (uses mappedDisputes directly)
        checkDeadlines(user!.idToken, user!.uid, mappedDisputes);

      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [user, authLoading, router]);

  if (authLoading || loading || subLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1a3fd4] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  const activeDisputes = disputes.filter(
    (d) => d.status === "SENT" || d.status === "UNDER_INVESTIGATION"
  ).length;

  // Score chart data — one line per bureau, timezone-safe dates
  const BUREAU_COLORS: Record<string, string> = { Equifax: "#14b8a6", Experian: "#84cc16", TransUnion: "#06b6d4" };
  const BUREAU_LIST = ["Equifax", "Experian", "TransUnion"] as const;

  function dateKey(recordedAt: string) { return recordedAt.split("T")[0]; }
  function chartLabel(dk: string) {
    const [y, m] = dk.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  function normBureau(b: string) {
    const l = b.toLowerCase();
    if (l.includes("equifax")) return "Equifax";
    if (l.includes("experian")) return "Experian";
    if (l.includes("transunion") || l.includes("trans union")) return "TransUnion";
    return null;
  }

  const byBureau: Record<string, { dk: string; score: number }[]> = { Equifax: [], Experian: [], TransUnion: [] };
  for (const s of scoreHistory) {
    const b = normBureau(s.bureau);
    if (b) byBureau[b].push({ dk: dateKey(s.recordedAt), score: s.score });
  }

  const allDateKeys = [...new Set(scoreHistory.map(s => dateKey(s.recordedAt)))].sort();
  const chartData = allDateKeys.map(dk => {
    const point: Record<string, string | number> = { date: chartLabel(dk) };
    for (const b of BUREAU_LIST) {
      const match = byBureau[b].find(e => e.dk === dk);
      if (match) point[b] = match.score;
    }
    return point;
  });

  const hasChartData = allDateKeys.length > 1 || BUREAU_LIST.some(b => byBureau[b].length > 1);
  const firstScore = scoreHistory.length > 1 ? scoreHistory[0].score : null;
  const scoreChange = firstScore !== null && latestScore !== null ? latestScore - firstScore : null;

  // Win rate data
  const wonCount = disputes.filter((d) => d.outcome === "won").length;
  const deniedCount = disputes.filter((d) => d.outcome === "denied").length;
  const winRate = wonCount + deniedCount > 0 ? Math.round((wonCount / (wonCount + deniedCount)) * 100) : null;

  return (
    <AuthenticatedLayout activeNav="dashboard">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-10">Dashboard</h1>

        {/* Bureau Score Cards */}
        <Link href="/scores" className="block bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-lg transition mb-6">
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            {(["Equifax", "Experian", "TransUnion"] as const).map((bureau, i) => {
              const score = bureauScores[bureau];
              const colors = ["text-[#1a3fd4]", "text-[#0e7fd4]", "text-[#00d4aa]"];
              return (
                <div key={bureau} className="flex flex-col items-center px-2">
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${colors[i]}`}>{bureau}</p>
                  <p className={`text-3xl font-black ${score ? "text-slate-900" : "text-slate-300"}`}>{score ?? "---"}</p>
                </div>
              );
            })}
          </div>
        </Link>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-10 sm:mb-14">
          <Link href="/disputes" className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm hover:shadow-lg transition block">
            <p className="text-sm text-slate-500 mb-2">Disputable Items</p>
            <p className="text-5xl font-bold text-amber-500">{disputableCount}</p>
          </Link>
          <Link href="/disputes" className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm hover:shadow-lg transition block">
            <p className="text-sm text-slate-500 mb-2">Active Disputes</p>
            <p className="text-5xl font-bold text-emerald-500">{activeDisputes}</p>
          </Link>
        </div>



        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-10 sm:mb-14">
          <button onClick={() => setUploadModalType("report")} className="bg-blue-50 border border-blue-200 rounded-2xl p-7 shadow-sm hover:shadow-lg transition flex items-center gap-5 text-left w-full">
            <div className="w-12 h-12 bg-gradient-to-br from-[#1a3fd4] to-[#00d4aa] rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Upload Credit Report</p>
              <p className="text-sm text-slate-500 mt-0.5">Scan for disputable items</p>
            </div>
          </button>
          <button onClick={() => setUploadModalType("letter")} className="bg-blue-50 border border-blue-200 rounded-2xl p-7 shadow-sm hover:shadow-lg transition flex items-center gap-5 text-left w-full">
            <div className="w-12 h-12 bg-gradient-to-br from-[#1a3fd4] to-[#00d4aa] rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Upload Collector Letter</p>
              <p className="text-sm text-slate-500 mt-0.5">Analyze debt collector mail</p>
            </div>
          </button>
        </div>
        {uploadModalType && (
          <UploadModal type={uploadModalType} onClose={() => setUploadModalType(null)} />
        )}

        {/* Changes Since Last Report */}
        {latestChanges && (
          <section className="mb-10 sm:mb-14">
            <h2 className="text-xl font-semibold mb-4">Changes Since Last Report</h2>
            {(() => {
              const isImprovement = latestChanges.removedItems.length > 0 || latestChanges.totalBalanceDelta < -100;
              const hasNewNegatives = latestChanges.newItems.filter(i => i.status !== "CURRENT").length > 0;
              const cardBg = hasNewNegatives ? "bg-red-50 border-red-200" : isImprovement ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200";
              const badgeColor = hasNewNegatives ? "bg-red-100 text-red-700" : isImprovement ? "bg-blue-50 text-[#1a3fd4]" : "bg-amber-100 text-amber-700";
              const balanceDeltaStr = latestChanges.totalBalanceDelta >= 0
                ? `+$${latestChanges.totalBalanceDelta.toLocaleString()}`
                : `-$${Math.abs(latestChanges.totalBalanceDelta).toLocaleString()}`;
              const balanceColor = latestChanges.totalBalanceDelta <= 0 ? "text-emerald-600" : "text-red-600";
              return (
                <div className={`border rounded-2xl p-6 shadow-sm ${cardBg}`}>
                  <div className="flex flex-wrap gap-3 mb-4">
                    {latestChanges.newItems.length > 0 && (
                      <span className="text-sm px-3 py-1 rounded-full font-medium bg-red-100 text-red-700">
                        +{latestChanges.newItems.length} new item{latestChanges.newItems.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {latestChanges.removedItems.length > 0 && (
                      <span className="text-sm px-3 py-1 rounded-full font-medium bg-blue-50 text-[#1a3fd4]">
                        -{latestChanges.removedItems.length} item{latestChanges.removedItems.length !== 1 ? "s" : ""} removed
                      </span>
                    )}
                    {latestChanges.balanceChanges.length > 0 && (
                      <span className={`text-sm px-3 py-1 rounded-full font-medium ${badgeColor}`}>
                        {latestChanges.balanceChanges.length} balance change{latestChanges.balanceChanges.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {latestChanges.statusChanges.length > 0 && (
                      <span className="text-sm px-3 py-1 rounded-full font-medium bg-slate-100 text-slate-600">
                        {latestChanges.statusChanges.length} status change{latestChanges.statusChanges.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Total balance change</p>
                      <p className={`text-2xl font-bold ${balanceColor}`}>{balanceDeltaStr}</p>
                    </div>
                    <Link href="/disputes" className="px-4 py-2 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white text-sm rounded-lg font-medium hover:opacity-90 transition">
                      View Disputes
                    </Link>
                  </div>
                  {latestChanges.newItems.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-red-200">
                      <p className="text-xs font-semibold text-red-700 mb-2">NEW ITEMS</p>
                      <div className="space-y-1">
                        {latestChanges.newItems.slice(0, 3).map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-slate-700">{item.creditorName}</span>
                            <span className="text-red-600 font-medium">${item.balance.toLocaleString()}</span>
                          </div>
                        ))}
                        {latestChanges.newItems.length > 3 && <p className="text-xs text-slate-500">+{latestChanges.newItems.length - 3} more</p>}
                      </div>
                    </div>
                  )}
                  {latestChanges.removedItems.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <p className="text-xs font-semibold text-emerald-700 mb-2">REMOVED ITEMS</p>
                      <div className="space-y-1">
                        {latestChanges.removedItems.slice(0, 3).map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-slate-700">{item.creditorName}</span>
                            <span className="text-emerald-600 font-medium line-through">${item.balance.toLocaleString()}</span>
                          </div>
                        ))}
                        {latestChanges.removedItems.length > 3 && <p className="text-xs text-slate-500">+{latestChanges.removedItems.length - 3} more</p>}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-4">
                    Compared {new Date(latestChanges.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              );
            })()}
          </section>
        )}

        {/* Win Rate Widget */}
        {winRate !== null && (
          <section className="mb-10 sm:mb-14">
            <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm">
              <h2 className="text-xl font-semibold mb-6">Dispute Results</h2>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-4xl font-bold text-emerald-600">{wonCount}</p>
                  <p className="text-sm text-slate-500 mt-2">Won</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-red-500">{deniedCount}</p>
                  <p className="text-sm text-slate-500 mt-2">Denied</p>
                </div>
                <div>
                  <p className="text-4xl font-bold bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] bg-clip-text text-transparent">{winRate}%</p>
                  <p className="text-sm text-slate-500 mt-2">Win Rate</p>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mb-14">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold">Recent Disputes</h2>
            <Link
              href="/disputes"
              className="text-sm text-[#1a3fd4] hover:text-[#0e7fd4] transition"
            >
              View all
            </Link>
          </div>
          {disputes.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-slate-500 mb-4">No disputes yet. View your disputable items to get started.</p>
              <Link
                href="/disputes"
                className="inline-block px-6 py-2 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] rounded-lg text-sm text-white font-medium hover:opacity-90 transition"
              >
                View Disputable Items
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {disputes.map((d) => (
                <div
                  key={d.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition"
                >
                  <div>
                    <p className="font-medium">{d.bureau}</p>
                    <p className="text-sm text-slate-500">{d.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.outcome === "won" && (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-50 text-[#1a3fd4]">Won</span>
                    )}
                    {d.outcome === "denied" && (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-700">Denied</span>
                    )}
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-medium ${
                        d.status === "RESOLVED"
                          ? "bg-blue-50 text-[#1a3fd4]"
                          : d.status === "SENT" ||
                              d.status === "UNDER_INVESTIGATION"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Letter History */}
        {letters.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold">Letter History</h2>
            </div>
            <div className="space-y-4">
              {letters.map((l) => (
                <Link key={l.id} href={`/analyze-letter?letter=${l.id}`} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition block">
                  <div>
                    <p className="font-medium text-slate-800">{l.creditorName || l.fileName}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{(l.createdAt || l.uploadedAt) ? new Date((l.createdAt || l.uploadedAt)!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    l.status === "complete" ? "bg-blue-50 text-[#1a3fd4]" :
                    l.status === "processing" ? "bg-amber-100 text-amber-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {l.status === "complete" ? "Analyzed" : l.status === "processing" ? "Processing" : l.status}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

      </main>
    </AuthenticatedLayout>
  );
}

export default function Dashboard() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth-context";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { OnboardingModal } from "@/components/OnboardingModal";

const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });

interface Dispute {
  id: string;
  bureau: string;
  reason: string;
  status: string;
  outcome: "won" | "denied" | null;
  mailedAt: string | null;
}

interface ActionStep {
  title: string;
  description: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  actionUrl?: string;
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showWelcome, setShowWelcome] = useState(false);
  const [scoreHistory, setScoreHistory] = useState<{ score: number; recordedAt: string }[]>([]);
  const [latestScore, setLatestScore] = useState<number | null>(null);
  const [bureauScores, setBureauScores] = useState<Record<string, number | null>>({ Equifax: null, Experian: null, TransUnion: null });
  const [disputableCount, setDisputableCount] = useState(0);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [actionPlan, setActionPlan] = useState<{ steps: ActionStep[] } | null>(null);
  const [latestChanges, setLatestChanges] = useState<ReportChanges | null>(null);
  const [loading, setLoading] = useState(true);
  const [netWorth, setNetWorth] = useState<number | null>(null);
  const [totalAssets, setTotalAssets] = useState<number | null>(null);
  const [totalLiabilities, setTotalLiabilities] = useState<number | null>(null);
  const [topGoals, setTopGoals] = useState<{ id: string; title: string; current: number; target: number; unit: string }[]>([]);

  useEffect(() => {
    if (searchParams.get("welcome") === "1") setShowWelcome(true);
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
        // Load score history (up to 30 entries for chart + bureau breakdown)
        const scores = await fetchDocs("creditScores", { limit: 30 });
        if (scores.length > 0) {
          const sorted = [...scores].sort(
            (a, b) => new Date(a.recordedAt as string).getTime() - new Date(b.recordedAt as string).getTime()
          );
          setScoreHistory(
            sorted.map((s: Record<string, unknown>) => ({
              score: s.score as number,
              recordedAt: s.recordedAt as string,
            }))
          );
          setLatestScore(sorted[sorted.length - 1].score as number);

          // Latest score per bureau
          const bureauMap: Record<string, number | null> = { Equifax: null, Experian: null, TransUnion: null };
          for (const s of sorted) {
            const b = String(s.bureau || "");
            const lower = b.toLowerCase();
            const key = lower.includes("equifax") ? "Equifax" : lower.includes("experian") ? "Experian" : lower.includes("transunion") || lower.includes("trans union") ? "TransUnion" : null;
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
            setNetWorth(assets - liabilities);
          })
          .catch(() => {});

        // Load top goals
        fetch("/api/goals", {
          headers: { Authorization: `Bearer ${user!.idToken}` },
        })
          .then((r) => r.json())
          .then((d) => {
            const goals = (d.goals || []).filter((g: { isCompleted: boolean }) => !g.isCompleted).slice(0, 3);
            setTopGoals(goals.map((g: { id: string; title: string; current: number; target: number; unit: string }) => ({
              id: g.id, title: g.title, current: g.current, target: g.target, unit: g.unit,
            })));
          })
          .catch(() => {});

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

    // Fire-and-forget: load action plan
    async function loadActionPlan() {
      try {
        const res = await fetch("/api/plans", {
          headers: { Authorization: `Bearer ${user!.idToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.plan?.steps) {
            setActionPlan({ steps: data.plan.steps as ActionStep[] });
          }
        }
      } catch {
        // non-blocking
      }
    }

    loadDashboard();
    loadActionPlan();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  const activeDisputes = disputes.filter(
    (d) => d.status === "SENT" || d.status === "UNDER_INVESTIGATION"
  ).length;

  // Score chart data
  const firstScore = scoreHistory.length > 1 ? scoreHistory[0].score : null;
  const scoreChange = firstScore !== null && latestScore !== null ? latestScore - firstScore : null;
  const chartData = scoreHistory.map((s) => ({
    date: new Date(s.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: s.score,
  }));

  // Win rate data
  const wonCount = disputes.filter((d) => d.outcome === "won").length;
  const deniedCount = disputes.filter((d) => d.outcome === "denied").length;
  const winRate = wonCount + deniedCount > 0 ? Math.round((wonCount / (wonCount + deniedCount)) * 100) : null;

  return (
    <AuthenticatedLayout activeNav="dashboard">
      <OnboardingModal />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {showWelcome && (
          <div className="mb-6 bg-gradient-to-r from-lime-50 to-teal-50 border border-teal-200 rounded-2xl p-5 flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-teal-800 mb-0.5">Welcome to Credit 800!</p>
              <p className="text-sm text-teal-700">Your account is active. Start by uploading your credit report or adding your current score to get personalized recommendations.</p>
            </div>
            <button
              onClick={() => setShowWelcome(false)}
              className="text-teal-500 hover:text-teal-700 shrink-0 mt-0.5 transition"
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Dashboard</h1>

        {/* Bureau Score Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4">
          {(["Equifax", "Experian", "TransUnion"] as const).map((bureau, i) => {
            const score = bureauScores[bureau];
            const colors = ["text-teal-600", "text-lime-600", "text-cyan-600"];
            const borders = ["border-teal-200", "border-lime-200", "border-cyan-200"];
            return (
              <Link key={bureau} href="/scores" className={`bg-white border-2 ${borders[i]} rounded-2xl p-4 shadow-sm hover:shadow-lg transition block`}>
                <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${colors[i]}`}>{bureau}</p>
                <p className={`text-3xl font-black ${score ? "text-slate-900" : "text-slate-300"}`}>{score ?? "---"}</p>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <Link href="/disputes" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition block">
            <p className="text-sm text-slate-500 mb-1">Disputable Items</p>
            <p className="text-4xl font-bold text-amber-500">
              {disputableCount}
            </p>
          </Link>
          <Link href="/disputes" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition block">
            <p className="text-sm text-slate-500 mb-1">Active Disputes</p>
            <p className="text-4xl font-bold text-emerald-500">
              {activeDisputes}
            </p>
          </Link>
        </div>


        {/* Score Progress Chart (Feature 1) */}
        {scoreHistory.length > 1 && (
          <section className="mb-8 sm:mb-12">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <h2 className="text-xl font-semibold">Score Progress</h2>
                {scoreChange !== null && (
                  <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full ${
                    scoreChange >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  }`}>
                    {scoreChange >= 0 ? "▲" : "▼"} {Math.abs(scoreChange)} pts
                    <span className="font-normal text-xs">({firstScore} → {latestScore})</span>
                  </span>
                )}
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[300, 850]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }}
                      formatter={(v: any) => [v, "Score"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#14b8a6"
                      strokeWidth={2.5}
                      dot={{ fill: "#14b8a6", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {/* AI Coach / Next Steps (Feature 2) */}
        {actionPlan && actionPlan.steps.length > 0 && (
          <section className="mb-8 sm:mb-12">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold">Your Next Steps</h2>
              </div>
              <div className="space-y-3">
                {actionPlan.steps.slice(0, 3).map((step, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className={`mt-0.5 shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                      step.impact === "HIGH"
                        ? "bg-emerald-100 text-emerald-700"
                        : step.impact === "MEDIUM"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-200 text-slate-600"
                    }`}>
                      {step.impact}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-800">{step.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{step.description}</p>
                    </div>
                    {step.actionUrl ? (
                      <Link
                        href={step.actionUrl}
                        className="shrink-0 text-xs px-3 py-1.5 bg-gradient-to-r from-lime-500 to-teal-600 text-white rounded-lg font-medium hover:opacity-90 transition"
                      >
                        Start
                      </Link>
                    ) : (
                      <Link
                        href="/disputes"
                        className="shrink-0 text-xs px-3 py-1.5 bg-gradient-to-r from-lime-500 to-teal-600 text-white rounded-lg font-medium hover:opacity-90 transition"
                      >
                        Start
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Win Rate Widget (Feature 3) */}
        {winRate !== null && (
          <section className="mb-8 sm:mb-12">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Dispute Results</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-emerald-600">{wonCount}</p>
                  <p className="text-sm text-slate-500 mt-1">Won</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-red-500">{deniedCount}</p>
                  <p className="text-sm text-slate-500 mt-1">Denied</p>
                </div>
                <div>
                  <p className="text-3xl font-bold bg-gradient-to-r from-lime-500 to-teal-600 bg-clip-text text-transparent">{winRate}%</p>
                  <p className="text-sm text-slate-500 mt-1">Win Rate</p>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Disputes</h2>
            <Link
              href="/disputes"
              className="text-sm text-teal-600 hover:text-lime-600 transition"
            >
              View all
            </Link>
          </div>
          {disputes.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-slate-500 mb-4">No disputes yet. Upload a credit report to get started.</p>
              <Link
                href="/upload"
                className="inline-block px-6 py-2 bg-gradient-to-r from-lime-500 to-teal-600 rounded-lg text-sm text-white font-medium hover:from-lime-400 hover:to-teal-500 transition"
              >
                Upload Report
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {disputes.map((d) => (
                <div
                  key={d.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition"
                >
                  <div>
                    <p className="font-medium">{d.bureau}</p>
                    <p className="text-sm text-slate-500">{d.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.outcome === "won" && (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700">Won</span>
                    )}
                    {d.outcome === "denied" && (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-700">Denied</span>
                    )}
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-medium ${
                        d.status === "RESOLVED"
                          ? "bg-emerald-100 text-emerald-700"
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

        {latestChanges && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold mb-4">Changes Since Last Report</h2>
            {(() => {
              const isImprovement = latestChanges.removedItems.length > 0 || latestChanges.totalBalanceDelta < -100;
              const hasNewNegatives = latestChanges.newItems.filter(i => i.status !== "CURRENT").length > 0;
              const cardBg = hasNewNegatives ? "bg-red-50 border-red-200" : isImprovement ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200";
              const badgeColor = hasNewNegatives ? "bg-red-100 text-red-700" : isImprovement ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";
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
                      <span className="text-sm px-3 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700">
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
                    <Link
                      href="/disputes"
                      className="px-4 py-2 bg-gradient-to-r from-lime-500 to-teal-600 text-white text-sm rounded-lg font-medium hover:from-lime-400 hover:to-teal-500 transition"
                    >
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
                        {latestChanges.newItems.length > 3 && (
                          <p className="text-xs text-slate-500">+{latestChanges.newItems.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  )}
                  {latestChanges.removedItems.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-emerald-200">
                      <p className="text-xs font-semibold text-emerald-700 mb-2">REMOVED ITEMS</p>
                      <div className="space-y-1">
                        {latestChanges.removedItems.slice(0, 3).map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-slate-700">{item.creditorName}</span>
                            <span className="text-emerald-600 font-medium line-through">${item.balance.toLocaleString()}</span>
                          </div>
                        ))}
                        {latestChanges.removedItems.length > 3 && (
                          <p className="text-xs text-slate-500">+{latestChanges.removedItems.length - 3} more</p>
                        )}
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

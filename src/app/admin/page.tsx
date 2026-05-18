"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";


interface AdminStats {
  totalUsers: number;
  notSubscribed: number;
  proSubscribers: number;
  autopilotSubscribers: number;
  autopilotWaitlistCount: number;
  mrrCents: number;
  disputesLast7: number;
  disputesLast30: number;
  reportsLast7: number;
  topReasons: { reason: string; count: number }[];
  recentDisputes: {
    id: string;
    creditorName: unknown;
    bureau: unknown;
    status: unknown;
    createdAt: unknown;
    userId: unknown;
  }[];
  generatedAt: string;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    fetch("/api/admin/stats", {
      headers: { Authorization: `Bearer ${user.idToken}` },
    })
      .then((r) => {
        if (r.status === 403) { router.push("/dashboard"); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.error) { setError(data.error); return; }
        setStats(data);
      })
      .catch(() => setError("Failed to load admin stats."))
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-lime-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-slate-800 border border-red-500/30 rounded-xl p-8 text-center max-w-sm">
          <p className="text-red-400 font-semibold mb-2">Access Denied</p>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const mrrDisplay = `$${(stats.mrrCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">
              Last updated: {new Date(stats.generatedAt).toLocaleString()}
            </p>
          </div>
          <a href="/dashboard" className="text-sm text-slate-400 hover:text-white transition">
            ← Back to app
          </a>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
          <StatCard label="Total Users" value={stats.totalUsers} />
          <StatCard label="Not Subscribed" value={stats.notSubscribed} />
          <StatCard label="Self Service" value={stats.proSubscribers} sub="$5/mo" />
          <StatCard label="Autopilot" value={stats.autopilotSubscribers} sub="$49/mo" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <StatCard label="MRR (est.)" value={mrrDisplay} sub="Based on active subs" />
          <StatCard label="Disputes This Week" value={stats.disputesLast7} sub={`${stats.disputesLast30} last 30 days`} />
          <StatCard label="Autopilot Waitlist" value={stats.autopilotWaitlistCount} sub="Waiting for launch" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Dispute Reasons */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="font-semibold mb-4 text-slate-200">Top Dispute Reasons</h2>
            {stats.topReasons.length === 0 ? (
              <p className="text-slate-400 text-sm">No data yet</p>
            ) : (
              <div className="space-y-3">
                {stats.topReasons.map((r, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-500 w-5 shrink-0">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 truncate">{r.reason}</p>
                    </div>
                    <span className="text-sm font-bold text-lime-400 shrink-0">{r.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Disputes */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="font-semibold mb-4 text-slate-200">Recent Disputes</h2>
            {stats.recentDisputes.length === 0 ? (
              <p className="text-slate-400 text-sm">No disputes yet</p>
            ) : (
              <div className="space-y-2">
                {stats.recentDisputes.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 text-xs">
                    <span className="text-slate-400 font-mono truncate max-w-[80px] shrink-0">
                      {String(d.userId || "").slice(0, 8)}...
                    </span>
                    <span className="text-slate-300 flex-1 truncate">{String(d.creditorName || "—")}</span>
                    <span className="text-slate-400 shrink-0">{String(d.bureau || "—")}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                      d.status === "RESOLVED" ? "bg-green-900/50 text-green-400" :
                      d.status === "SENT" ? "bg-blue-900/50 text-blue-400" :
                      "bg-slate-700 text-slate-400"
                    }`}>
                      {String(d.status || "—")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

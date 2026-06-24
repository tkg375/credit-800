"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

interface UserRow {
  id: string;
  email: string;
  name: string;
  plan: string;
  status: string;
  createdAt: string;
}

interface AdminStats {
  totalUsers: number;
  totalAnalyses: number;
  totalLettersGenerated: number;
  totalSentUSPS: number;
  users: UserRow[];
  generatedAt: string;
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-2">
      <span className="text-3xl">{icon}</span>
      <p className="text-3xl font-bold text-slate-900">{value.toLocaleString()}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

function PlanBadge({ plan, status }: { plan: string; status: string }) {
  const isActive = status === "active";
  if (plan === "autopilot" && isActive) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Autopilot</span>;
  if (plan === "pro" && isActive) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-[#1a3fd4]">Pro</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">Free</span>;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${user.idToken}` } })
      .then((r) => {
        if (r.status === 403) { router.push("/dashboard"); return null; }
        return r.json();
      })
      .then((data: unknown) => {
        if (!data) return;
        const d = data as Record<string, unknown>;
        if (d.error) { setError(d.error as string); return; }
        setStats(d as unknown as AdminStats);
      })
      .catch(() => setError("Failed to load admin stats."))
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const filtered = stats.users.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-sm text-slate-400 mt-1">
              Last updated {new Date(stats.generatedAt).toLocaleString()}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <StatCard label="Total Users" value={stats.totalUsers} icon="👥" />
          <StatCard label="Reports Analyzed" value={stats.totalAnalyses} icon="📄" />
          <StatCard label="Letters Generated" value={stats.totalLettersGenerated} icon="✉️" />
          <StatCard label="Sent to USPS" value={stats.totalSentUSPS} icon="📬" />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Users</h2>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 w-56"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Name</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Email</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Plan</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-400">No users found</td>
                  </tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-800">{u.name.trim() || "—"}</td>
                      <td className="px-5 py-3 text-slate-600">{u.email}</td>
                      <td className="px-5 py-3"><PlanBadge plan={u.plan} status={u.status} /></td>
                      <td className="px-5 py-3 text-slate-400">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

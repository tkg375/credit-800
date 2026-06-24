"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { ProGate } from "@/components/ProGate";

type GoalType = "credit_score" | "net_worth" | "debt_payoff" | "savings";

interface Goal {
  id: string;
  type: GoalType;
  title: string;
  target: number;
  current: number;
  unit: string;
  deadline: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
}

const GOAL_TYPES: { value: GoalType; label: string; description: string; unit: string; icon: string }[] = [
  { value: "credit_score", label: "Credit Score", description: "Reach a target credit score", unit: "points", icon: "📈" },
  { value: "net_worth", label: "Net Worth", description: "Grow your total net worth", unit: "$", icon: "💰" },
  { value: "debt_payoff", label: "Debt Payoff", description: "Pay off a specific debt amount", unit: "$", icon: "🎯" },
  { value: "savings", label: "Savings", description: "Save a certain amount of money", unit: "$", icon: "🏦" },
];

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function GoalCard({
  goal,
  onUpdate,
  onDelete,
}: {
  goal: Goal;
  onUpdate: (id: string, data: Partial<Goal>) => void;
  onDelete: (id: string) => void;
}) {
  const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
  const days = daysUntil(goal.deadline);
  const typeInfo = GOAL_TYPES.find((t) => t.value === goal.type);
  const [editing, setEditing] = useState(false);
  const [newCurrent, setNewCurrent] = useState(String(goal.current));

  const handleUpdateCurrent = () => {
    onUpdate(goal.id, { current: Number(newCurrent) });
    setEditing(false);
  };

  return (
    <div className={`bg-white border rounded-2xl p-5 shadow-sm ${goal.isCompleted ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200"}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{typeInfo?.icon}</span>
          <div>
            <p className="font-semibold text-slate-800">{goal.title}</p>
            <p className="text-xs text-slate-400">{typeInfo?.label}</p>
          </div>
        </div>
        {goal.isCompleted && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Completed</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>{goal.unit === "$" ? `$${goal.current.toLocaleString()}` : `${goal.current} ${goal.unit}`}</span>
          <span>{goal.unit === "$" ? `$${goal.target.toLocaleString()}` : `${goal.target} ${goal.unit}`}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: goal.isCompleted ? "#10b981" : "linear-gradient(to right, #84cc16, #14b8a6)" }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-1 text-right">{pct}% complete</p>
      </div>

      {/* Deadline */}
      {goal.deadline && days !== null && (
        <div className={`text-xs font-medium mb-3 ${days < 0 ? "text-red-500" : days <= 7 ? "text-amber-600" : "text-slate-500"}`}>
          {days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? "Due today!" : `${days} days remaining`}
        </div>
      )}

      {/* Actions */}
      {!goal.isCompleted && (
        <div className="flex gap-2 mt-2">
          {editing ? (
            <>
              <input
                type="number"
                value={newCurrent}
                onChange={(e) => setNewCurrent(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button onClick={handleUpdateCurrent} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:opacity-90 transition">Save</button>
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs hover:bg-slate-50">×</button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="flex-1 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 transition font-medium"
              >
                Update Progress
              </button>
              <button
                onClick={() => onUpdate(goal.id, { isCompleted: true })}
                className="px-3 py-1.5 text-xs bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition font-medium"
              >
                Complete
              </button>
            </>
          )}
          <button
            onClick={() => onDelete(goal.id)}
            className="p-1.5 text-slate-300 hover:text-red-500 transition"
            title="Delete goal"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default function GoalsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "credit_score" as GoalType,
    title: "",
    target: "",
    current: "",
    deadline: "",
  });

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const loadGoals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch("/api/goals", { headers: { Authorization: `Bearer ${user.idToken}` } });
      if (res.ok) {
        const d = await res.json();
        setGoals(d.goals || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const handleAdd = async () => {
    if (!user || !form.title || !form.target || !form.current) return;
    setSaving(true);
    const typeInfo = GOAL_TYPES.find((t) => t.value === form.type)!;
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
        body: JSON.stringify({
          type: form.type,
          title: form.title,
          target: Number(form.target),
          current: Number(form.current),
          unit: typeInfo.unit,
          deadline: form.deadline || null,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ type: "credit_score", title: "", target: "", current: "", deadline: "" });
        loadGoals();
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, data: Partial<Goal>) => {
    if (!user) return;
    await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
      body: JSON.stringify(data),
    });
    loadGoals();
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    await fetch(`/api/goals/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${user.idToken}` },
    });
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const active = goals.filter((g) => !g.isCompleted);
  const completed = goals.filter((g) => g.isCompleted);

  const selectedType = GOAL_TYPES.find((t) => t.value === form.type)!;

  return (
    <AuthenticatedLayout activeNav="goals">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Goals Tracker</h1>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl text-sm font-medium hover:opacity-90 transition"
          >
            + New Goal
          </button>
        </div>

        <ProGate feature="Goals Tracker">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-4 border-[#1a3fd4] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Active goals */}
              {active.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm mb-6">
                  <p className="text-4xl mb-3">🎯</p>
                  <p className="font-semibold text-slate-700 mb-1">No active goals yet</p>
                  <p className="text-sm text-slate-400 mb-4">Set a financial goal to start tracking your progress.</p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl text-sm font-medium hover:opacity-90 transition"
                  >
                    Create Your First Goal
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 mb-6">
                  {active.map((g) => (
                    <GoalCard key={g.id} goal={g} onUpdate={handleUpdate} onDelete={handleDelete} />
                  ))}
                </div>
              )}

              {/* Completed */}
              {completed.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowCompleted((v) => !v)}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition mb-3"
                  >
                    <svg className={`w-4 h-4 transition-transform ${showCompleted ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Completed Goals ({completed.length})
                  </button>
                  {showCompleted && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {completed.map((g) => (
                        <GoalCard key={g.id} goal={g} onUpdate={handleUpdate} onDelete={handleDelete} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </ProGate>
      </main>

      {/* Add Goal Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg">New Goal</h2>
              <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Type */}
              <div>
                <label className="block text-xs text-slate-500 font-medium mb-1.5">Goal Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {GOAL_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                      className={`px-3 py-2.5 rounded-xl text-sm text-left transition border ${
                        form.type === t.value
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="mr-1.5">{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1.5">{selectedType.description}</p>
              </div>

              {/* Title */}
              <input
                type="text"
                placeholder={`e.g. ${form.type === "credit_score" ? "Reach 750 credit score" : form.type === "savings" ? "Save $10,000 emergency fund" : "Pay off car loan"}`}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Current Value ({selectedType.unit})</label>
                  <input
                    type="number"
                    placeholder="Current"
                    value={form.current}
                    onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Target ({selectedType.unit})</label>
                  <input
                    type="number"
                    placeholder="Target"
                    value={form.target}
                    onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Deadline (optional)</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleAdd}
                  disabled={saving || !form.title || !form.target || !form.current}
                  className="flex-1 py-2.5 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl font-medium text-sm hover:opacity-90 transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Create Goal"}
                </button>
                <button onClick={() => setShowModal(false)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthenticatedLayout>
  );
}

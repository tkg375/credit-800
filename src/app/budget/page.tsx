"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth-context";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { ProGate } from "@/components/ProGate";
import { downloadCSV } from "@/lib/export-csv";

const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });

const EXPENSE_CATEGORIES = [
  "Housing", "Food & Dining", "Transport", "Utilities",
  "Entertainment", "Healthcare", "Subscriptions", "Shopping",
  "Debt Payments", "Other",
];
const INCOME_CATEGORIES = ["Salary", "Freelance", "Investments", "Other Income"];

interface BudgetEntry {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  date: string;
  note: string;
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function formatMonth(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function prevMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

function nextMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Housing": "#14b8a6", "Food & Dining": "#f59e0b", "Transport": "#84cc16",
  "Utilities": "#06b6d4", "Entertainment": "#a78bfa", "Healthcare": "#f87171",
  "Subscriptions": "#fb923c", "Shopping": "#60a5fa", "Debt Payments": "#ef4444", "Other": "#94a3b8",
};

export default function BudgetPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [month, setMonth] = useState(getCurrentMonth());
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    type: "expense" as "income" | "expense",
    category: EXPENSE_CATEGORIES[0],
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    note: "",
  });

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const loadEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/budget/entries?month=${month}`, {
        headers: { Authorization: `Bearer ${user.idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user, month]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleAdd = async () => {
    if (!user || !form.amount || !form.date) return;
    setSaving(true);
    try {
      const res = await fetch("/api/budget/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ type: "expense", category: EXPENSE_CATEGORIES[0], amount: "", date: new Date().toISOString().slice(0, 10), note: "" });
        loadEntries();
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    await fetch(`/api/budget/entries/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${user.idToken}` },
    });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const totalIncome = entries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const totalExpenses = entries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const net = totalIncome - totalExpenses;

  const expenseByCategory = EXPENSE_CATEGORIES.map((cat) => ({
    cat,
    amount: entries.filter((e) => e.type === "expense" && e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter((d) => d.amount > 0);

  const filteredEntries = entries.filter((e) => e.type === activeTab);

  const categories = form.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <AuthenticatedLayout activeNav="budget">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Budget Tracker</h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const allEntries = entries.map(e => ({
                  type: e.type,
                  category: e.category,
                  amount: e.amount,
                  date: e.date,
                  note: e.note,
                }));
                downloadCSV("budget.csv", allEntries);
              }}
              disabled={entries.length === 0}
              className="px-3 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition disabled:opacity-40 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl text-sm font-medium hover:opacity-90 transition"
            >
              + Add Entry
            </button>
          </div>
        </div>

        <ProGate feature="Budget Tracker">
          {/* Month selector */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setMonth(prevMonth(month))} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition">
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="font-semibold text-slate-700 min-w-[160px] text-center">{formatMonth(month)}</span>
            <button onClick={() => setMonth(nextMonth(month))} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition">
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
              <p className="text-xs text-slate-500 mb-1">Income</p>
              <p className="text-xl font-bold text-emerald-600">${totalIncome.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
              <p className="text-xs text-slate-500 mb-1">Expenses</p>
              <p className="text-xl font-bold text-red-500">${totalExpenses.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
              <p className="text-xs text-slate-500 mb-1">Net</p>
              <p className={`text-xl font-bold ${net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {net >= 0 ? "+" : ""}${net.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Bar chart */}
          {expenseByCategory.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6">
              <h2 className="font-semibold text-slate-800 mb-4">Expenses by Category</h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height={192} minWidth={0}>
                  <BarChart data={expenseByCategory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="cat" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                      formatter={(v: unknown) => [`$${Number(v).toLocaleString()}`, "Amount"]}
                    />
                    <Bar dataKey="amount" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            {(["expense", "income"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === tab
                    ? "bg-teal-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab === "expense" ? "Expenses" : "Income"}
              </button>
            ))}
          </div>

          {/* Entry list */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#1a3fd4] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
              <p className="text-slate-400 text-sm">No {activeTab === "expense" ? "expense" : "income"} entries for this month.</p>
              <button onClick={() => setShowModal(true)} className="mt-3 text-teal-600 text-sm hover:underline">Add one now →</button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntries.map((e) => (
                <div key={e.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: `${CATEGORY_COLORS[e.category] ?? "#94a3b8"}20`, color: CATEGORY_COLORS[e.category] ?? "#94a3b8" }}
                    >
                      {e.category}
                    </span>
                    <div>
                      <p className="text-sm text-slate-700">{e.note || e.category}</p>
                      <p className="text-xs text-slate-400">{e.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={`font-semibold text-sm ${e.type === "income" ? "text-emerald-600" : "text-slate-800"}`}>
                      {e.type === "income" ? "+" : ""}${e.amount.toLocaleString()}
                    </p>
                    <button onClick={() => handleDelete(e.id)} className="text-slate-300 hover:text-red-500 transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ProGate>
      </main>

      {/* Add Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg">Add Entry</h2>
              <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Type */}
              <div className="flex gap-2">
                {(["expense", "income"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm((f) => ({ ...f, type: t, category: t === "expense" ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0] }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${form.type === t ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}
                  >
                    {t === "expense" ? "Expense" : "Income"}
                  </button>
                ))}
              </div>
              {/* Category */}
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {/* Amount */}
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount ($)"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {/* Date */}
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {/* Note */}
              <input
                type="text"
                placeholder="Note (optional)"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleAdd}
                  disabled={saving || !form.amount || !form.date}
                  className="flex-1 py-2.5 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl font-medium text-sm hover:opacity-90 transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Add Entry"}
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

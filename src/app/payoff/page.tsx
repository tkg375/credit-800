"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { ProGate } from "@/components/ProGate";
import { calculateAvalanche, calculateSnowball, calculateMinimumOnly, type Debt, type PayoffResult } from "@/lib/payoff-calculator";
import dynamic from "next/dynamic";

const AreaChart = dynamic(() => import("recharts").then((m) => m.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then((m) => m.Area), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });
const Legend = dynamic(() => import("recharts").then((m) => m.Legend), { ssr: false });


export default function PayoffPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [debts, setDebts] = useState<Debt[]>([
    { id: "1", name: "Credit Card 1", balance: 5000, interestRate: 22.99, minimumPayment: 100 },
  ]);
  const [extraPayment, setExtraPayment] = useState(200);
  const [results, setResults] = useState<{ avalanche: PayoffResult; snowball: PayoffResult; minimum: PayoffResult } | null>(null);
  const [nextId, setNextId] = useState(2);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const loadFromReport = async () => {
    if (!user) return;
    setLoadingReport(true);
    try {
      const res = await fetch("/api/data/reportItems", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
        body: JSON.stringify({}),
      });
      const data = await res.json() as { documents?: Record<string, unknown>[] };
      const items = (data.documents || [])
        .map((doc: Record<string, unknown>) => ({
          creditorName: (doc.creditorName as string) || "",
          accountType: (doc.accountType as string) || "",
          balance: Number(doc.balance) || 0,
        }))
        .filter((i: { balance: number }) => i.balance > 0);

      if (items.length === 0) {
        alert("No debts with balances found in your credit report. Upload a report first.");
        return;
      }

      let id = nextId;
      const loaded: Debt[] = items.map((item: { creditorName: string; accountType: string; balance: number }) => {
        const minPct = item.accountType.toLowerCase().includes("credit card") ? 0.02 : 0.015;
        return {
          id: String(id++),
          name: item.creditorName || "Unknown Creditor",
          balance: item.balance,
          interestRate: item.accountType.toLowerCase().includes("credit card") ? 22.99 : 18.0,
          minimumPayment: Math.max(25, Math.round(item.balance * minPct)),
        };
      });
      setDebts(loaded);
      setNextId(id);
      setResults(null);
    } catch (err) {
      console.error(err);
      alert("Failed to load debts from report.");
    } finally {
      setLoadingReport(false);
    }
  };

  const addDebt = () => {
    setDebts([...debts, { id: String(nextId), name: `Debt ${nextId}`, balance: 0, interestRate: 0, minimumPayment: 0 }]);
    setNextId(nextId + 1);
    setResults(null);
  };

  const removeDebt = (id: string) => {
    setDebts(debts.filter((d) => d.id !== id));
    setResults(null);
  };

  const updateDebt = (id: string, field: keyof Debt, value: string | number) => {
    setDebts(debts.map((d) => d.id === id ? { ...d, [field]: value } : d));
    setResults(null);
  };

  const calculate = () => {
    const validDebts = debts.filter((d) => d.balance > 0 && d.minimumPayment > 0);
    if (validDebts.length === 0) { alert("Add at least one debt with a balance and minimum payment."); return; }
    setResults({
      avalanche: calculateAvalanche(validDebts, extraPayment),
      snowball: calculateSnowball(validDebts, extraPayment),
      minimum: calculateMinimumOnly(validDebts),
    });
  };

  const formatMoney = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const formatMonths = (n: number) => {
    const years = Math.floor(n / 12);
    const months = n % 12;
    if (years === 0) return `${months} months`;
    if (months === 0) return `${years} year${years > 1 ? "s" : ""}`;
    return `${years}y ${months}m`;
  };

  // Build chart data
  const chartData = results ? results.avalanche.monthlySchedule
    .filter((_, i) => i % 3 === 0 || i === results.avalanche.monthlySchedule.length - 1)
    .map((entry) => {
      const snowEntry = results.snowball.monthlySchedule[entry.month - 1];
      const minEntry = results.minimum.monthlySchedule[entry.month - 1];
      return {
        month: `Mo ${entry.month}`,
        Avalanche: Math.round(entry.totalBalance),
        Snowball: snowEntry ? Math.round(snowEntry.totalBalance) : 0,
        Minimum: minEntry ? Math.round(minEntry.totalBalance) : undefined,
      };
    }) : [];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1a3fd4] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthenticatedLayout activeNav="payoff">
      <ProGate feature="Debt Payoff Optimizer">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] bg-clip-text text-transparent">
            Debt Payoff Optimizer
          </h1>
          <button
            onClick={loadFromReport}
            disabled={loadingReport}
            className="px-4 py-2 text-sm bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {loadingReport ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Loading...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>Load from Report</>
            )}
          </button>
        </div>
        <p className="text-slate-500 mb-8">Compare strategies to pay off your debt faster and save money.</p>

        {/* Debt Inputs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold mb-4">Your Debts</h2>
          <div className="space-y-4">
            {debts.map((debt) => (
              <div key={debt.id} className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-slate-500 mb-1">Name</label>
                  <input
                    type="text"
                    value={debt.name}
                    onChange={(e) => updateDebt(debt.id, "name", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Balance ($)</label>
                  <input
                    type="number"
                    value={debt.balance || ""}
                    onChange={(e) => updateDebt(debt.id, "balance", Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">APR (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={debt.interestRate || ""}
                    onChange={(e) => updateDebt(debt.id, "interestRate", Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Min Payment ($)</label>
                  <input
                    type="number"
                    value={debt.minimumPayment || ""}
                    onChange={(e) => updateDebt(debt.id, "minimumPayment", Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div className="flex items-end">
                  {debts.length > 1 && (
                    <button onClick={() => removeDebt(debt.id)} className="px-3 py-2 text-red-500 text-sm hover:bg-red-50 rounded-lg transition">
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button onClick={addDebt} className="mt-4 text-sm text-teal-600 hover:text-teal-700 font-medium">
            + Add Another Debt
          </button>
        </div>

        {/* Extra Payment */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <label className="block font-semibold mb-2">Extra Monthly Payment</label>
          <p className="text-sm text-slate-500 mb-3">How much extra can you put toward debt each month (beyond minimums)?</p>
          <div className="flex items-center gap-4">
            <span className="text-slate-500">$</span>
            <input
              type="number"
              min={0}
              value={extraPayment}
              onChange={(e) => { setExtraPayment(Number(e.target.value)); setResults(null); }}
              className="w-32 px-3 py-2 rounded-lg border border-slate-300 text-lg font-bold focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
            <span className="text-sm text-slate-500">/ month</span>
          </div>
        </div>

        <button
          onClick={calculate}
          className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl font-medium hover:opacity-90 transition mb-8"
        >
          Calculate Payoff Plans
        </button>

        {/* Results */}
        {results && (
          <>
            {/* Strategy Comparison Cards */}
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {[
                { label: "Avalanche", sub: "Highest interest first", result: results.avalanche, color: "teal", recommended: true },
                { label: "Snowball", sub: "Lowest balance first", result: results.snowball, color: "cyan", recommended: false },
                { label: "Minimum Only", sub: "No extra payments", result: results.minimum, color: "slate", recommended: false },
              ].map(({ label, sub, result, color, recommended }) => {
                const savings = results.minimum.totalInterest - result.totalInterest;
                return (
                  <div key={label} className={`bg-white rounded-xl border-2 p-5 ${recommended ? "border-teal-500" : "border-slate-200"}`}>
                    {recommended && (
                      <span className="text-xs bg-blue-50 text-[#1a3fd4] px-2 py-0.5 rounded-full font-medium">Recommended</span>
                    )}
                    <h3 className="font-semibold mt-2">{label}</h3>
                    <p className="text-xs text-slate-500">{sub}</p>
                    <div className="mt-3 space-y-2">
                      <div>
                        <p className="text-xs text-slate-500">Payoff Time</p>
                        <p className={`text-xl font-bold text-${color}-600`}>{formatMonths(result.totalMonths)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Total Interest</p>
                        <p className="text-lg font-semibold text-slate-900">{formatMoney(result.totalInterest)}</p>
                      </div>
                      {savings > 0 && (
                        <div className="bg-green-50 rounded-lg p-2">
                          <p className="text-xs text-green-700 font-medium">Save {formatMoney(savings)} vs minimum</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chart */}
            {chartData.length > 1 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
                <h3 className="font-semibold mb-4">Balance Over Time</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height={256} minWidth={0}>
                    <AreaChart data={chartData}>
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]} />
                      <Legend />
                      <Area type="monotone" dataKey="Minimum" stroke="#94a3b8" fill="#f1f5f9" strokeWidth={2} />
                      <Area type="monotone" dataKey="Snowball" stroke="#06b6d4" fill="#cffafe" strokeWidth={2} />
                      <Area type="monotone" dataKey="Avalanche" stroke="#14b8a6" fill="#ccfbf1" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      </ProGate>
    </AuthenticatedLayout>
  );
}

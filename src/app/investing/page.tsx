"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { fidelityFunds, strategies, accountTypes, type Fund, type Strategy } from "@/lib/investing-content";
import dynamic from "next/dynamic";

const AreaChart = dynamic(() => import("recharts").then((m) => m.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then((m) => m.Area), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });

type Tab = "funds" | "strategies" | "calculator" | "accounts";

const RISK_COLORS: Record<string, string> = {
  Conservative: "bg-blue-100 text-blue-700",
  Moderate: "bg-amber-100 text-amber-700",
  Aggressive: "bg-orange-100 text-orange-700",
  "Very Aggressive": "bg-red-100 text-red-700",
};

function AllocationBar({ allocations }: { allocations: Strategy["allocations"] }) {
  return (
    <div className="w-full h-4 rounded-full overflow-hidden flex">
      {allocations.map((a) => (
        <div
          key={a.ticker}
          style={{ width: `${a.percentage}%`, backgroundColor: a.color }}
          title={`${a.label}: ${a.percentage}%`}
        />
      ))}
    </div>
  );
}

function FundCard({ fund, selected, onClick }: { fund: Fund; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 transition overflow-hidden ${
        selected ? "border-teal-500 shadow-lg shadow-teal-100" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      {/* Color header */}
      <div className={`h-2 bg-gradient-to-r ${fund.colorClass}`} />
      <div className="p-3">
        <span className="text-base font-bold text-slate-900 block leading-tight">{fund.ticker}</span>
        <span className="mt-1.5 inline-block text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full leading-snug whitespace-nowrap">
          {fund.category}
        </span>
        <div className={`mt-2 text-sm font-bold ${fund.expenseRatio === "0.00%" ? "text-green-600" : "text-slate-700"}`}>
          {fund.expenseRatio}
        </div>
      </div>
    </button>
  );
}

function CompoundCalculator() {
  const [monthly, setMonthly] = useState(500);
  const [rate, setRate] = useState(8);
  const [years, setYears] = useState(20);
  const [initial, setInitial] = useState(0);

  const chartData = useMemo(() => {
    const data = [];
    for (let y = 0; y <= years; y++) {
      const months = y * 12;
      const fv =
        initial * Math.pow(1 + rate / 100 / 12, months) +
        monthly * ((Math.pow(1 + rate / 100 / 12, months) - 1) / (rate / 100 / 12));
      const contributed = initial + monthly * months;
      data.push({
        year: y === 0 ? "Now" : `Yr ${y}`,
        Total: Math.round(fv),
        Contributed: Math.round(contributed),
        Growth: Math.round(Math.max(0, fv - contributed)),
      });
    }
    return data;
  }, [monthly, rate, years, initial]);

  const finalValue = chartData[chartData.length - 1]?.Total || 0;
  const totalContributed = chartData[chartData.length - 1]?.Contributed || 0;
  const totalGrowth = finalValue - totalContributed;

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(2)}M`
      : `$${n.toLocaleString("en-US")}`;

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-semibold mb-4">Calculator Inputs</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Initial Investment
            </label>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm">$</span>
              <input
                type="number"
                min={0}
                value={initial}
                onChange={(e) => setInitial(Math.max(0, Number(e.target.value)))}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Monthly Contribution
            </label>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm">$</span>
              <input
                type="number"
                min={0}
                value={monthly}
                onChange={(e) => setMonthly(Math.max(0, Number(e.target.value)))}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Annual Return: <span className="text-teal-600 font-bold">{rate}%</span>
            </label>
            <input
              type="range"
              min={3}
              max={15}
              step={0.5}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full accent-[#1a3fd4]"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>3% (bonds)</span>
              <span>8% (stocks avg)</span>
              <span>15%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Time Horizon: <span className="text-teal-600 font-bold">{years} years</span>
            </label>
            <input
              type="range"
              min={1}
              max={40}
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full accent-[#1a3fd4]"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>1 yr</span>
              <span>20 yrs</span>
              <span>40 yrs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Result Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#1a3fd4] to-[#00d4aa] rounded-xl p-4 text-white text-center">
          <p className="text-xs text-white/70 mb-1">Final Balance</p>
          <p className="text-2xl font-bold">{fmt(finalValue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Total Contributed</p>
          <p className="text-xl font-bold text-slate-900">{fmt(totalContributed)}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Investment Growth</p>
          <p className="text-xl font-bold text-green-600">{fmt(totalGrowth)}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-semibold mb-4">Growth Over Time</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height={256} minWidth={0}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="contribGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="#94a3b8" interval={Math.floor(years / 5)} />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#94a3b8"
                tickFormatter={(v: number) =>
                  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k`
                }
              />
              <Tooltip
                formatter={(value: unknown, name: unknown) => [
                  `$${Number(value).toLocaleString()}`,
                  name === "Total" ? "Portfolio Value" : name === "Contributed" ? "Money Invested" : "Market Growth",
                ]}
              />
              <Area
                type="monotone"
                dataKey="Contributed"
                stroke="#94a3b8"
                fill="url(#contribGrad)"
                strokeWidth={2}
                name="Contributed"
              />
              <Area
                type="monotone"
                dataKey="Total"
                stroke="#14b8a6"
                fill="url(#totalGrad)"
                strokeWidth={2}
                name="Total"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-400 mt-3 text-center">
          Assumes {rate}% annual return compounded monthly. Past performance does not guarantee future results.
          This is a projection tool, not financial advice.
        </p>
      </div>

      {/* Quick scenarios */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <h4 className="text-sm font-semibold mb-3">Quick Scenarios</h4>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { label: "Roth IRA Max", monthly: 583, years: 30, note: "$7k/yr for 30 yrs" },
            { label: "Coffee Money", monthly: 150, years: 20, note: "$5/day for 20 yrs" },
            { label: "Aggressive Saver", monthly: 2000, years: 25, note: "$2k/mo for 25 yrs" },
          ].map((s) => {
            const months = s.years * 12;
            const r = 0.08 / 12;
            const fv = s.monthly * ((Math.pow(1 + r, months) - 1) / r);
            return (
              <button
                key={s.label}
                onClick={() => { setMonthly(s.monthly); setYears(s.years); setInitial(0); setRate(8); }}
                className="p-3 bg-white rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50 transition text-left"
              >
                <p className="text-sm font-semibold text-slate-800">{s.label}</p>
                <p className="text-xs text-slate-500">{s.note}</p>
                <p className="text-sm font-bold text-teal-600 mt-1">
                  → {fv >= 1_000_000 ? `$${(fv / 1_000_000).toFixed(2)}M` : `$${Math.round(fv).toLocaleString()}`}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function InvestingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("funds");
  const [selectedFund, setSelectedFund] = useState<Fund | null>(fidelityFunds[0]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>(strategies[0]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1a3fd4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthenticatedLayout activeNav="investing">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] bg-clip-text text-transparent">
            Investing Strategies
          </h1>
          <p className="text-slate-500 mt-1">
            Build long-term wealth with low-cost Fidelity index funds.
          </p>
        </div>

        {/* Intro banner */}
        <div className="bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] rounded-2xl p-6 text-white mb-8">
          <div className="grid sm:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold">$0</p>
              <p className="text-sm text-white/80">Expense ratio on FZROX & FZILX</p>
            </div>
            <div>
              <p className="text-3xl font-bold">~8%</p>
              <p className="text-sm text-white/80">Historical US stock market avg return</p>
            </div>
            <div>
              <p className="text-3xl font-bold">$1</p>
              <p className="text-sm text-white/80">Minimum to start investing at Fidelity</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {[
            { key: "funds" as Tab, label: "Fidelity Funds" },
            { key: "strategies" as Tab, label: "Portfolio Strategies" },
            { key: "calculator" as Tab, label: "Growth Calculator" },
            { key: "accounts" as Tab, label: "Account Types" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2.5 rounded-xl font-medium text-sm transition ${
                activeTab === key
                  ? "bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── FUNDS TAB ── */}
        {activeTab === "funds" && (
          <div className="space-y-6">
            {/* Fund selector grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {fidelityFunds.map((fund) => (
                <FundCard
                  key={fund.ticker}
                  fund={fund}
                  selected={selectedFund?.ticker === fund.ticker}
                  onClick={() => setSelectedFund(fund)}
                />
              ))}
            </div>

            {/* Fund detail */}
            {selectedFund && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className={`h-2 bg-gradient-to-r ${selectedFund.colorClass}`} />
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedFund.ticker}</h2>
                      <p className="text-slate-500 text-sm">{selectedFund.name}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <div className="bg-slate-50 rounded-xl px-4 py-2 text-center">
                        <p className="text-xs text-slate-500">Expense Ratio</p>
                        <p className={`text-xl font-bold ${selectedFund.expenseRatio === "0.00%" ? "text-green-600" : "text-slate-900"}`}>
                          {selectedFund.expenseRatio}
                          {selectedFund.expenseRatio === "0.00%" && <span className="text-xs ml-1 font-normal">FREE</span>}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl px-4 py-2 text-center">
                        <p className="text-xs text-slate-500">Min Investment</p>
                        <p className="text-xl font-bold text-slate-900">{selectedFund.minInvestment}</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-600 text-sm leading-relaxed mb-5">{selectedFund.description}</p>

                  <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 mb-5 text-sm">
                    <span className="font-semibold text-teal-800">Best for: </span>
                    <span className="text-teal-700">{selectedFund.bestFor}</span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-green-700 mb-2">Pros</h4>
                      <ul className="space-y-1.5">
                        {selectedFund.pros.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                            <span className="text-green-500 mt-0.5 shrink-0">+</span>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-red-600 mb-2">Cons</h4>
                      <ul className="space-y-1.5">
                        {selectedFund.cons.map((c, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                            <span className="text-red-400 mt-0.5 shrink-0">−</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                      Benchmark: {selectedFund.benchmarkIndex}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Comparison table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold">Quick Comparison</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Fund</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Category</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Expense Ratio</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">Minimum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fidelityFunds.map((f) => (
                      <tr
                        key={f.ticker}
                        className="hover:bg-slate-50 cursor-pointer transition"
                        onClick={() => setSelectedFund(f)}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900">{f.ticker}</td>
                        <td className="px-4 py-3 text-slate-600">{f.category}</td>
                        <td className={`px-4 py-3 font-bold ${f.expenseRatio === "0.00%" ? "text-green-600" : "text-slate-800"}`}>
                          {f.expenseRatio}
                        </td>
                        <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{f.minInvestment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── STRATEGIES TAB ── */}
        {activeTab === "strategies" && (
          <div className="space-y-6">
            {/* Strategy selector */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {strategies.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStrategy(s)}
                  className={`p-4 rounded-xl border-2 text-left transition ${
                    selectedStrategy.id === s.id
                      ? "border-teal-500 bg-teal-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">{s.name}</h3>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_COLORS[s.riskLevel]}`}>
                    {s.riskLevel}
                  </span>
                  <AllocationBar allocations={s.allocations} />
                  <p className="text-xs text-slate-500 mt-2">{s.tagline}</p>
                </button>
              ))}
            </div>

            {/* Strategy detail */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-bold">{selectedStrategy.name}</h2>
                  <p className="text-slate-500 text-sm">{selectedStrategy.tagline}</p>
                </div>
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${RISK_COLORS[selectedStrategy.riskLevel]}`}>
                  {selectedStrategy.riskLevel}
                </span>
              </div>

              {/* Allocation breakdown */}
              <div className="mb-5">
                <h3 className="text-sm font-semibold mb-3">Portfolio Allocation</h3>
                <div className="w-full h-6 rounded-full overflow-hidden flex mb-3">
                  {selectedStrategy.allocations.map((a) => (
                    <div
                      key={a.ticker}
                      style={{ width: `${a.percentage}%`, backgroundColor: a.color }}
                      className="flex items-center justify-center text-white text-xs font-bold"
                    >
                      {a.percentage >= 15 ? `${a.percentage}%` : ""}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  {selectedStrategy.allocations.map((a) => (
                    <div key={a.ticker} className="flex items-center gap-1.5 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: a.color }} />
                      <span className="font-medium">{a.ticker}</span>
                      <span className="text-slate-500">— {a.label} ({a.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-slate-600 text-sm leading-relaxed mb-5">{selectedStrategy.description}</p>

              <div className="grid sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl text-sm">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Best For</p>
                  <p className="font-medium text-slate-800">{selectedStrategy.bestFor}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Historical Avg Return</p>
                  <p className="font-medium text-teal-700">{selectedStrategy.expectedReturn}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Time Horizon</p>
                  <p className="font-medium text-slate-800">{selectedStrategy.timeHorizon}</p>
                </div>
              </div>
            </div>

            {/* Key principles */}
            <div className="bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] rounded-2xl p-6 text-white">
              <h3 className="font-semibold text-lg mb-4">Index Fund Investing Principles</h3>
              <div className="grid sm:grid-cols-2 gap-4 text-sm text-white/90">
                {[
                  { title: "Keep costs low", body: "A 1% expense ratio costs you ~28% of your wealth over 40 years vs. 0%. FZROX at 0% keeps every dollar working." },
                  { title: "Stay the course", body: "The average investor underperforms the market by ~1.5%/yr by trying to time it. Set an allocation and don't touch it." },
                  { title: "Diversify broadly", body: "FZROX alone gives you 2,700+ companies. Add FZILX and you own the entire world market." },
                  { title: "Time in market > timing", body: "Missing just the 10 best days of the last 30 years would have cut your returns in half. Stay invested." },
                ].map(({ title, body }) => (
                  <div key={title} className="bg-white/10 rounded-xl p-4">
                    <p className="font-semibold mb-1">{title}</p>
                    <p className="text-white/80 text-xs leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CALCULATOR TAB ── */}
        {activeTab === "calculator" && <CompoundCalculator />}

        {/* ── ACCOUNTS TAB ── */}
        {activeTab === "accounts" && (
          <div className="space-y-6">
            {/* Priority guide */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold mb-4">Recommended Order of Operations</h3>
              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                {["hsa", "401k", "roth_ira", "taxable"].map((id, i) => {
                  const acct = accountTypes.find((a) => a.id === id)!;
                  return (
                    <div key={id} className="flex-1 flex flex-col sm:flex-row items-center gap-2">
                      <div className="flex-1 bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
                        <div className="w-8 h-8 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] rounded-full text-white text-sm font-bold flex items-center justify-center mx-auto mb-2">
                          {i + 1}
                        </div>
                        <div className="text-lg">{acct.icon}</div>
                        <p className="font-semibold text-sm mt-1">{acct.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{acct.contributionLimit}</p>
                      </div>
                      {i < 3 && (
                        <div className="text-slate-400 text-lg font-bold shrink-0 rotate-90 sm:rotate-0">→</div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-4">
                * Only contribute to an HSA if you have a qualifying high-deductible health plan. If not, start with your 401k match, then Roth IRA.
              </p>
            </div>

            {/* Account cards */}
            <div className="space-y-4">
              {["hsa", "401k", "roth_ira", "taxable"].map((id) => {
                const acct = accountTypes.find((a) => a.id === id)!;
                return (
                  <div key={id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{acct.icon}</span>
                        <div>
                          <h3 className="font-semibold">{acct.name}</h3>
                          <p className="text-xs text-teal-600 font-medium">{acct.taxAdvantage}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-500">Annual Limit</p>
                        <p className="font-bold text-slate-900 text-sm">{acct.contributionLimit}</p>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="mb-4">
                        <p className="text-xs text-slate-500 mb-1 font-medium">BEST FOR</p>
                        <p className="text-sm text-slate-700">{acct.bestFor}</p>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-green-700 mb-2">Benefits</p>
                          <ul className="space-y-1.5">
                            {acct.keyBenefits.map((b, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                <span className="text-green-500 shrink-0 mt-0.5">✓</span>
                                {b}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-amber-700 mb-2">Limitations</p>
                          <ul className="space-y-1.5">
                            {acct.keyLimitations.map((l, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                <span className="text-amber-500 shrink-0 mt-0.5">!</span>
                                {l}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Disclaimer */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">
                <strong>Disclaimer:</strong> This page is for educational purposes only and does not constitute
                financial advice. Contribution limits, income thresholds, and tax rules change annually — verify
                current limits at IRS.gov. Consult a qualified financial advisor before making investment decisions.
                Past returns do not guarantee future results.
              </p>
            </div>
          </div>
        )}
      </main>
    </AuthenticatedLayout>
  );
}

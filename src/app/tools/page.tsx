"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import {
  STATUTE_OF_LIMITATIONS,
  STATE_NAMES,
  isDebtExpired,
  getCreditReportRemovalDate,
} from "@/lib/credit-tools";

export default function ToolsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // SOL calculator state
  const [solState, setSolState] = useState("CA");
  const [debtType, setDebtType] = useState<"written" | "oral" | "promissory" | "openEnded">("openEnded");
  const [lastActivityDate, setLastActivityDate] = useState("");
  const [solResult, setSolResult] = useState<{ expired: boolean; expirationDate: Date; daysRemaining: number } | null>(null);

  // Credit report removal calculator
  const [firstDelinquencyDate, setFirstDelinquencyDate] = useState("");
  const [removalDate, setRemovalDate] = useState<Date | null>(null);

  if (!authLoading && !user) {
    router.push("/login");
    return null;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1a3fd4] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const handleCalculateSOL = () => {
    if (!lastActivityDate) return;
    const result = isDebtExpired(solState, debtType, new Date(lastActivityDate));
    setSolResult(result);
  };

  const handleCalculateRemoval = () => {
    if (!firstDelinquencyDate) return;
    const date = getCreditReportRemovalDate(new Date(firstDelinquencyDate));
    setRemovalDate(date);
  };

  return (
    <AuthenticatedLayout activeNav="tools">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Credit Repair Tools</h1>
        <p className="text-slate-600 mb-6 sm:mb-8 text-sm sm:text-base">
          Powerful tools to help you dispute debts, negotiate settlements, and understand your rights.
        </p>

        {/* Side-by-side calculators */}
        <div className="grid lg:grid-cols-2 gap-8">

          {/* Statute of Limitations */}
          <div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
              <h2 className="text-xl font-semibold mb-4">Check Statute of Limitations</h2>
              <p className="text-slate-600 mb-6">
                If a debt is past the statute of limitations, collectors cannot sue you to collect it.
                However, making a payment can restart the clock!
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Your State</label>
                  <select
                    value={solState}
                    onChange={(e) => setSolState(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  >
                    {Object.entries(STATE_NAMES).map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Type of Debt</label>
                  <select
                    value={debtType}
                    onChange={(e) => setDebtType(e.target.value as typeof debtType)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  >
                    <option value="openEnded">Credit Cards / Open-Ended Accounts</option>
                    <option value="written">Written Contracts (Auto Loans, Personal Loans)</option>
                    <option value="oral">Oral Agreements</option>
                    <option value="promissory">Promissory Notes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Date of Last Activity</label>
                  <input
                    type="date"
                    value={lastActivityDate}
                    onChange={(e) => setLastActivityDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    This is typically your last payment or last charge on the account
                  </p>
                </div>

                <button
                  onClick={handleCalculateSOL}
                  className="w-full py-3 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl font-medium hover:opacity-90 transition"
                >
                  Check Status
                </button>
              </div>

              {solResult && (
                <div className={`mt-6 p-6 rounded-xl ${solResult.expired ? "bg-blue-50 border border-blue-200" : "bg-amber-50 border border-amber-200"}`}>
                  {solResult.expired ? (
                    <>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-green-700">Debt is Time-Barred!</h3>
                      </div>
                      <p className="text-green-700">
                        The statute of limitations expired on{" "}
                        <strong>{solResult.expirationDate.toLocaleDateString()}</strong>.
                        Collectors cannot sue you for this debt.
                      </p>
                      <p className="text-sm text-green-600 mt-2">
                        Warning: Making ANY payment could restart the statute of limitations!
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-amber-700">Debt is Still Active</h3>
                      </div>
                      <p className="text-amber-700">
                        The statute of limitations expires on{" "}
                        <strong>{solResult.expirationDate.toLocaleDateString()}</strong>
                        {" "}({solResult.daysRemaining} days remaining).
                      </p>
                      <p className="text-sm text-amber-600 mt-2">
                        Collectors can still sue you to collect this debt.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* SOL Reference Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Statute of Limitations for {STATE_NAMES[solState]}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Credit Cards</p>
                  <p className="text-2xl font-bold">{STATUTE_OF_LIMITATIONS[solState]?.openEnded} years</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Written Contracts</p>
                  <p className="text-2xl font-bold">{STATUTE_OF_LIMITATIONS[solState]?.written} years</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Oral Agreements</p>
                  <p className="text-2xl font-bold">{STATUTE_OF_LIMITATIONS[solState]?.oral} years</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Promissory Notes</p>
                  <p className="text-2xl font-bold">{STATUTE_OF_LIMITATIONS[solState]?.promissory} years</p>
                </div>
              </div>
            </div>
          </div>

          {/* Removal Date Calculator */}
          <div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Credit Report Removal Date</h2>
              <p className="text-slate-600 mb-6">
                Most negative items must be removed from your credit report 7 years after the date of first delinquency.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date of First Delinquency</label>
                  <input
                    type="date"
                    value={firstDelinquencyDate}
                    onChange={(e) => setFirstDelinquencyDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    This is when you first became 30+ days late on the account
                  </p>
                </div>

                <button
                  onClick={handleCalculateRemoval}
                  className="w-full py-3 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl font-medium hover:opacity-90 transition"
                >
                  Calculate Removal Date
                </button>
              </div>

              {removalDate && (
                <div className="mt-6 p-6 bg-teal-50 border border-teal-200 rounded-xl">
                  <h3 className="font-semibold text-teal-700 mb-2">Removal Date</h3>
                  <p className="text-3xl font-bold text-teal-600 mb-2">
                    {removalDate.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  {removalDate < new Date() ? (
                    <p className="text-green-600 font-medium">
                      This item should already be removed! If it&apos;s still showing, dispute it.
                    </p>
                  ) : (
                    <p className="text-slate-600">
                      {Math.ceil((removalDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining
                    </p>
                  )}
                </div>
              )}

              <div className="mt-8 p-4 bg-slate-50 rounded-xl">
                <h3 className="font-semibold mb-2">Important Notes</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-teal-500 mt-1">•</span>
                    <span>Bankruptcies remain for 7-10 years depending on the chapter filed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-500 mt-1">•</span>
                    <span>Some states have shorter reporting periods for paid collections</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-500 mt-1">•</span>
                    <span>The date cannot be reset by paying the debt or the debt being sold</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-500 mt-1">•</span>
                    <span>If an item is reported beyond 7 years, you can dispute it for immediate removal</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </main>
    </AuthenticatedLayout>
  );
}

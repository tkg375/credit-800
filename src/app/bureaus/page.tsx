"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { ProGate } from "@/components/ProGate";


interface ReportItem {
  id: string;
  creditorName: string;
  accountNumber: string;
  accountType: string;
  balance: number;
  status: string;
  bureau: string;
  dateOpened: string | null;
  isDisputable: boolean;
}

const BUREAUS = ["Equifax", "Experian", "TransUnion"];

export default function BureausPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/data/reportItems", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
      body: JSON.stringify({}),
    })
      .then(r => r.json())
      .then((data: { documents?: Record<string, unknown>[] }) => {
        const parsed = (data.documents || []).map(doc => ({
          id: doc.id as string,
          creditorName: (doc.creditorName as string) || "",
          accountNumber: (doc.accountNumber as string) || "",
          accountType: (doc.accountType as string) || "",
          balance: Number(doc.balance) || 0,
          status: (doc.status as string) || "",
          bureau: (doc.bureau as string) || "",
          dateOpened: (doc.dateOpened as string) || null,
          isDisputable: (doc.isDisputable as boolean) ?? false,
        } as ReportItem));
        setItems(parsed);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  // Group by creditor name (normalized) and then by bureau
  const grouped: Record<string, Record<string, ReportItem[]>> = {};
  for (const item of items) {
    const key = item.creditorName.toLowerCase().trim();
    if (!grouped[key]) grouped[key] = {};
    if (!grouped[key][item.bureau]) grouped[key][item.bureau] = [];
    grouped[key][item.bureau].push(item);
  }

  const bureauItems = (bureau: string) => items.filter(i => i.bureau === bureau);

  // Find accounts only on certain bureaus (discrepancies)
  const discrepancies = Object.entries(grouped).filter(([, bureauMap]) => {
    const present = BUREAUS.filter(b => bureauMap[b]?.length > 0);
    return present.length > 0 && present.length < BUREAUS.length;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthenticatedLayout activeNav="bureaus">
      <ProGate feature="Bureau Comparison">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600 bg-clip-text text-transparent">
          Bureau Comparison
        </h1>
        <p className="text-slate-500 mb-8">
          Compare negative items across all 3 bureaus. Accounts missing from a bureau may indicate reporting discrepancies you can dispute.
        </p>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No Report Data</h3>
            <p className="text-slate-500">Upload credit reports from all 3 bureaus to see the comparison.</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
              {BUREAUS.map(bureau => {
                const bureauList = bureauItems(bureau);
                return (
                  <div key={bureau} className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
                    <p className="text-xs sm:text-sm font-semibold text-slate-700 mb-1">{bureau}</p>
                    <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-lime-500 to-teal-600 bg-clip-text text-transparent">
                      {bureauList.length}
                    </p>
                    <p className="text-xs text-slate-500">items</p>
                    <p className="text-xs text-red-600 mt-1">{bureauList.filter(i => i.isDisputable).length} disputable</p>
                  </div>
                );
              })}
            </div>

            {/* Discrepancies Alert */}
            {discrepancies.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-amber-800 mb-1 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  {discrepancies.length} Reporting Discrepancies Found
                </h3>
                <p className="text-sm text-amber-700">
                  These accounts appear on some bureaus but not others. If an account shouldn&apos;t be on a bureau, dispute it directly with that bureau.
                </p>
              </div>
            )}

            {/* Side-by-Side Table — desktop */}
            <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-4 gap-0 border-b border-slate-200 bg-slate-50">
                <div className="px-4 py-3 text-sm font-semibold text-slate-600">Creditor</div>
                {BUREAUS.map(b => (
                  <div key={b} className="px-4 py-3 text-sm font-semibold text-slate-600 border-l border-slate-200">{b}</div>
                ))}
              </div>
              <div className="divide-y divide-slate-100">
                {Object.entries(grouped).map(([key, bureauMap]) => {
                  const allItems = Object.values(bureauMap).flat();
                  const name = allItems[0]?.creditorName || key;
                  const missingBureaus = BUREAUS.filter(b => !bureauMap[b]?.length);
                  return (
                    <div key={key} className={`grid grid-cols-4 gap-0 ${missingBureaus.length > 0 ? "bg-amber-50/40" : ""}`}>
                      <div className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{name}</p>
                        {missingBureaus.length > 0 && (
                          <p className="text-xs text-amber-600 mt-0.5">Missing: {missingBureaus.join(", ")}</p>
                        )}
                      </div>
                      {BUREAUS.map(bureau => {
                        const bureauEntry = bureauMap[bureau]?.[0];
                        return (
                          <div key={bureau} className="px-4 py-3 border-l border-slate-100">
                            {bureauEntry && bureauEntry.status && bureauEntry.status.toUpperCase() !== "UNKNOWN" ? (
                              <div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  bureauEntry.status.includes("COLLECTION") ? "bg-red-100 text-red-700" :
                                  bureauEntry.status.includes("CHARGE") ? "bg-orange-100 text-orange-700" :
                                  bureauEntry.status.includes("OPEN") ? "bg-green-100 text-green-700" :
                                  bureauEntry.status.includes("CLOSED") ? "bg-slate-100 text-slate-600" :
                                  "bg-amber-100 text-amber-700"
                                }`}>
                                  {bureauEntry.status.replace(/_/g, " ")}
                                </span>
                                {bureauEntry.balance > 0 && (
                                  <p className="text-xs text-slate-600 mt-1">${bureauEntry.balance.toLocaleString()}</p>
                                )}
                                {bureauEntry.isDisputable && (
                                  <p className="text-xs text-teal-600 font-medium mt-0.5">Disputable</p>
                                )}
                              </div>
                            ) : bureauEntry ? (
                              <div>
                                <span className="text-xs text-slate-400">— on file</span>
                                {bureauEntry.balance > 0 && (
                                  <p className="text-xs text-slate-600 mt-1">${bureauEntry.balance.toLocaleString()}</p>
                                )}
                                {bureauEntry.isDisputable && (
                                  <p className="text-xs text-teal-600 font-medium mt-0.5">Disputable</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">— not reported</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile card view */}
            <div className="sm:hidden space-y-3">
              {Object.entries(grouped).map(([key, bureauMap]) => {
                const allItems = Object.values(bureauMap).flat();
                const name = allItems[0]?.creditorName || key;
                const missingBureaus = BUREAUS.filter(b => !bureauMap[b]?.length);
                return (
                  <div key={key} className={`bg-white rounded-xl border p-4 ${missingBureaus.length > 0 ? "border-amber-200 bg-amber-50/30" : "border-slate-200"}`}>
                    <p className="font-semibold text-sm text-slate-800 mb-1">{name}</p>
                    {missingBureaus.length > 0 && (
                      <p className="text-xs text-amber-600 mb-2">Missing from: {missingBureaus.join(", ")}</p>
                    )}
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {BUREAUS.map(bureau => {
                        const entry = bureauMap[bureau]?.[0];
                        return (
                          <div key={bureau} className="text-center">
                            <p className="text-xs font-medium text-slate-500 mb-1">{bureau.slice(0, 3)}</p>
                            {entry && entry.status && entry.status.toUpperCase() !== "UNKNOWN" ? (
                              <div>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                  entry.status.includes("COLLECTION") ? "bg-red-100 text-red-700" :
                                  entry.status.includes("CHARGE") ? "bg-orange-100 text-orange-700" :
                                  entry.status.includes("OPEN") ? "bg-green-100 text-green-700" :
                                  entry.status.includes("CLOSED") ? "bg-slate-100 text-slate-600" :
                                  "bg-amber-100 text-amber-700"
                                }`}>
                                  {entry.status.replace(/_/g, " ").split(" ")[0]}
                                </span>
                                {entry.balance > 0 && <p className="text-xs text-slate-600 mt-0.5">${entry.balance.toLocaleString()}</p>}
                              </div>
                            ) : entry ? (
                              <div>
                                <span className="text-xs text-slate-400">— on file</span>
                                {entry.balance > 0 && <p className="text-xs text-slate-600 mt-0.5">${entry.balance.toLocaleString()}</p>}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-slate-400 mt-4 text-center">
              Upload separate reports from each bureau for complete comparison. Reports are matched by creditor name.
            </p>
          </>
        )}
      </main>
      </ProGate>
    </AuthenticatedLayout>
  );
}

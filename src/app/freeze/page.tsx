"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";

type FreezeStatus = "frozen" | "unfrozen" | "unknown";

interface BureauFreeze {
  status: FreezeStatus;
  pin: string;
  frozenAt: string | null;
  notes: string;
}

interface FreezeDoc {
  equifax: BureauFreeze;
  experian: BureauFreeze;
  transunion: BureauFreeze;
  updatedAt: string | null;
}

const DEFAULT_BUREAU: BureauFreeze = { status: "unknown", pin: "", frozenAt: null, notes: "" };

const BUREAU_INFO = [
  {
    key: "equifax" as const,
    name: "Equifax",
    url: "https://www.equifax.com/personal/credit-report-services/credit-freeze/",
    color: "#c53030",
  },
  {
    key: "experian" as const,
    name: "Experian",
    url: "https://www.experian.com/freeze/center.html",
    color: "#1a56db",
  },
  {
    key: "transunion" as const,
    name: "TransUnion",
    url: "https://www.transunion.com/credit-freeze",
    color: "#5850ec",
  },
];

const STATUS_STYLES: Record<FreezeStatus, string> = {
  frozen: "bg-emerald-100 text-emerald-700",
  unfrozen: "bg-red-100 text-red-700",
  unknown: "bg-slate-100 text-slate-500",
};

export default function FreezePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [freeze, setFreeze] = useState<FreezeDoc>({
    equifax: { ...DEFAULT_BUREAU },
    experian: { ...DEFAULT_BUREAU },
    transunion: { ...DEFAULT_BUREAU },
    updatedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/freeze", { headers: { Authorization: `Bearer ${user.idToken}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.freeze) setFreeze(d.freeze);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const updateBureau = (bureau: keyof typeof BUREAU_INFO[0]["key"] | "equifax" | "experian" | "transunion", field: keyof BureauFreeze, value: string) => {
    setFreeze((prev) => ({
      ...prev,
      [bureau]: { ...prev[bureau as keyof FreezeDoc] as BureauFreeze, [field]: value },
    }));
  };

  const saveCard = async (bureau: "equifax" | "experian" | "transunion") => {
    if (!user) return;
    setSaving(bureau);
    const data = freeze[bureau];
    try {
      await fetch("/api/freeze", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
        body: JSON.stringify({ bureau, status: data.status, pin: data.pin, notes: data.notes }),
      });
    } catch {
      // ignore
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout activeNav="freeze">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-[#1a3fd4] border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout activeNav="freeze">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Credit Freeze Manager</h1>
        <p className="text-slate-500 text-sm mb-8 max-w-2xl">
          A credit freeze (security freeze) prevents new creditors from accessing your credit report, making it nearly impossible for identity thieves to open accounts in your name. It&apos;s free, does not affect your score, and can be lifted temporarily when you apply for credit.
        </p>

        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
          {BUREAU_INFO.map((bureau) => {
            const data = freeze[bureau.key] || { ...DEFAULT_BUREAU };
            const isFrozen = data.status === "frozen";
            const isUnfrozen = data.status === "unfrozen";

            return (
              <div key={bureau.key} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-800 text-lg">{bureau.name}</h2>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[data.status]}`}>
                    {isFrozen ? "✓ Frozen" : isUnfrozen ? "Unfrozen" : "Unknown"}
                  </span>
                </div>

                {/* Status toggle */}
                <div>
                  <p className="text-xs text-slate-500 mb-1.5 font-medium">Status</p>
                  <div className="flex gap-2">
                    {(["frozen", "unfrozen", "unknown"] as FreezeStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => updateBureau(bureau.key, "status", s)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${data.status === s ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                      >
                        {s === "frozen" ? "Frozen" : s === "unfrozen" ? "Unfrozen" : "Unknown"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frozen at */}
                {data.frozenAt && (
                  <p className="text-xs text-slate-400">
                    Frozen: {new Date(data.frozenAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}

                {/* PIN */}
                <div>
                  <p className="text-xs text-slate-500 mb-1.5 font-medium">Your PIN (stored for reference)</p>
                  <input
                    type="text"
                    placeholder="Enter your freeze PIN"
                    value={data.pin}
                    onChange={(e) => updateBureau(bureau.key, "pin", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Stored locally for your reference only.</p>
                </div>

                {/* Notes */}
                <div>
                  <p className="text-xs text-slate-500 mb-1.5 font-medium">Notes</p>
                  <textarea
                    rows={2}
                    placeholder="Any notes about this freeze..."
                    value={data.notes}
                    onChange={(e) => updateBureau(bureau.key, "notes", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => saveCard(bureau.key)}
                    disabled={saving === bureau.key}
                    className="flex-1 py-2 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
                  >
                    {saving === bureau.key ? "Saving..." : "Save"}
                  </button>
                  <a
                    href={bureau.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition text-center whitespace-nowrap"
                  >
                    {isFrozen ? "Unfreeze →" : "Freeze →"}
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <h3 className="font-semibold text-blue-800 mb-2">How to Freeze Your Credit</h3>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Click the &quot;Freeze →&quot; button next to each bureau to visit their official website.</li>
            <li>Create an account or log in with your existing credentials.</li>
            <li>Follow the bureau&apos;s process — it&apos;s free and takes just a few minutes.</li>
            <li>Save your PIN here for future reference when you need to lift the freeze temporarily.</li>
          </ol>
        </div>
      </main>
    </AuthenticatedLayout>
  );
}

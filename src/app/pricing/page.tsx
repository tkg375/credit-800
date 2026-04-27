"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/lib/use-subscription";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";

const proFeatures = [
  "Unlimited dispute letters",
  "Round 2/3 escalation letters",
  "CFPB complaint generator",
  "Credit score simulator",
  "Document vault (unlimited)",
  "Debt payoff optimizer",
  "Score tracking & charts",
  "Smart notifications",
  "Card recommendations",
  "Mail disputes via USPS ($2/letter)",
];

function statusBadge(status: string, cancelAtPeriodEnd?: boolean) {
  if (cancelAtPeriodEnd) return { label: "Cancels at period end", color: "bg-amber-100 text-amber-700" };
  switch (status) {
    case "active": return { label: "Active", color: "bg-green-100 text-green-700" };
    case "trialing": return { label: "Trial", color: "bg-teal-100 text-teal-700" };
    case "past_due": return { label: "Past Due", color: "bg-red-100 text-red-700" };
    case "canceled": return { label: "Canceled", color: "bg-slate-100 text-slate-600" };
    default: return { label: "No Plan", color: "bg-slate-100 text-slate-600" };
  }
}

function cardBrandIcon(brand: string) {
  const brands: Record<string, string> = { visa: "💳 Visa", mastercard: "💳 Mastercard", amex: "💳 Amex", discover: "💳 Discover" };
  return brands[brand.toLowerCase()] ?? `💳 ${brand}`;
}

interface SubscriptionData {
  plan: "none" | "pro" | "autopilot";
  status: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  amount?: number;
  currency?: string;
  paymentMethod?: { brand: string; last4: string; expMonth: number; expYear: number } | null;
  lastInvoiceAmount?: number | null;
  lastInvoiceDate?: string | null;
}

export default function SubscriptionPage() {
  const { user, loading: authLoading } = useAuth();
  const { plan } = useSubscription();
  const router = useRouter();
  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/stripe/subscription", { headers: { Authorization: `Bearer ${user.idToken}` } })
      .then((r) => r.json())
      .then((d) => setSub(d))
      .catch(() => setSub({ plan: "none", status: "none" }))
      .finally(() => setLoading(false));
  }, [user]);

  const openPortal = async () => {
    if (!user) return;
    setOpeningPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST", headers: { Authorization: `Bearer ${user.idToken}` } });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Could not open billing portal.");
    } catch { alert("Failed to open billing portal."); }
    finally { setOpeningPortal(false); }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const badge = statusBadge(sub?.status ?? "active", sub?.cancelAtPeriodEnd);

  return (
    <AuthenticatedLayout activeNav="pricing">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600 bg-clip-text text-transparent mb-1">
          Plan
        </h1>
        <p className="text-slate-500 mb-8 text-sm">Credit 800 is free for everyone</p>

        {/* Past-due payment banner */}
        {sub?.status === "past_due" && (
          <div className="bg-red-50 border border-red-300 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold text-red-700 mb-1">Your payment failed — access is paused</p>
              <p className="text-sm text-red-600">Update your payment method to restore full access immediately. Your data and disputes are safe.</p>
            </div>
            <button
              onClick={openPortal}
              disabled={openingPortal}
              className="shrink-0 px-5 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition disabled:opacity-50 text-sm"
            >
              {openingPortal ? "Loading..." : "Update Payment Method"}
            </button>
          </div>
        )}

        {/* Self Service plan card */}
        <div className="bg-white rounded-2xl border-2 border-teal-400 ring-1 ring-teal-400 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-slate-900">Self Service</h3>
            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">Your Plan</span>
          </div>
          <p className="text-3xl font-bold mb-1 bg-gradient-to-r from-lime-500 to-teal-600 bg-clip-text text-transparent">Free</p>
          <p className="text-xs text-slate-500 mb-5">Full DIY credit repair toolkit — no credit card required</p>
          <ul className="space-y-2 flex-1 mb-6">
            {proFeatures.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                <svg className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                {f}
              </li>
            ))}
          </ul>
          <div className="text-center text-sm text-teal-600 font-medium py-2">Active — Free</div>
        </div>

        <p className="text-xs text-slate-400 text-center mt-6">
          Credit 800 is free. Optional USPS mailing is $2/letter.
        </p>
      </main>
    </AuthenticatedLayout>
  );
}

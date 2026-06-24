"use client";

import { useState, useRef, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe, StripeElements, StripePaymentElement } from "@stripe/stripe-js";
import { invalidateSubscriptionCache } from "@/lib/use-subscription";

const autopilotFeatures = [
  "Monthly soft-pull credit report",
  "Auto-generated FCRA dispute letters",
  "Automatic USPS mailing (up to 10/mo)",
  "Hands-free VantageScore tracking",
  "FCRA-compliant full automation",
  "Priority support",
];

interface CardInfo {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  pmId: string;
}

interface UpgradeModalProps {
  onClose: () => void;
  idToken: string;
}

export function UpgradeModal({ onClose, idToken }: UpgradeModalProps) {
  const [step, setStep] = useState<"overview" | "payment">("overview");
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [existingCard, setExistingCard] = useState<CardInfo | null>(null);
  const [cardLoading, setCardLoading] = useState(true);
  const [useExisting, setUseExisting] = useState(true);

  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const paymentElRef = useRef<StripePaymentElement | null>(null);
  const paymentMountRef = useRef<HTMLDivElement | null>(null);

  // Fetch existing card on file
  useEffect(() => {
    fetch("/api/billing/card", { headers: { Authorization: `Bearer ${idToken}` } })
      .then(r => r.json())
      .then(d => { if (d.card) setExistingCard(d.card); })
      .catch(() => {})
      .finally(() => setCardLoading(false));
  }, [idToken]);

  useEffect(() => {
    if (!clientSecret || !elementsRef.current || paymentElRef.current) return;
    const tryMount = () => {
      if (paymentMountRef.current) {
        const el = elementsRef.current!.create("payment");
        paymentElRef.current = el;
        el.mount(paymentMountRef.current);
      } else {
        requestAnimationFrame(tryMount);
      }
    };
    requestAnimationFrame(tryMount);
  }, [clientSecret]);

  const handleUseExistingCard = async () => {
    if (!existingCard) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/subscription/upgrade-existing", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ paymentMethodId: existingCard.pmId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Upgrade failed. Please try again."); return; }
      invalidateSubscriptionCache();
      onClose();
      window.location.href = "/dashboard?plan=autopilot";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartPayment = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/subscription/create-intent", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!data.clientSecret) {
        setError(data.error || "Could not initialize payment. Please try again.");
        return;
      }

      setClientSecret(data.clientSecret);

      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (!stripe) throw new Error("Stripe failed to load");
      stripeRef.current = stripe;

      const elements = stripe.elements({ clientSecret: data.clientSecret, appearance: { theme: "stripe" } });
      elementsRef.current = elements;
      setStep("payment");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!stripeRef.current || !elementsRef.current) return;
    setPaymentLoading(true);
    setError("");
    try {
      const { setupIntent, error: stripeError } = await stripeRef.current.confirmSetup({
        elements: elementsRef.current,
        confirmParams: { return_url: `${window.location.origin}/dashboard?plan=autopilot` },
        redirect: "if_required",
      });

      if (stripeError) { setError(stripeError.message || "Card declined."); return; }
      if (!setupIntent) { setError("Setup failed. Please try again."); return; }

      // Upgrade subscription
      const res = await fetch("/api/stripe/subscription/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ setupIntentId: setupIntent.id }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || "Activation failed. Please contact support."); return; }

      invalidateSubscriptionCache();
      onClose();
      window.location.href = "/dashboard?plan=autopilot";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {step === "payment" && (
              <button onClick={() => setStep("overview")} className="text-slate-400 hover:text-slate-600 mr-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2 className="font-semibold text-slate-900">
              {step === "overview" ? "Upgrade to Autopilot" : "Payment Details"}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {step === "overview" && (
            <div>
              {/* Plan card */}
              <div className="bg-gradient-to-br from-teal-600 to-cyan-700 rounded-xl p-5 text-white mb-5">
                <p className="text-sm font-semibold text-teal-200 mb-1">Autopilot</p>
                <p className="text-3xl font-black">$49<span className="text-sm font-normal text-teal-200">/month</span></p>
                <p className="text-xs text-teal-300 mt-0.5">Cancel anytime · No contracts</p>
              </div>

              <ul className="space-y-2 mb-5">
                {autopilotFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <svg className="w-4 h-4 text-teal-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

              {/* Card options */}
              {!cardLoading && existingCard && (
                <div className="mb-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Payment Method</p>

                  {/* Use existing card */}
                  <button onClick={() => setUseExisting(true)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition text-left ${useExisting ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${useExisting ? "border-teal-500 bg-teal-500" : "border-slate-300"}`}>
                      {useExisting && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-9 h-6 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-xs font-bold text-slate-600 uppercase">
                        {existingCard.brand}
                      </div>
                      <span className="text-sm font-medium text-slate-800">•••• {existingCard.last4}</span>
                      <span className="text-xs text-slate-400">Exp {existingCard.expMonth}/{existingCard.expYear}</span>
                    </div>
                  </button>

                  {/* Use new card */}
                  <button onClick={() => setUseExisting(false)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition text-left ${!useExisting ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${!useExisting ? "border-teal-500 bg-teal-500" : "border-slate-300"}`}>
                      {!useExisting && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span className="text-sm text-slate-600">Use a different card</span>
                  </button>
                </div>
              )}

              <button
                onClick={existingCard && useExisting ? handleUseExistingCard : handleStartPayment}
                disabled={loading || cardLoading}
                className="w-full py-3 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] hover:opacity-90 text-white rounded-xl font-semibold transition disabled:opacity-50 text-sm">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Activating...
                  </span>
                ) : existingCard && useExisting ? "Activate Autopilot — $49/mo" : "Continue to Payment →"}
              </button>
            </div>
          )}

          {step === "payment" && (
            <div>
              <p className="text-sm text-slate-500 mb-4">Enter your payment details to activate Autopilot.</p>
              <div ref={paymentMountRef} className="mb-4 min-h-[180px]" />
              {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
              <button onClick={handleConfirm} disabled={paymentLoading}
                className="w-full py-3 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] hover:opacity-90 text-white rounded-xl font-semibold transition disabled:opacity-50 text-sm">
                {paymentLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Processing...
                  </span>
                ) : "Activate Autopilot — $49/mo"}
              </button>
              <p className="text-xs text-slate-400 text-center mt-3">🔒 Secured by Stripe · Cancel anytime</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe, StripeCardElement } from "@stripe/stripe-js";

interface BillingModalProps {
  onClose: () => void;
  cardInfo: { brand: string; last4: string; expMonth: number; expYear: number; pmId: string } | null;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  idToken: string;
  onCardUpdated: () => void;
}

export function BillingModal({ onClose, cardInfo, subscriptionStatus, currentPeriodEnd, idToken, onCardUpdated }: BillingModalProps) {
  const [view, setView] = useState<"overview" | "update-card" | "cancel">("overview");
  const [cardSaving, setCardSaving] = useState(false);
  const [cardError, setCardError] = useState("");
  const [cardSuccess, setCardSuccess] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelDone, setCancelDone] = useState(false);

  const cardElementRef = useRef<StripeCardElement | null>(null);
  const cardMountRef = useRef<HTMLDivElement | null>(null);
  const stripeRef = useRef<Stripe | null>(null);

  // Mount card element when update-card view is shown
  useEffect(() => {
    if (view !== "update-card") return;

    let mounted = true;
    const tryMount = async () => {
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (!stripe || !mounted) return;
      stripeRef.current = stripe;

      const tryAttach = () => {
        if (cardMountRef.current && !cardElementRef.current) {
          const elements = stripe.elements();
          const el = elements.create("card", {
            style: {
              base: { fontSize: "15px", color: "#1e293b", "::placeholder": { color: "#94a3b8" } },
            },
          });
          cardElementRef.current = el;
          el.mount(cardMountRef.current);
        } else if (!cardMountRef.current) {
          requestAnimationFrame(tryAttach);
        }
      };
      requestAnimationFrame(tryAttach);
    };
    tryMount();

    return () => {
      mounted = false;
      if (cardElementRef.current) {
        cardElementRef.current.destroy();
        cardElementRef.current = null;
      }
    };
  }, [view]);

  const handleUpdateCard = async () => {
    if (!stripeRef.current || !cardElementRef.current) return;
    setCardSaving(true);
    setCardError("");
    try {
      // Get setup intent
      const setupRes = await fetch("/api/billing/setup-intent", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const { clientSecret } = await setupRes.json();

      const { setupIntent, error } = await stripeRef.current.confirmCardSetup(clientSecret, {
        payment_method: { card: cardElementRef.current },
      });

      if (error) { setCardError(error.message || "Card declined."); return; }
      if (!setupIntent?.payment_method) { setCardError("Setup failed."); return; }

      // Confirm new card — pass the payment method ID directly
      const confirmRes = await fetch("/api/billing/confirm-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ paymentMethodId: setupIntent.payment_method }),
      });

      if (!confirmRes.ok) { setCardError("Failed to update card. Please try again."); return; }

      setCardSuccess(true);
      onCardUpdated();
      setTimeout(() => { setCardSuccess(false); setView("overview"); }, 1500);
    } catch { setCardError("Something went wrong. Please try again."); }
    finally { setCardSaving(false); }
  };

  const handleCancel = async () => {
    setCanceling(true);
    setCancelError("");
    try {
      const res = await fetch("/api/stripe/subscription/cancel", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        const d = await res.json();
        setCancelError(d.error || "Failed to cancel. Please contact support.");
        return;
      }
      setCancelDone(true);
      onCardUpdated();
    } catch { setCancelError("Something went wrong. Please contact support."); }
    finally { setCanceling(false); }
  };

  const periodEnd = currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {view !== "overview" && (
              <button onClick={() => { setView("overview"); setCardError(""); setCancelError(""); }}
                className="text-slate-400 hover:text-slate-600 mr-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2 className="font-semibold text-slate-900">
              {view === "overview" ? "Manage Billing" : view === "update-card" ? "Update Payment Method" : "Cancel Subscription"}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">

          {/* Overview */}
          {view === "overview" && (
            <div className="space-y-5">
              {/* Plan */}
              <div className="bg-gradient-to-br from-teal-600 to-cyan-700 rounded-xl p-4 text-white">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold">Autopilot</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${subscriptionStatus === "active" ? "bg-lime-400 text-slate-900" : "bg-red-400 text-white"}`}>
                    {subscriptionStatus === "active" ? "Active" : subscriptionStatus}
                  </span>
                </div>
                <p className="text-2xl font-black">$49<span className="text-sm font-normal text-teal-200">/month</span></p>
                {periodEnd && <p className="text-xs text-teal-300 mt-1">Renews {periodEnd}</p>}
              </div>

              {/* Card on file */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Payment Method</p>
                {cardInfo ? (
                  <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-7 bg-white border border-slate-200 rounded flex items-center justify-center text-xs font-bold text-slate-600 uppercase">
                        {cardInfo.brand}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">•••• {cardInfo.last4}</p>
                        <p className="text-xs text-slate-400">Expires {cardInfo.expMonth}/{cardInfo.expYear}</p>
                      </div>
                    </div>
                    <button onClick={() => setView("update-card")}
                      className="text-sm text-teal-600 hover:text-teal-700 font-medium transition">
                      Update
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <p className="text-sm text-slate-500">No card on file</p>
                    <button onClick={() => setView("update-card")} className="text-sm text-teal-600 hover:text-teal-700 font-medium">Add Card</button>
                  </div>
                )}
              </div>

              {/* Cancel */}
              <div className="pt-2 border-t border-slate-100">
                <button onClick={() => setView("cancel")}
                  className="w-full py-2.5 text-sm text-red-500 hover:text-red-600 font-medium transition">
                  Cancel Subscription
                </button>
              </div>
            </div>
          )}

          {/* Update Card */}
          {view === "update-card" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">Enter your new card details below.</p>
              <div ref={cardMountRef} className="w-full px-3 py-3 rounded-xl border border-slate-300 bg-white min-h-[44px]" />
              {cardError && <p className="text-sm text-red-500">{cardError}</p>}
              {cardSuccess && <p className="text-sm text-teal-600 font-medium">✓ Card updated successfully!</p>}
              <button onClick={handleUpdateCard} disabled={cardSaving}
                className="w-full py-3 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 text-sm">
                {cardSaving ? "Saving..." : "Save New Card"}
              </button>
            </div>
          )}

          {/* Cancel */}
          {view === "cancel" && (
            <div className="space-y-4">
              {cancelDone ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="font-semibold text-slate-900 mb-1">Subscription Canceled</p>
                  <p className="text-sm text-slate-500">Your access continues until {periodEnd ?? "the end of your billing period"}.</p>
                  <button onClick={onClose} className="mt-4 px-6 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition">Close</button>
                </div>
              ) : (
                <>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="font-semibold text-red-700 mb-1 text-sm">Cancel Autopilot?</p>
                    <p className="text-sm text-red-600">Your subscription will end on {periodEnd ?? "your next billing date"}. Autopilot will stop running and you'll lose automated dispute mailing.</p>
                  </div>
                  {cancelError && <p className="text-sm text-red-500">{cancelError}</p>}
                  <button onClick={handleCancel} disabled={canceling}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition disabled:opacity-50 text-sm">
                    {canceling ? "Canceling..." : "Yes, Cancel Subscription"}
                  </button>
                  <button onClick={() => setView("overview")}
                    className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-700 transition">
                    Keep My Subscription
                  </button>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

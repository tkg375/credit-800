"use client";

import { useState, useRef, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe, StripeCardElement } from "@stripe/stripe-js";

interface BillingModalProps {
  onClose: () => void;
  cardInfo: { brand: string; last4: string; expMonth: number; expYear: number; pmId: string } | null;
  idToken: string;
  onCardUpdated: () => void;
}

export function BillingModal({ onClose, cardInfo, idToken, onCardUpdated }: BillingModalProps) {
  const [view, setView] = useState<"overview" | "update-card">(cardInfo ? "overview" : "update-card");
  const [cardSaving, setCardSaving] = useState(false);
  const [cardError, setCardError] = useState("");
  const [cardSuccess, setCardSuccess] = useState(false);
  const [removing, setRemoving] = useState(false);

  const cardElementRef = useRef<StripeCardElement | null>(null);
  const cardMountRef = useRef<HTMLDivElement | null>(null);
  const stripeRef = useRef<Stripe | null>(null);

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

  const handleSaveCard = async () => {
    if (!stripeRef.current || !cardElementRef.current) return;
    setCardSaving(true);
    setCardError("");
    try {
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

      const confirmRes = await fetch("/api/billing/confirm-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ paymentMethodId: setupIntent.payment_method }),
      });

      if (!confirmRes.ok) { setCardError("Failed to save card. Please try again."); return; }

      setCardSuccess(true);
      onCardUpdated();
      setTimeout(() => { setCardSuccess(false); onClose(); }, 1500);
    } catch { setCardError("Something went wrong. Please try again."); }
    finally { setCardSaving(false); }
  };

  const handleRemoveCard = async () => {
    setRemoving(true);
    try {
      await fetch("/api/billing/card", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      onCardUpdated();
      onClose();
    } catch { setCardError("Failed to remove card."); }
    finally { setRemoving(false); }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {view === "update-card" && cardInfo && (
              <button onClick={() => { setView("overview"); setCardError(""); }}
                className="text-slate-400 hover:text-slate-600 mr-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2 className="font-semibold text-slate-900">
              {view === "overview" ? "Payment Method" : cardInfo ? "Update Card" : "Add Payment Method"}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {view === "overview" && cardInfo && (
            <div className="space-y-5">
              <p className="text-sm text-slate-500">Your card is saved for the $2 physical mailing fee when you send dispute letters via USPS.</p>
              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-200">
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
              <button
                onClick={handleRemoveCard}
                disabled={removing}
                className="w-full py-2.5 text-sm text-red-500 hover:text-red-600 font-medium transition disabled:opacity-50"
              >
                {removing ? "Removing..." : "Remove Card"}
              </button>
            </div>
          )}

          {view === "update-card" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                {cardInfo ? "Enter your new card details below." : "Add a card to use for the $2 USPS mailing fee when sending physical dispute letters."}
              </p>
              <div ref={cardMountRef} className="w-full px-3 py-3 rounded-xl border border-slate-300 bg-white min-h-[44px]" />
              {cardError && <p className="text-sm text-red-500">{cardError}</p>}
              {cardSuccess && <p className="text-sm text-teal-600 font-medium">✓ Card saved!</p>}
              <button
                onClick={handleSaveCard}
                disabled={cardSaving}
                className="w-full py-3 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 text-sm"
              >
                {cardSaving ? "Saving..." : "Save Card"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { useSubscription } from "@/lib/use-subscription";
import { BillingModal } from "@/components/BillingModal";
import { UpgradeModal } from "@/components/UpgradeModal";
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe, StripeCardElement } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function ProfilePage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { plan, isAutopilot, status } = useSubscription();
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelMsg, setCancelMsg] = useState("");
  const [subPeriodEnd, setSubPeriodEnd] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isAutopilot) return;
    fetch("/api/stripe/subscription", { headers: { Authorization: `Bearer ${user.idToken}` } })
      .then(r => r.json())
      .then(d => setSubPeriodEnd(d.currentPeriodEnd ?? null))
      .catch(() => {});
  }, [user, isAutopilot]);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");
  // Form fields
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [ssnLast4, setSsnLast4] = useState("");

  // Payment method state
  const [cardInfo, setCardInfo] = useState<{ brand: string; last4: string; expMonth: number; expYear: number; pmId: string } | null>(null);
  const [cardLoading, setCardLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardSaving, setCardSaving] = useState(false);
  const [cardError, setCardError] = useState("");
  const [cardSuccess, setCardSuccess] = useState(false);
  const cardElementRef = useRef<StripeCardElement | null>(null);
  const cardMountRef = useRef<HTMLDivElement | null>(null);
  const stripeRef = useRef<Stripe | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!user) return;

    fetch("/api/users/profile", {
      headers: { Authorization: `Bearer ${user.idToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const p = data.profile;
        if (p) {
          setFullName(p.fullName || "");
          setDateOfBirth(p.dateOfBirth || "");
          setPhone(p.phone || "");
          setAddress(p.address || "");
          setAddress2(p.address2 || "");
          setCity(p.city || "");
          setState(p.state || "");
          setZip(p.zip || "");
          setSsnLast4(p.ssnLast4 || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  // Load card on file
  useEffect(() => {
    if (!user) return;
    fetch("/api/billing/card", { headers: { Authorization: `Bearer ${user.idToken}` } })
      .then((r) => r.json())
      .then((d) => setCardInfo(d.card || null))
      .catch(() => {})
      .finally(() => setCardLoading(false));
  }, [user]);

  // Mount Stripe card element when add-card panel opens
  useEffect(() => {
    if (!showAddCard || !cardMountRef.current) return;
    let mounted = true;
    stripePromise.then((s) => {
      if (!s || !mounted || !cardMountRef.current) return;
      stripeRef.current = s;
      const elements = s.elements();
      const el = elements.create("card", {
        style: { base: { fontSize: "15px", color: "#0f172a", "::placeholder": { color: "#94a3b8" } } },
      });
      el.mount(cardMountRef.current);
      cardElementRef.current = el;
    });
    return () => {
      mounted = false;
      cardElementRef.current?.destroy();
      cardElementRef.current = null;
    };
  }, [showAddCard]);

  const handleSaveCard = async () => {
    if (!user || !stripeRef.current || !cardElementRef.current) return;
    setCardSaving(true);
    setCardError("");
    try {
      const siRes = await fetch("/api/billing/setup-intent", {
        method: "POST",
        headers: { Authorization: `Bearer ${user.idToken}` },
      });
      const siData = await siRes.json();
      if (!siRes.ok) throw new Error(siData.error || "Failed to create setup");

      const { error: stripeError, setupIntent } = await stripeRef.current.confirmCardSetup(siData.clientSecret, {
        payment_method: { card: cardElementRef.current },
      });
      if (stripeError) throw new Error(stripeError.message);
      if (!setupIntent?.payment_method) throw new Error("Setup failed");

      const pmId = typeof setupIntent.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent.payment_method.id;

      await fetch("/api/billing/confirm-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
        body: JSON.stringify({ paymentMethodId: pmId }),
      });

      // Refresh card info
      const cardRes = await fetch("/api/billing/card", { headers: { Authorization: `Bearer ${user.idToken}` } });
      const cardData = await cardRes.json();
      setCardInfo(cardData.card || null);
      setCardSuccess(true);
      setShowAddCard(false);
      setTimeout(() => setCardSuccess(false), 3000);
    } catch (err) {
      setCardError(err instanceof Error ? err.message : "Failed to save card");
    } finally {
      setCardSaving(false);
    }
  };

  const handleRemoveCard = async () => {
    if (!user || !confirm("Remove your saved card?")) return;
    setCardSaving(true);
    try {
      await fetch("/api/billing/card", { method: "DELETE", headers: { Authorization: `Bearer ${user.idToken}` } });
      setCardInfo(null);
    } catch {
      setCardError("Failed to remove card");
    } finally {
      setCardSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError("");
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/users/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.idToken}`,
        },
        body: JSON.stringify({ fullName, dateOfBirth, phone, address, address2, city, state, zip, ssnLast4 }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save");
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!user) return;
    setResetting(true);
    setResetMessage("");
    try {
      const res = await fetch("/api/reports/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset data");
      setResetMessage(data.message);
      if (data.remaining <= 0) {
        setTimeout(() => { setResetting(false); setResetMessage(""); }, 3000);
      } else {
        setResetting(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset data");
      setResetting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmText !== "DELETE") return;
    setDeleting(true);
    setError("");
    try {
      await fetch("/api/users/delete", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user.idToken}` },
      });

      await signOut();
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
      setDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1a3fd4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthenticatedLayout activeNav="profile">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] bg-clip-text text-transparent mb-1">
          My Profile
        </h1>
        <p className="text-slate-500 mb-8 text-sm">Manage your account information</p>

        <div className="grid lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">

        {/* Account Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1a3fd4] to-[#00d4aa] flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {(fullName || user?.email || "?")[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-lg">{fullName || "No name set"}</p>
              <p className="text-slate-500 text-sm">{user?.email}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                placeholder="(555) 000-0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SSN Last 4 Digits</label>
              <input
                type="password"
                inputMode="numeric"
                value={ssnLast4}
                onChange={(e) => setSsnLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                placeholder="••••"
                maxLength={4}
              />
              <p className="text-xs text-slate-400 mt-1">Used on dispute letters for identity verification. Never stored in plain view.</p>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold mb-4">Mailing Address</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Street Address</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                placeholder="123 Main St"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Apt / Suite (optional)</label>
              <input
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                placeholder="Apt 4B"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                placeholder="New York"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                  placeholder="NY"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ZIP</label>
                <input
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                  placeholder="10001"
                  maxLength={10}
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {saving ? "Saving..." : saveSuccess ? "✓ Saved!" : "Save Changes"}
        </button>

        </div>{/* end left column */}

        {/* Right column */}
        <div className="space-y-6">

        {/* Payment Method — hidden for Autopilot (managed via Billing Modal) */}
        {!isAutopilot && (
        <div id="payment" className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold mb-1">Payment Method</h2>
          <p className="text-sm text-slate-500 mb-4">
            {isAutopilot
              ? "Used for your Autopilot subscription ($49/month)."
              : "Used for the $2/letter USPS mailing fee. No charge until you mail."}
          </p>

          {cardLoading ? (
            <div className="h-10 flex items-center"><div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : cardInfo ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-7 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-xs font-bold text-slate-600 uppercase">
                  {cardInfo.brand}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">•••• {cardInfo.last4}</p>
                  <p className="text-xs text-slate-500">Expires {cardInfo.expMonth}/{cardInfo.expYear}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {cardSuccess && <span className="text-teal-600 text-sm">✓ Saved!</span>}
                <button onClick={() => setShowAddCard(true)} className="text-sm text-teal-600 hover:text-teal-500 font-medium">Replace</button>
                {!isAutopilot && <button onClick={handleRemoveCard} disabled={cardSaving} className="text-sm text-red-500 hover:text-red-400 font-medium">Remove</button>}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-slate-500">No card on file.</p>
              <button
                onClick={() => setShowAddCard(true)}
                className="px-4 py-2 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-lg text-sm font-medium hover:opacity-90 transition"
              >
                Add Card
              </button>
            </div>
          )}

          {showAddCard && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-700 mb-3">Enter card details</p>
              <div
                ref={cardMountRef}
                className="w-full px-3 py-3 rounded-lg border border-slate-300 bg-white text-sm min-h-[42px]"
              />
              {cardError && <p className="mt-2 text-sm text-red-500">{cardError}</p>}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSaveCard}
                  disabled={cardSaving}
                  className="px-4 py-2 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
                >
                  {cardSaving ? "Saving..." : "Save Card"}
                </button>
                <button
                  onClick={() => { setShowAddCard(false); setCardError(""); }}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Subscription */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">Subscription</h2>
              <p className="text-sm text-slate-500 mt-0.5">Your current plan</p>
            </div>
            {isAutopilot ? (
              <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-[#1a3fd4] rounded-full">Autopilot</span>
            ) : (
              <span className="text-xs font-bold px-2.5 py-1 bg-lime-100 text-lime-700 rounded-full">Self Service</span>
            )}
          </div>

          {isAutopilot ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Plan</span>
                <span className="font-medium text-slate-800">Autopilot — $49/mo</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Status</span>
                <span className={`font-medium ${status === "active" ? "text-green-600" : status === "past_due" ? "text-red-600" : "text-slate-600"}`}>
                  {status === "active" ? "Active" : status === "past_due" ? "Past Due" : status}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowBillingModal(true)}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  Manage Billing →
                </button>
              </div>
              {cancelMsg && (
                <p className={`text-sm mt-3 font-medium ${cancelMsg.startsWith("✓") ? "text-emerald-600" : "text-red-500"}`}>{cancelMsg}</p>
              )}
              {!cancelConfirm ? (
                <button
                  onClick={() => setCancelConfirm(true)}
                  className="mt-4 text-sm text-red-400 hover:text-red-600 transition"
                >
                  Cancel subscription
                </button>
              ) : (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-700 mb-3 font-medium">Are you sure? You'll keep access until the end of your billing period.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        setCanceling(true);
                        setCancelMsg("");
                        try {
                          const res = await fetch("/api/stripe/subscription/cancel", {
                            method: "POST",
                            headers: { Authorization: `Bearer ${user!.idToken}` },
                          });
                          const data = await res.json();
                          if (res.ok) {
                            setCancelMsg("✓ Subscription canceled. You'll keep access until your billing period ends.");
                            setCancelConfirm(false);
                          } else {
                            setCancelMsg(data.error || "Failed to cancel. Please try again.");
                          }
                        } catch {
                          setCancelMsg("Network error. Please try again.");
                        } finally {
                          setCanceling(false);
                        }
                      }}
                      disabled={canceling}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
                    >
                      {canceling ? "Canceling…" : "Yes, cancel"}
                    </button>
                    <button
                      onClick={() => setCancelConfirm(false)}
                      className="px-4 py-2 border border-slate-200 text-sm font-medium rounded-lg hover:bg-slate-50 transition"
                    >
                      Keep subscription
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-500 mb-4">You're on the free Self Service plan. Upgrade to Autopilot to let us handle everything automatically.</p>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-lg text-sm font-medium hover:opacity-90 transition"
              >
                Upgrade to Autopilot →
              </button>
            </div>
          )}
        </div>

        {/* Reset All Data */}
        <div className="bg-white rounded-2xl border border-orange-200 p-6">
          <h2 className="font-semibold text-orange-600 mb-1">Reset All Data</h2>
          <p className="text-sm text-slate-500 mb-4">
            Clear all your credit reports, disputes, scores, and analysis data to start fresh. Your account will remain active.
          </p>
          {resetMessage && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
              {resetMessage}
            </div>
          )}
          <button
            onClick={handleReset}
            disabled={resetting}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2"
          >
            {resetting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Reset All Data
              </>
            )}
          </button>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl border border-red-200 p-6">
          <h2 className="font-semibold text-red-600 mb-1">Danger Zone</h2>
          <p className="text-sm text-slate-500 mb-4">
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">
                This will permanently delete all your disputes, credit reports, scores, and account data.
                Type <span className="font-mono font-bold">DELETE</span> to confirm.
              </p>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm font-mono"
                placeholder="DELETE"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "DELETE" || deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-40"
                >
                  {deleting ? "Deleting..." : "Permanently Delete"}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        </div>{/* end right column */}
        </div>{/* end grid */}
      </main>

      {showUpgradeModal && user && (
        <UpgradeModal
          onClose={() => setShowUpgradeModal(false)}
          idToken={user.idToken}
        />
      )}

      {showBillingModal && user && (
        <BillingModal
          onClose={() => setShowBillingModal(false)}
          cardInfo={cardInfo}
          subscriptionStatus={status}
          currentPeriodEnd={subPeriodEnd}
          idToken={user.idToken}
          onCardUpdated={() => {
            setShowBillingModal(false);
            fetch("/api/billing/card", { headers: { Authorization: `Bearer ${user.idToken}` } })
              .then(r => r.json())
              .then(d => { if (d.card) setCardInfo(d.card); })
              .catch(() => {});
          }}
        />
      )}
    </AuthenticatedLayout>
  );
}

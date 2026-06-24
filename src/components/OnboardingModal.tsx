"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "credit800_onboarded";

const STEPS = [
  {
    title: "Upload Your Credit Report",
    subtitle: "Start with a full picture",
    description:
      "Upload a PDF of your credit report from Equifax, Experian, or TransUnion. Credit 800 will analyze every account and identify everything that can be disputed or improved.",
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
    cta: "Go to Upload",
    ctaHref: "/upload",
    tip: "Get a free report at AnnualCreditReport.com",
  },
  {
    title: "Review Disputable Items",
    subtitle: "See what can be removed",
    description:
      "After your report is analyzed, we'll show you every item that can be challenged — collections, late payments, charge-offs, and more. Each one comes with our recommended removal strategy.",
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    cta: "View Disputes",
    ctaHref: "/disputes",
    tip: "Items over 7 years old must be removed — that's federal law",
  },
  {
    title: "Send Your Dispute Letter",
    subtitle: "Take action in minutes",
    description:
      "We'll generate a personalized, FCRA-compliant dispute letter for each item. You can download it, copy it, or mail it directly to the credit bureau or collector via USPS — all from this app.",
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    cta: "Start Disputing",
    ctaHref: "/disputes",
    tip: "Bureaus are required by law to respond within 30 days",
  },
];

export function OnboardingModal() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // If already dismissed this session, skip the API check
    if (localStorage.getItem(STORAGE_KEY)) return;

    let cancelled = false;

    async function checkReports() {
      try {
        const res = await fetch("/api/data/creditReports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 1 }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const hasReports = Array.isArray(data.documents) && data.documents.length > 0;
        if (hasReports) {
          // User has reports — permanently suppress the modal
          localStorage.setItem(STORAGE_KEY, "true");
          return;
        }
        // No reports yet — show onboarding after a short delay
        setTimeout(() => {
          if (!cancelled) setVisible(true);
        }, 800);
      } catch {
        // Network error — don't show the modal
      }
    }

    checkReports();
    return () => { cancelled = true; };
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  const handleCta = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    router.push(STEPS[step].ctaHref);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleCta();
    }
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Top gradient bar */}
        <div className="h-1 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa]" />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Getting Started — Step {step + 1} of {STEPS.length}
          </p>
          <button
            onClick={dismiss}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step progress */}
        <div className="px-6 mb-6">
          <div className="flex gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-all ${
                  i <= step
                    ? "bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa]"
                    : "bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {/* Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-lime-50 to-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mb-5 mx-auto">
            {current.icon}
          </div>

          {/* Text */}
          <div className="text-center mb-6">
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1">
              {current.subtitle}
            </p>
            <h2 className="text-xl font-bold text-slate-900 mb-3">{current.title}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{current.description}</p>
          </div>

          {/* Tip */}
          <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 mb-6 flex items-start gap-2">
            <span className="text-teal-500 text-sm shrink-0 mt-0.5">💡</span>
            <p className="text-xs text-teal-700">{current.tip}</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleNext}
              className="w-full py-3 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl font-semibold hover:opacity-90 transition text-sm"
            >
              {isLast ? `${current.cta} →` : "Next"}
            </button>
            {!isLast && (
              <button
                onClick={handleCta}
                className="w-full py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition"
              >
                {current.cta} →
              </button>
            )}
            <button
              onClick={dismiss}
              className="text-xs text-slate-400 hover:text-slate-600 transition py-1"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { useSubscription } from "@/lib/use-subscription";
import { GetStartedButton, LogInButton } from "@/components/AuthModalButtons";

const features = [
  "Unlimited dispute letters",
  "Score simulator",
  "CFPB complaint generator",
  "Document vault",
  "Debt payoff optimizer",
  "Utilization tracker",
  "Bureau comparison",
  "Priority analysis",
  "Mail disputes via USPS ($2/letter)",
];

export function ProGate({ children, feature }: { children: ReactNode; feature?: string }) {
  const { isPro, loading } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isPro) return <>{children}</>;

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <div className="w-full max-w-lg text-center">
        {/* Lock icon */}
        <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-gradient-to-br from-lime-100 to-teal-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {feature ? `${feature} Requires an Account` : "Account Required"}
        </h2>
        <p className="text-slate-500 text-sm mb-8">
          Create a free account to unlock every tool on the platform.
        </p>

        {/* Feature grid */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-left">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                <svg className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing */}
        <div className="mb-6">
          <span className="text-3xl font-bold text-slate-900">Free</span>
        </div>

        <GetStartedButton className="block w-full py-3 bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600 hover:from-lime-400 hover:via-teal-400 hover:to-cyan-500 text-white rounded-xl font-medium transition text-sm">
          Get Started — Free
        </GetStartedButton>
        <p className="text-xs text-slate-400 mt-3">Already have an account? <LogInButton className="text-teal-600 hover:underline">Sign in</LogInButton></p>
      </div>
    </div>
  );
}

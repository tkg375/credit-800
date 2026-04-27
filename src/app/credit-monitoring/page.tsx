"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";

export default function CreditMonitoringPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthenticatedLayout activeNav="credit-monitoring">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 border border-teal-200 rounded-full text-teal-700 text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
            Coming Soon
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Credit Monitoring</h1>
          <p className="text-slate-500 text-base max-w-xl">
            Automated 24/7 credit monitoring powered by Autopilot — get real-time alerts when anything changes on your report.
          </p>
        </div>

        {/* Feature preview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {[
            {
              icon: "📡",
              title: "Real-Time Alerts",
              desc: "Instant notifications when new accounts, hard inquiries, or derogatory marks appear on your report.",
            },
            {
              icon: "🤖",
              title: "Autopilot Integration",
              desc: "Autopilot automatically disputes new negative items the moment they're detected — no action needed from you.",
            },
            {
              icon: "📈",
              title: "Score Change Tracking",
              desc: "Track every point gained or lost with a full timeline of what caused each score movement.",
            },
            {
              icon: "🛡️",
              title: "Fraud Detection",
              desc: "Identify suspicious new accounts or inquiries that may indicate identity theft before they do damage.",
            },
            {
              icon: "📋",
              title: "Monthly Report Summaries",
              desc: "A full credit health report delivered to your inbox every month with action items prioritized for you.",
            },
            {
              icon: "⚡",
              title: "Dispute Automation",
              desc: "When Autopilot spots an error, it generates, sends, and tracks a dispute letter automatically.",
            },
          ].map((feature) => (
            <div key={feature.title} className="bg-white border border-slate-200 rounded-xl p-5 flex gap-4">
              <span className="text-2xl shrink-0 mt-0.5">{feature.icon}</span>
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA / waitlist banner */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-8 text-center text-white">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Autopilot is on its way</h2>
          <p className="text-white/80 text-sm max-w-md mx-auto mb-6">
            Credit Monitoring will be the core of the Autopilot plan — fully hands-free credit repair that works around the clock.
          </p>
        </div>
      </main>
    </AuthenticatedLayout>
  );
}

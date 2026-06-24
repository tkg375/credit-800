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
        <div className="w-12 h-12 border-4 border-[#1a3fd4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthenticatedLayout activeNav="scores">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 border border-teal-200 rounded-full text-teal-700 text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
            Coming Soon
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Credit Monitoring</h1>
          <p className="text-slate-500 text-base max-w-xl">
            Get real-time alerts when anything changes on your credit report — new accounts, inquiries, derogatory marks, and more.
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
              title: "Dispute Readiness",
              desc: "When a new negative item is detected, get a pre-drafted dispute letter ready to send with one click.",
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
              title: "Instant Dispute Generation",
              desc: "When an error is spotted, generate a ready-to-send FCRA-compliant dispute letter instantly.",
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
        <div className="bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] rounded-2xl p-8 text-center text-white">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Credit Monitoring Coming Soon</h2>
          <p className="text-white/80 text-sm max-w-md mx-auto mb-6">
            Full credit monitoring is coming soon — automated alerts and real-time tracking for your credit profile.
          </p>
        </div>
      </main>
    </AuthenticatedLayout>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";

export default function MonitoringPage() {
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
    <AuthenticatedLayout activeNav="monitoring">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 border border-teal-200 rounded-full text-teal-700 text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
            Coming Soon
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Identity Monitoring</h1>
          <p className="text-slate-500 text-base max-w-xl">
            Stay ahead of identity theft with continuous dark web scanning and breach detection tied to your email and personal info.
          </p>
        </div>

        {/* Feature preview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {[
            {
              icon: "🔍",
              title: "Dark Web Scanning",
              desc: "Continuously scans dark web marketplaces and breach databases for your email, phone, and personal data.",
            },
            {
              icon: "⚠️",
              title: "Breach Alerts",
              desc: "Instant notifications when your credentials appear in a new data breach so you can act before damage is done.",
            },
            {
              icon: "🪪",
              title: "SSN Monitoring",
              desc: "Detects when your Social Security Number is used to open new accounts or apply for credit.",
            },
            {
              icon: "📍",
              title: "Address Change Alerts",
              desc: "Get alerted if someone attempts to redirect your mail or update your address with a creditor.",
            },
            {
              icon: "🔐",
              title: "Password Exposure Detection",
              desc: "Know when your passwords have been leaked so you can update them before your accounts are compromised.",
            },
            {
              icon: "📞",
              title: "Phone & Email Takeover",
              desc: "Monitor for SIM swap attempts and unauthorized email account access tied to your identity.",
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

        {/* CTA banner */}
        <div className="bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] rounded-2xl p-8 text-center text-white">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Full identity protection is coming</h2>
          <p className="text-white/80 text-sm max-w-md mx-auto mb-6">
            Full identity monitoring is coming soon.
          </p>
        </div>
      </main>
    </AuthenticatedLayout>
  );
}

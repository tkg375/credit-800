"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { GetStartedButton, LogInButton } from "@/components/AuthModalButtons";

const resources = [
  { href: "/sample-letters", label: "Sample Dispute Letters" },
  { href: "/glossary", label: "Credit Glossary" },
  { href: "/faq", label: "FAQ" },
  { href: "/plans", label: "Plans & Pricing" },
];

const company = [
  { href: "/about", label: "About" },
  { href: "/support", label: "Support" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <Link href="/"><Logo className="h-10 w-auto mb-3" /></Link>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
              Smarter tools to dispute credit errors, manage your finances, and build toward an 800 credit score.
            </p>
            <p className="text-xs text-slate-400 mt-3">
              Not a credit repair organization. Educational tool only.
            </p>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">Resources</h3>
            <ul className="space-y-2.5">
              {resources.map((r) => (
                <li key={r.href}>
                  <Link
                    href={r.href}
                    className="text-xs text-slate-500 hover:text-teal-600 transition"
                  >
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">Company</h3>
            <ul className="space-y-2.5">
              {company.map((c) => (
                <li key={c.href}>
                  <Link
                    href={c.href}
                    className="text-xs text-slate-500 hover:text-teal-600 transition"
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Get Started */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">Get Started</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Upload your credit report and get personalized dispute letters and an action plan.
            </p>
            <GetStartedButton className="inline-block px-4 py-2 text-xs font-medium bg-gradient-to-r from-lime-500 to-teal-500 text-white rounded-lg hover:from-lime-400 hover:to-teal-400 transition">
              Get Started
            </GetStartedButton>
            <div className="mt-6">
              <p className="text-xs text-slate-400 mb-2">Already have an account?</p>
              <LogInButton className="text-xs text-teal-600 hover:text-teal-700 font-medium transition">
                Log in →
              </LogInButton>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-100 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Credit 800. All rights reserved.
          </p>
          <a
            href="https://theweekendweb.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-500 transition"
          >
            <span>Built by</span>
            <span className="font-mono">
              <span className="text-slate-500">&lt;</span>
              <span className="text-violet-400">tww</span>
              <span className="text-cyan-400">/</span>
              <span className="text-slate-500">&gt;</span>
            </span>
            <span>The Weekend Web</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/lib/use-subscription";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";

function ReportIssueModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [issue, setIssue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue.trim() || !user) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/support/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
        body: JSON.stringify({ issue, page: window.location.pathname }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">Report an Issue</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition text-2xl leading-none">×</button>
        </div>
        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2">Report Sent</h3>
            <p className="text-slate-500 text-sm mb-6">Thanks for letting us know. We&apos;ll look into it as soon as possible.</p>
            <button onClick={onClose} className="px-6 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-sm text-slate-500">Describe the issue you&apos;re experiencing. Your account ID will be included automatically so we can investigate.</p>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
            )}
            <textarea
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              placeholder="e.g. The dispute letter won't download, or the upload page shows an error..."
              rows={5}
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            />
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting || !issue.trim()}
                className="flex-1 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Send Report"}
              </button>
              <button type="button" onClick={onClose} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

type NavItem = "dashboard" | "upload" | "tools" | "disputes" | "plan" | "scores" | "simulator" | "education" | "vault" | "payoff" | "recommendations" | "cfpb" | "pricing" | "bureaus" | "profile" | "calendar" | "investing" | "portfolio" | "budget" | "goals" | "readiness" | "templates" | "freeze" | "credit-builder" | "monitoring" | "credit-monitoring" | "analyze-letter" | "autopilot";

interface NavEntry {
  href: string;
  label: string;
  key: NavItem;
  icon: ReactNode;
}

function Icon({ d }: { d: string }) {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
    </svg>
  );
}

const sections: { label: string; items: NavEntry[] }[] = [
  {
    label: "Dashboard",
    items: [
      { href: "/dashboard", label: "Dashboard", key: "dashboard", icon: <Icon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
    ],
  },
  {
    label: "Analysis",
    items: [
      { href: "/upload", label: "Upload Credit Report", key: "upload", icon: <Icon d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /> },
      { href: "/analyze-letter", label: "Analyze Letter", key: "analyze-letter", icon: <Icon d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
    ],
  },
  {
    label: "Monitoring",
    items: [
      { href: "/scores", label: "Scores", key: "scores", icon: <Icon d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /> },
      { href: "/disputes", label: "Disputes", key: "disputes", icon: <Icon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
      { href: "/goals", label: "Goals", key: "goals", icon: <Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> },
      { href: "/calendar", label: "Timeline", key: "calendar", icon: <Icon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
      { href: "/simulator", label: "Score Simulator", key: "simulator", icon: <Icon d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /> },
      { href: "/bureaus", label: "Bureau Comparison", key: "bureaus", icon: <Icon d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /> },
    ],
  },
  {
    label: "Finances",
    items: [
      { href: "/readiness", label: "Loan Readiness", key: "readiness", icon: <Icon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
      { href: "/budget", label: "Budget", key: "budget", icon: <Icon d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /> },
      { href: "/investing", label: "Investing", key: "investing", icon: <Icon d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /> },
      { href: "/credit-builder", label: "Credit Builder", key: "credit-builder", icon: <Icon d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /> },
    ],
  },
  {
    label: "Resources",
    items: [
      { href: "/tools", label: "Repair Tools", key: "tools", icon: <Icon d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" /> },
      { href: "/payoff", label: "Debt Payoff", key: "payoff", icon: <Icon d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /> },
      { href: "/education", label: "Education", key: "education", icon: <Icon d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /> },
      { href: "/templates", label: "Letter Templates", key: "templates", icon: <Icon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
      { href: "/cfpb", label: "CFPB Complaint", key: "cfpb", icon: <Icon d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
      { href: "/vault", label: "Document Vault", key: "vault", icon: <Icon d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /> },
      { href: "/freeze", label: "Credit Freeze", key: "freeze", icon: <Icon d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /> },
    ],
  },
];

function NavDropdown({
  label,
  items,
  activeNav,
  onNavigate,
}: {
  label: string;
  items: NavEntry[];
  activeNav: NavItem;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasActive = items.some((i) => i.key === activeNav);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          hasActive
            ? "text-teal-700 bg-teal-50"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
      >
        {label}
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50">
          {items.map((item) => {
            const active = activeNav === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => { setOpen(false); onNavigate?.(); }}
                className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                  active
                    ? "text-teal-700 bg-teal-50 font-medium"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className={active ? "text-teal-600" : "text-slate-400"}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProfileDropdown({
  profileName,
  userEmail,
  activeNav,
  onSignOut,
}: {
  profileName: string | null;
  userEmail: string | null | undefined;
  activeNav: NavItem;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = activeNav === "profile" || activeNav === "pricing";

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          isActive ? "text-teal-700 bg-teal-50" : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-lime-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {(profileName || userEmail || "?")[0].toUpperCase()}
        </div>
        <span>Profile</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
              activeNav === "profile"
                ? "text-teal-700 bg-teal-50 font-medium"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <svg className="w-4 h-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile Settings
          </Link>
          <div className="border-t border-slate-100 mt-1 pt-1">
            <button
              onClick={() => { onSignOut(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AuthenticatedLayout({
  activeNav,
  children,
}: {
  activeNav: NavItem;
  children: ReactNode;
}) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isPro, loading: subLoading } = useSubscription();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const effectiveSections = sections;

  // Self-service is free — no redirect needed for unsubscribed users

  useEffect(() => {
    if (!user) return;
    fetch("/api/users/profile", {
      headers: { Authorization: `Bearer ${user.idToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) setProfileName(d.profile.fullName || null);
      })
      .catch(() => {});
  }, [user]);

  if (subLoading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-white items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-white text-slate-900">

      {/* Top navigation bar */}
      <header className="fixed top-0 left-0 right-0 z-30 h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3">
        {/* Logo: centered on mobile, left-aligned on desktop */}
        <Link href="/dashboard" className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0 shrink-0 md:mr-2">
          <Logo className="h-9 w-auto" />
        </Link>

        {/* Desktop nav dropdowns */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {effectiveSections.map((section) =>
            section.items.length === 1 ? (
              <Link
                key={section.label}
                href={section.items[0].href}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeNav === section.items[0].key
                    ? "text-teal-700 bg-teal-50"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {section.label}
              </Link>
            ) : (
              <NavDropdown
                key={section.label}
                label={section.label}
                items={section.items}
                activeNav={activeNav}
              />
            )
          )}
        </nav>

        {/* Right side: notifications + profile */}
        <div className="hidden md:flex items-center gap-2 ml-auto">
          <NotificationBell align="right" />
          <ProfileDropdown
            profileName={profileName}
            userEmail={user?.email}
            activeNav={activeNav}
            onSignOut={signOut}
          />
        </div>

        {/* Mobile: notifications + hamburger */}
        <div className="flex md:hidden items-center gap-2 ml-auto">
          <NotificationBell align="right" />
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-72 bg-white z-50 flex flex-col shadow-xl md:hidden overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Logo className="h-9 w-auto" />
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 py-4">
              {effectiveSections.map((section) => (
                <div key={section.label} className="mb-4">
                  <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {section.label}
                  </p>
                  {section.items.map((item) => {
                    const active = activeNav === item.key;
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? "bg-gradient-to-r from-lime-500/10 to-teal-500/10 text-teal-700"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <span className={active ? "text-teal-600" : "text-slate-400"}>{item.icon}</span>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}

              {/* Profile section in mobile drawer */}
              <div className="mb-4">
                <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Account
                </p>
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeNav === "profile"
                      ? "bg-gradient-to-r from-lime-500/10 to-teal-500/10 text-teal-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-lime-400 to-teal-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {(profileName || user?.email || "?")[0].toUpperCase()}
                  </div>
                  Profile
                </Link>
                <button
                  onClick={() => { signOut(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors w-full text-left"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </nav>
          </aside>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 pt-14 pb-10 min-h-screen">
        {children}
      </main>

      {/* Report an Issue — fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center py-2 bg-white/80 backdrop-blur-sm border-t border-slate-100">
        <button
          onClick={() => setShowReportModal(true)}
          className="text-xs text-slate-400 hover:text-teal-600 transition-colors"
        >
          Report an Issue
        </button>
      </div>

      {showReportModal && <ReportIssueModal onClose={() => setShowReportModal(false)} />}
    </div>
  );
}

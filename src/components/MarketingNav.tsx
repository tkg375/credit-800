"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useAuthModal } from "@/components/AuthModal";

const navLinks = [
  { href: "/learn", label: "Learn" },
  { href: "/sample-letters", label: "Sample Letters" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
  { href: "/support", label: "Support" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const { openModal } = useAuthModal();

  return (
    <nav className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
      <Link href="/"><Logo className="h-10 sm:h-14 w-auto" /></Link>

      {/* Desktop links */}
      <div className="hidden md:flex items-center gap-1 bg-teal-50 border border-teal-200 rounded-full px-2 py-1 text-sm text-slate-700">
        {navLinks.map((l) => (
          <Link key={l.href} href={l.href} className="px-4 py-1.5 rounded-full hover:bg-teal-100 hover:text-teal-800 transition">{l.label}</Link>
        ))}
      </div>

      {/* Desktop right buttons */}
      <div className="hidden md:flex gap-4">
        <button onClick={() => openModal("login")} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition whitespace-nowrap">
          Log In
        </button>
        <button onClick={() => openModal("register")} className="px-4 py-2 text-sm bg-gradient-to-r from-lime-500 to-teal-500 hover:from-lime-400 hover:to-teal-400 text-white rounded-lg transition whitespace-nowrap font-medium">
          Get Started
        </button>
      </div>

      {/* Mobile: Get Started + hamburger */}
      <div className="flex md:hidden items-center gap-2">
        <button onClick={() => openModal("register")} className="px-3 py-2 text-sm bg-gradient-to-r from-lime-500 to-teal-500 text-white rounded-lg transition whitespace-nowrap font-medium">
          Get Started
        </button>
        <button
          onClick={() => setOpen(true)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-64 bg-white z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <span className="font-semibold text-slate-800">Menu</span>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  {l.label}
                </Link>
              ))}
              <div className="border-t border-slate-100 mt-3 pt-3">
                <button
                  onClick={() => { setOpen(false); openModal("login"); }}
                  className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  Log In
                </button>
              </div>
            </nav>
          </div>
        </>
      )}
    </nav>
  );
}

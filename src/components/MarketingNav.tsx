"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useAuthModal } from "@/components/AuthModal";

const navLinks = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/plans", label: "Pricing" },
  { href: "/sample-letters", label: "Sample Letters" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const { openModal } = useAuthModal();

  return (
    <nav className="w-full px-4 sm:px-10 py-3 flex items-center justify-between relative">
      {/* Mobile: spacer so logo centers */}
      <div className="w-10 shrink-0 md:hidden" />

      {/* Logo: centered on mobile, left on desktop */}
      <Link href="/" className="shrink-0 absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0">
        <Logo className="h-16 sm:h-20 w-auto" />
      </Link>

      {/* Desktop: links right-aligned */}
      <div className="hidden md:flex items-center gap-0.5 ml-auto mr-4 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] rounded-full px-1.5 py-1.5">
        {navLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="px-4 py-1.5 rounded-full text-sm font-medium text-white hover:bg-white/20 transition-all"
          >
            {l.label}
          </Link>
        ))}
      </div>

      {/* Desktop: auth buttons right */}
      <div className="hidden md:flex items-center gap-2">
        <button
          onClick={() => openModal("login")}
          className="px-5 py-3 rounded-full text-sm font-medium text-white bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] hover:opacity-90 transition-all whitespace-nowrap"
        >
          Log In
        </button>
        <button
          onClick={() => openModal("register")}
          className="px-5 py-3 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] hover:opacity-90 shadow-sm transition-all whitespace-nowrap"
        >
          Get Started
        </button>
      </div>

      {/* Mobile: hamburger */}
      <div className="flex md:hidden items-center">
        <button
          onClick={() => setOpen(true)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-64 max-w-full bg-white z-50 flex flex-col shadow-2xl overflow-hidden">
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
              <div className="border-t border-slate-100 mt-3 pt-3 space-y-2">
                <button
                  onClick={() => { setOpen(false); openModal("login"); }}
                  className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  Log In
                </button>
                <button
                  onClick={() => { setOpen(false); openModal("register"); }}
                  className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white transition"
                >
                  Get Started
                </button>
              </div>
            </nav>
          </div>
        </>
      )}
    </nav>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white text-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex justify-center mb-8">
          <Logo className="h-12 w-auto" />
        </Link>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl">
          {submitted ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold mb-2">Check your email</h1>
              <p className="text-slate-500 text-sm">
                If an account exists for <strong>{email}</strong>, we sent a password reset link. Check your inbox and spam folder.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block text-sm text-[#1a3fd4] hover:text-[#0e7fd4] font-medium transition"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-2 text-center">Forgot Password</h1>
              <p className="text-sm text-slate-500 text-center mb-6">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              {error && (
                <p className="text-red-500 text-sm text-center mb-4 bg-red-50 py-2 px-4 rounded-lg">{error}</p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] hover:from-lime-400 hover:via-teal-400 hover:to-cyan-500 text-white rounded-lg font-medium transition disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            </>
          )}
        </div>

        {!submitted && (
          <p className="text-sm text-slate-500 text-center mt-6">
            Remember it?{" "}
            <Link href="/login" className="text-teal-600 hover:text-lime-600 font-medium transition">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);

      // 2FA is mandatory — send code via cookie auth and redirect to verify
      const sendRes = await fetch("/api/auth/2fa/send", {
        method: "POST",
        credentials: "include",
      });
      if (!sendRes.ok) {
        const data = await sendRes.json();
        // Throttled — a code was already sent recently, still redirect to verify
        if (!data.throttled) {
          setError(data.error || "Failed to send verification code. Please try again.");
          return;
        }
      }
      router.push("/verify-2fa");
    } catch {
      setError("Invalid email or password.");
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
          <h1 className="text-2xl font-bold mb-2 text-center">Welcome Back</h1>
          <p className="text-xs text-slate-500 text-center mb-6">
            A verification code will be sent to your email each time you log in.
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
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <Link href="/forgot-password" className="text-xs text-teal-600 hover:text-lime-600 transition">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600 hover:from-lime-400 hover:via-teal-400 hover:to-cyan-500 text-white rounded-lg font-medium transition disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-sm text-slate-500 text-center mt-6">
          No account?{" "}
          <Link href="/register" className="text-teal-600 hover:text-lime-600 font-medium transition">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

type AuthModalContextType = {
  openModal: (mode?: "login" | "register") => void;
  closeModal: () => void;
};

const AuthModalContext = createContext<AuthModalContextType>({
  openModal: () => {},
  closeModal: () => {},
});

export function useAuthModal() {
  return useContext(AuthModalContext);
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const router = useRouter();
  const { signIn } = useAuth();

  const openModal = useCallback((m: "login" | "register" = "login") => {
    setMode(m);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => setIsOpen(false), []);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regError, setRegError] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      await signIn(loginEmail, loginPassword);

      let idToken: string | null = null;
      try {
        const stored = localStorage.getItem("creditai_auth");
        if (stored) idToken = JSON.parse(stored).idToken || null;
      } catch { /* ignore */ }

      closeModal();

      if (idToken) {
        const sendRes = await fetch("/api/auth/2fa/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!sendRes.ok) {
          const data = await sendRes.json() as { throttled?: boolean; error?: string };
          if (!data.throttled) {
            setLoginError(data.error || "Failed to send verification code.");
            setIsOpen(true);
            return;
          }
        }
        router.push("/verify-2fa");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setLoginError("Invalid email or password.");
    } finally {
      setLoginLoading(false);
    }
  }

  function handleRegisterContinue(e: React.FormEvent) {
    e.preventDefault();
    setRegError(null);
    if (regPassword !== regConfirm) { setRegError("Passwords do not match."); return; }
    if (regPassword.length < 6) { setRegError("Password must be at least 6 characters."); return; }
    setRegLoading(true);
    // Pass credentials to the register page to pre-fill
    const params = new URLSearchParams({ email: regEmail, password: regPassword });
    closeModal();
    router.push(`/register?${params.toString()}`);
  }

  return (
    <AuthModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">
            {/* Close */}
            <button onClick={closeModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>

            {/* Tab toggle */}
            <div className="flex rounded-xl border border-slate-200 p-1 mb-6 bg-slate-50">
              {(["login", "register"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setLoginError(null); setRegError(null); }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                    mode === m
                      ? "bg-gradient-to-r from-lime-500 to-teal-500 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {m === "login" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>

            {mode === "login" ? (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Welcome back</h2>
                  <p className="text-slate-500 text-sm mt-1">A verification code will be sent to your email.</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required placeholder="you@example.com"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">Password</label>
                      <Link href="/forgot-password" className="text-xs text-teal-600 hover:text-teal-700 transition" onClick={closeModal}>
                        Forgot password?
                      </Link>
                    </div>
                    <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required placeholder="••••••••"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition" />
                  </div>
                  {loginError && (
                    <p className="text-red-500 text-sm text-center bg-red-50 py-2 px-4 rounded-lg">{loginError}</p>
                  )}
                  <button type="submit" disabled={loginLoading}
                    className="w-full py-3 bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600 hover:from-lime-400 hover:via-teal-400 hover:to-cyan-500 text-white rounded-lg font-medium transition disabled:opacity-50 text-sm">
                    {loginLoading ? "Signing in..." : "Sign In"}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Create your account</h2>
                  <p className="text-slate-500 text-sm mt-1">Free — no credit card required.</p>
                </div>
                <form onSubmit={handleRegisterContinue} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required placeholder="you@example.com"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required placeholder="••••••••"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                    <input type="password" value={regConfirm} onChange={e => setRegConfirm(e.target.value)} required placeholder="••••••••"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition" />
                  </div>
                  {regError && (
                    <p className="text-red-500 text-sm text-center bg-red-50 py-2 px-4 rounded-lg">{regError}</p>
                  )}
                  <button type="submit" disabled={regLoading}
                    className="w-full py-3 bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600 hover:from-lime-400 hover:via-teal-400 hover:to-cyan-500 text-white rounded-lg font-medium transition disabled:opacity-50 text-sm">
                    {regLoading ? "Continuing..." : "Continue →"}
                  </button>
                  <p className="text-xs text-slate-400 text-center">
                    You&apos;ll complete your profile on the next step.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </AuthModalContext.Provider>
  );
}

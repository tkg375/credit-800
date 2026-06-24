"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
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
  const { signIn, signUp, complete2FA } = useAuth();

  // ── Login state ──
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  // ── Register state (2 steps) ──
  const [regStep, setRegStep] = useState<1 | 2>(1);

  // Step 1: credentials
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  // Step 2: personal info
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [stateFld, setStateFld] = useState("");
  const [zip, setZip] = useState("");

  const [regError, setRegError] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  const openModal = useCallback((m: "login" | "register" = "login") => {
    setMode(m);
    setRegStep(1);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setRegLoading(false);
    setLoginLoading(false);
    setRegError(null);
    setLoginError(null);
  }, []);

  // ZIP auto-fill
  useEffect(() => {
    if (zip.length !== 5 || !/^\d{5}$/.test(zip)) return;
    if (city && stateFld) return;
    fetch(`https://api.zippopotam.us/us/${zip}`)
      .then(r => r.json())
      .then((d: { places?: Array<{ "place name": string; "state abbreviation": string }> }) => {
        if (d.places?.[0]) {
          setCity(prev => prev || d.places![0]["place name"]);
          setStateFld(prev => prev || d.places![0]["state abbreviation"]);
        }
      })
      .catch(() => {});
  }, [zip, city, stateFld]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      await signIn(loginEmail, loginPassword);
      closeModal();
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "REQUIRES_2FA") {
        setNeeds2FA(true);
        startCooldown(60);
      } else {
        setLoginError("Invalid email or password.");
      }
    } finally {
      setLoginLoading(false);
    }
  }

  function startCooldown(seconds: number) {
    setResendCooldown(seconds);
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleResend() {
    setResendLoading(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/auth/2fa/resend", { method: "POST" });
      const data = await res.json() as { sent?: boolean; retryAfter?: number; error?: string };
      if (!res.ok) {
        if (data.retryAfter) startCooldown(data.retryAfter);
        else setLoginError(data.error || "Failed to resend.");
      } else {
        startCooldown(60);
      }
    } catch {
      setLoginError("Failed to resend code.");
    } finally {
      setResendLoading(false);
    }
  }

  async function handle2FA(e: React.FormEvent) {
    e.preventDefault();
    setOtpLoading(true);
    setLoginError(null);
    try {
      await complete2FA(otpCode);
      closeModal();
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed.";
      setLoginError(msg.includes("pending") ? "Code expired — please request a new one." : msg);
      if (msg.includes("pending") || msg.includes("expired")) setOtpCode("");
    } finally {
      setOtpLoading(false);
    }
  }

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setRegError(null);
    if (regPassword !== regConfirm) { setRegError("Passwords do not match."); return; }
    if (regPassword.length < 6) { setRegError("Password must be at least 6 characters."); return; }
    setRegStep(2);
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setRegError(null);
    if (!fullName.trim()) { setRegError("Full name is required."); return; }
    if (!dob) { setRegError("Date of birth is required."); return; }
    if (!address.trim() || !city.trim() || !stateFld.trim() || !zip.trim()) {
      setRegError("Full mailing address is required."); return;
    }
    if (stateFld.length !== 2) { setRegError("State must be a 2-letter abbreviation (e.g., CA, TX)."); return; }
    setRegLoading(true);
    try {
      const user = await signUp(regEmail, regPassword);

      await fetch("/api/users/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.idToken}`,
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          dateOfBirth: dob,
          phone: phone.trim(),
          address: address.trim(),
          address2: address2.trim(),
          city: city.trim(),
          state: stateFld.trim().toUpperCase(),
          zip: zip.trim(),
        }),
      });

      closeModal();
      window.location.href = "/dashboard?welcome=1";
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("EMAIL_EXISTS")) {
        setRegError("An account with this email already exists. Please log in.");
        setRegStep(1);
      } else {
        setRegError(msg || "Could not create account. Please try again.");
      }
    } finally {
      setRegLoading(false);
    }
  }

  const inputCls = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3fd4] focus:border-transparent transition";
  const labelCls = "block text-sm font-medium text-slate-700 mb-1";

  return (
    <AuthModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            {/* Close */}
            <button onClick={closeModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition z-10">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>

            <div className="p-6 pb-0">
              {/* Tab toggle */}
              <div className="flex rounded-xl border border-slate-200 p-1 mb-5 bg-slate-50 mr-8">
                {(["login", "register"] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setLoginError(null); setRegError(null); setRegStep(1); }}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                      mode === m
                        ? "bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {m === "login" ? "Sign In" : "Sign Up"}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-6 pb-6">
              {mode === "login" ? (
                <>
                  {needs2FA ? (
                    <>
                      <div className="text-center mb-6">
                        <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-7 h-7 text-[#1a3fd4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Check your email</h2>
                        <p className="text-slate-500 text-sm mt-1">We sent a 6-digit code to <strong>{loginEmail}</strong></p>
                      </div>
                      <form onSubmit={handle2FA} className="space-y-4">
                        <input
                          type="password"
                          inputMode="numeric"
                          pattern="\d{6}"
                          maxLength={6}
                          value={otpCode}
                          onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))}
                          required
                          placeholder="••••••"
                          autoComplete="one-time-code"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-center text-2xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-[#1a3fd4] focus:border-transparent transition"
                        />
                        {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
                        <button type="submit" disabled={otpLoading || otpCode.length !== 6} className="w-full py-3 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] hover:opacity-90 text-white rounded-lg font-medium transition disabled:opacity-50 text-sm">
                          {otpLoading ? "Verifying…" : "Verify & Sign In"}
                        </button>
                        <div className="flex items-center justify-between text-sm">
                          <button type="button" onClick={() => { setNeeds2FA(false); setOtpCode(""); setLoginError(null); }} className="text-slate-500 hover:text-slate-700 transition">
                            ← Back to login
                          </button>
                          <button
                            type="button"
                            onClick={handleResend}
                            disabled={resendLoading || resendCooldown > 0}
                            className="text-[#1a3fd4] hover:text-[#0e7fd4] transition disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {resendLoading ? "Sending…" : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                          </button>
                        </div>
                      </form>
                    </>
                  ) : (
                  <>
                  <div className="text-center mb-5">
                    <h2 className="text-xl font-bold text-slate-900">Welcome back</h2>
                    <p className="text-slate-500 text-sm mt-1">Sign in to your Credit 800 account.</p>
                  </div>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className={labelCls}>Email</label>
                      <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required placeholder="you@example.com" className={inputCls} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-slate-700">Password</label>
                        <Link href="/forgot-password" className="text-xs text-[#1a3fd4] hover:text-[#0e7fd4] transition" onClick={closeModal}>
                          Forgot password?
                        </Link>
                      </div>
                      <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required placeholder="••••••••" className={inputCls} />
                    </div>
                    {loginError && <p className="text-red-500 text-sm text-center bg-red-50 py-2 px-4 rounded-lg">{loginError}</p>}
                    <button type="submit" disabled={loginLoading}
                      className="w-full py-3 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] hover:opacity-90 text-white rounded-lg font-medium transition disabled:opacity-50 text-sm">
                      {loginLoading ? "Signing in..." : "Sign In"}
                    </button>
                  </form>
                  </>
                  )}
                </>
              ) : (
                <>
                  {/* Step indicator */}
                  <div className="flex items-center justify-center gap-2 mb-5">
                    {[1, 2].map(s => (
                      <div key={s} className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          regStep === s ? "bg-[#1a3fd4] text-white" : regStep > s ? "bg-blue-50 text-[#1a3fd4]" : "bg-slate-200 text-slate-400"
                        }`}>{s}</div>
                        {s < 2 && <div className={`w-6 h-px ${regStep > s ? "bg-[#00d4aa]" : "bg-slate-200"}`} />}
                      </div>
                    ))}
                    <span className="ml-2 text-xs text-slate-500">
                      {regStep === 1 ? "Credentials" : "Personal Info"}
                    </span>
                  </div>

                  {regError && <p className="text-red-500 text-sm text-center bg-red-50 py-2 px-4 rounded-lg mb-4">{regError}</p>}

                  {regStep === 1 && (
                    <form onSubmit={handleStep1} className="space-y-4">
                      <div>
                        <label className={labelCls}>Email *</label>
                        <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required placeholder="you@example.com" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Password *</label>
                        <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required placeholder="••••••••" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Confirm Password *</label>
                        <input type="password" value={regConfirm} onChange={e => setRegConfirm(e.target.value)} required placeholder="••••••••" className={inputCls} />
                      </div>
                      <button type="submit"
                        className="w-full py-3 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] hover:opacity-90 text-white rounded-lg font-medium transition text-sm">
                        Continue →
                      </button>
                      <p className="text-xs text-slate-400 text-center">Free — no credit card required.</p>
                    </form>
                  )}

                  {regStep === 2 && (
                    <form onSubmit={handleStep2} className="space-y-3">
                      <div>
                        <label className={labelCls}>Full Legal Name *</label>
                        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="John A. Doe" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Date of Birth *</label>
                        <input type="date" value={dob} onChange={e => setDob(e.target.value)} required className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Phone Number</label>
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 000-0000" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Street Address *</label>
                        <input type="text" value={address} onChange={e => setAddress(e.target.value)} required placeholder="123 Main St" autoComplete="off" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Apt / Suite</label>
                        <input type="text" value={address2} onChange={e => setAddress2(e.target.value)} placeholder="Apt 4B (optional)" className={inputCls} />
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        <div className="col-span-2">
                          <label className={labelCls}>City *</label>
                          <input type="text" value={city} onChange={e => setCity(e.target.value)} required placeholder="Dallas" autoComplete="off" className={inputCls} />
                        </div>
                        <div className="col-span-1">
                          <label className={labelCls}>State *</label>
                          <input type="text" value={stateFld} onChange={e => setStateFld(e.target.value)} required placeholder="TX" maxLength={2} autoComplete="off" className={inputCls + " uppercase"} />
                        </div>
                        <div className="col-span-2">
                          <label className={labelCls}>ZIP *</label>
                          <input type="text" value={zip} onChange={e => setZip(e.target.value)} required placeholder="75201" autoComplete="off" className={inputCls} />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={() => { setRegStep(1); setRegError(null); }}
                          className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition">
                          ← Back
                        </button>
                        <button type="submit" disabled={regLoading}
                          className="flex-1 py-2.5 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] hover:opacity-90 text-white rounded-lg font-medium transition disabled:opacity-50 text-sm">
                          {regLoading ? "Creating account..." : "Create Account →"}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 text-center pt-1">
                        By creating an account, you agree to our{" "}
                        <Link href="/terms" className="text-teal-600 hover:underline" onClick={closeModal}>Terms</Link>
                        {" "}and{" "}
                        <Link href="/privacy" className="text-teal-600 hover:underline" onClick={closeModal}>Privacy Policy</Link>.
                      </p>
                    </form>
                  )}


                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AuthModalContext.Provider>
  );
}

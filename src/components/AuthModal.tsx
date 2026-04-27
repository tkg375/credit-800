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

const proFeatures = [
  "Unlimited dispute letters",
  "Round 2/3 escalation letters",
  "CFPB complaint generator",
  "Credit score simulator",
  "Document vault (unlimited)",
  "Debt payoff optimizer",
  "Score tracking & charts",
  "Smart notifications",
  "Card recommendations",
  "Mail disputes via USPS ($2/letter)",
];


export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const router = useRouter();
  const { signIn, signUp } = useAuth();

  // ── Login state ──
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Register state (3 steps) ──
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);

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

  // Step 3: plan (only free available)
  const [selectedPlan] = useState<"pro">("pro");

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

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setRegError(null);
    if (regPassword !== regConfirm) { setRegError("Passwords do not match."); return; }
    if (regPassword.length < 6) { setRegError("Password must be at least 6 characters."); return; }
    setRegStep(2);
  }

  function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setRegError(null);
    if (!fullName.trim()) { setRegError("Full name is required."); return; }
    if (!dob) { setRegError("Date of birth is required."); return; }
    if (!address.trim() || !city.trim() || !stateFld.trim() || !zip.trim()) {
      setRegError("Full mailing address is required."); return;
    }
    if (stateFld.length !== 2) { setRegError("State must be a 2-letter abbreviation (e.g., CA, TX)."); return; }
    setRegStep(3);
  }

  async function handleCreateAccount() {
    setRegError(null);
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

  const inputCls = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition";
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
                        ? "bg-gradient-to-r from-lime-500 to-teal-500 text-white shadow-sm"
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
                  <div className="text-center mb-5">
                    <h2 className="text-xl font-bold text-slate-900">Welcome back</h2>
                    <p className="text-slate-500 text-sm mt-1">A verification code will be sent to your email.</p>
                  </div>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className={labelCls}>Email</label>
                      <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required placeholder="you@example.com" className={inputCls} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-slate-700">Password</label>
                        <Link href="/forgot-password" className="text-xs text-teal-600 hover:text-teal-700 transition" onClick={closeModal}>
                          Forgot password?
                        </Link>
                      </div>
                      <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required placeholder="••••••••" className={inputCls} />
                    </div>
                    {loginError && <p className="text-red-500 text-sm text-center bg-red-50 py-2 px-4 rounded-lg">{loginError}</p>}
                    <button type="submit" disabled={loginLoading}
                      className="w-full py-3 bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600 hover:from-lime-400 hover:via-teal-400 hover:to-cyan-500 text-white rounded-lg font-medium transition disabled:opacity-50 text-sm">
                      {loginLoading ? "Signing in..." : "Sign In"}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  {/* Step indicator */}
                  <div className="flex items-center justify-center gap-2 mb-5">
                    {[1, 2, 3].map(s => (
                      <div key={s} className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          regStep === s ? "bg-teal-600 text-white" : regStep > s ? "bg-teal-100 text-teal-600" : "bg-slate-200 text-slate-400"
                        }`}>{s}</div>
                        {s < 3 && <div className={`w-6 h-px ${regStep > s ? "bg-teal-300" : "bg-slate-200"}`} />}
                      </div>
                    ))}
                    <span className="ml-2 text-xs text-slate-500">
                      {regStep === 1 ? "Credentials" : regStep === 2 ? "Personal Info" : "Choose Plan"}
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
                        className="w-full py-3 bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600 hover:from-lime-400 hover:via-teal-400 hover:to-cyan-500 text-white rounded-lg font-medium transition text-sm">
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
                        <button type="submit"
                          className="flex-1 py-2.5 bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600 hover:from-lime-400 hover:via-teal-400 hover:to-cyan-500 text-white rounded-lg font-medium transition text-sm">
                          Continue →
                        </button>
                      </div>
                    </form>
                  )}

                  {regStep === 3 && (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-500 text-center mb-1">Free to use.</p>

                      {/* Self Service */}
                      <div className="rounded-xl border-2 border-teal-500 ring-1 ring-teal-500 bg-teal-50 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-slate-900">Self Service</p>
                            <p className="text-xl font-bold bg-gradient-to-r from-lime-500 to-teal-600 bg-clip-text text-transparent">Free</p>
                            <p className="text-xs text-slate-500 mt-0.5">DIY credit repair toolkit</p>
                          </div>
                          <div className="w-5 h-5 rounded-full border-2 border-teal-500 bg-teal-500 flex items-center justify-center shrink-0 mt-1">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                              <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                          </div>
                        </div>
                        <ul className="space-y-1">
                          {proFeatures.slice(0, 4).map(f => (
                            <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                              <svg className="w-3 h-3 text-teal-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              {f}
                            </li>
                          ))}
                          <li className="text-xs text-slate-400 pl-5">+{proFeatures.length - 4} more</li>
                        </ul>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={() => { setRegStep(2); setRegError(null); }}
                          className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition">
                          ← Back
                        </button>
                        <button type="button" onClick={handleCreateAccount} disabled={regLoading}
                          className="flex-1 py-2.5 bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600 hover:from-lime-400 hover:via-teal-400 hover:to-cyan-500 text-white rounded-lg font-medium transition disabled:opacity-50 text-sm">
                          {regLoading ? "Creating account..." : "Create Account — Free"}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 text-center">
                        By creating an account, you agree to our{" "}
                        <Link href="/terms" className="text-teal-600 hover:underline" onClick={closeModal}>Terms</Link>
                        {" "}and{" "}
                        <Link href="/privacy" className="text-teal-600 hover:underline" onClick={closeModal}>Privacy Policy</Link>.
                      </p>
                    </div>
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

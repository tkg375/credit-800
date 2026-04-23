"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";

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

const autopilotFeatures = [
  "Everything in Self Service",
  "Monthly soft-pull credit report",
  "Auto-generated dispute letters",
  "Automatic USPS mailing (up to 10/mo)",
  "VantageScore tracking — hands-free",
  "FCRA-compliant full automation",
  "Priority support",
  "Compliance audit trail",
];

function RegisterForm() {
  const { signUp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Step 1: account details. Step 2: plan selection.
  const [step, setStep] = useState<1 | 2>(1);

  // Account fields — pre-fill from modal if passed via URL
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState(searchParams.get("password") ?? "");
  const [confirm, setConfirm] = useState(searchParams.get("password") ?? "");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");

  // Plan selection
  const [selectedPlan, setSelectedPlan] = useState<"pro">("pro"); // only pro available now

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ZIP code auto-fill
  useEffect(() => {
    if (zip.length !== 5 || !/^\d{5}$/.test(zip)) return;
    if (city && state) return;
    fetch(`https://api.zippopotam.us/us/${zip}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.places?.[0]) {
          setCity((prev) => prev || d.places[0]["place name"]);
          setState((prev) => prev || d.places[0]["state abbreviation"]);
        }
      })
      .catch(() => {});
  }, [zip, city, state]);

  const validateStep1 = () => {
    if (!fullName.trim()) return "Full name is required.";
    if (!dob) return "Date of birth is required.";
    if (!address.trim() || !city.trim() || !state.trim() || !zip.trim())
      return "Full mailing address is required.";
    if (state.length !== 2) return "State must be a 2-letter abbreviation (e.g., CA, TX).";
    if (!email.trim()) return "Email is required.";
    if (password !== confirm) return "Passwords do not match.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return null;
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const err = validateStep1();
    if (err) { setError(err); return; }
    setStep(2);
  };

  const handleSubscribe = async () => {
    setError("");
    setLoading(true);
    try {
      const user = await signUp(email, password);

      // Save profile
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
          state: state.trim().toUpperCase(),
          zip: zip.trim(),
        }),
      });

      // Self Service is free — go straight to dashboard
      window.location.href = "/dashboard?welcome=1";
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("EMAIL_EXISTS")) {
        setError("An account with this email already exists. Please log in.");
      } else {
        setError(msg || "Could not create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white text-slate-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Link href="/" className="flex justify-center mb-8">
          <Logo className="h-12 w-auto" />
        </Link>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className={`flex items-center gap-2 text-sm font-medium ${step === 1 ? "text-teal-600" : "text-slate-400"}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? "bg-teal-600 text-white" : "bg-teal-100 text-teal-600"}`}>1</span>
            Account Info
          </div>
          <div className="w-8 h-px bg-slate-300" />
          <div className={`flex items-center gap-2 text-sm font-medium ${step === 2 ? "text-teal-600" : "text-slate-400"}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-500"}`}>2</span>
            Choose Plan
          </div>
        </div>

        {step === 1 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl">
            <h1 className="text-2xl font-bold mb-2 text-center">Get Started</h1>
            <p className="text-slate-500 text-sm text-center mb-6">Create your account to reach 800</p>

            {error && (
              <p className="text-red-500 text-sm text-center mb-4 bg-red-50 py-2 px-4 rounded-lg">{error}</p>
            )}

            <form onSubmit={handleContinue} autoComplete="off" className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  placeholder="John A. Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Street Address *</label>
                <input
                  type="text"
                  placeholder="123 Main St"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  autoComplete="off"
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Apt / Suite</label>
                <input
                  type="text"
                  placeholder="Apt 4B (optional)"
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    placeholder="Dallas"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    autoComplete="off"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">State *</label>
                  <input
                    type="text"
                    placeholder="TX"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    maxLength={2}
                    required
                    autoComplete="off"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition uppercase"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">ZIP *</label>
                  <input
                    type="text"
                    placeholder="75201"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    required
                    autoComplete="off"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <hr className="border-slate-200" />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password *</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600 hover:from-lime-400 hover:via-teal-400 hover:to-cyan-500 text-white rounded-lg font-medium transition"
              >
                Continue to Plan Selection
              </button>

              <p className="text-xs text-slate-400 text-center">
                By creating an account, you agree to our{" "}
                <Link href="/terms" className="text-teal-600 hover:underline">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-teal-600 hover:underline">Privacy Policy</Link>.
              </p>
            </form>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl mb-4">
              <h1 className="text-xl font-bold mb-1 text-center">Choose Your Plan</h1>
              <p className="text-slate-500 text-sm text-center mb-6">Self Service is free. Autopilot coming soon.</p>

              {error && (
                <p className="text-red-500 text-sm text-center mb-4 bg-red-50 py-2 px-4 rounded-lg">{error}</p>
              )}

              <div className="space-y-4">
                {/* Self Service plan */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan("pro")}
                  className={`w-full text-left rounded-xl border-2 p-4 transition ${
                    selectedPlan === "pro"
                      ? "border-teal-500 ring-1 ring-teal-500 bg-teal-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">Self Service</p>
                      <p className="text-2xl font-bold bg-gradient-to-r from-lime-500 to-teal-600 bg-clip-text text-transparent">
                        Free
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">DIY credit repair toolkit</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                      selectedPlan === "pro" ? "border-teal-500 bg-teal-500" : "border-slate-300"
                    }`}>
                      {selectedPlan === "pro" && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                          <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {proFeatures.slice(0, 5).map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                        <svg className="w-3 h-3 text-teal-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                    <li className="text-xs text-slate-400 pl-5">+{proFeatures.length - 5} more</li>
                  </ul>
                </button>

                {/* Autopilot — Coming Soon */}
                <div className="relative w-full text-left rounded-xl border-2 border-slate-200 p-4 opacity-60 cursor-not-allowed overflow-hidden">
                  <div className="absolute inset-0 z-10 backdrop-blur-[2px] bg-white/40 flex items-center justify-center rounded-xl">
                    <span className="bg-slate-800 text-white text-xs font-bold px-3 py-1 rounded-full">Coming Soon</span>
                  </div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">Autopilot</p>
                      <p className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-cyan-600 bg-clip-text text-transparent">
                        $49 <span className="text-sm font-normal text-slate-400">/ month</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Fully automated — we do everything</p>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0 mt-1" />
                  </div>
                  <ul className="space-y-1">
                    {autopilotFeatures.slice(0, 5).map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                        <svg className="w-3 h-3 text-cyan-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600 hover:from-lime-400 hover:via-teal-400 hover:to-cyan-500 text-white rounded-xl font-medium transition disabled:opacity-50 text-sm"
            >
              {loading ? "Setting up your account..." : "Create Account — Free"}
            </button>

            <button
              type="button"
              onClick={() => { setStep(1); setError(""); }}
              className="w-full mt-2 py-2 text-sm text-slate-500 hover:text-slate-700 transition"
            >
              ← Back to account details
            </button>
          </div>
        )}

        <p className="text-sm text-slate-500 text-center mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-teal-600 hover:text-lime-600 font-medium transition">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

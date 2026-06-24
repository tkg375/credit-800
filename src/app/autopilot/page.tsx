"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/lib/use-subscription";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { CONSENT_TEXT, CONSENT_VERSION } from "@/lib/fcra-consent";

interface AutopilotStatus {
  isActive: boolean;
  hasValidConsent: boolean;
  consentedAt: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  currentlyRunning: boolean;
  currentRunId: string | null;
  totalRunsCompleted: number;
  totalLettersSent: number;
  recentRuns: {
    id: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    itemsFound: number;
    lettersGenerated: number;
    lettersMailed: number;
    errors: string[];
  }[];
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-blue-50 text-[#1a3fd4]",
    running: "bg-blue-50 text-[#1a3fd4] animate-pulse",
    failed: "bg-red-100 text-red-700",
    skipped: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

export default function AutopilotPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAutopilot, loading: subLoading } = useSubscription();
  const router = useRouter();

  const [status, setStatus] = useState<AutopilotStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [showConsent, setShowConsent] = useState(false);
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [submittingConsent, setSubmittingConsent] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [runResult, setRunResult] = useState<{ lettersGenerated: number; lettersMailed: number; errors: string[] } | null>(null);
  const [error, setError] = useState("");

  const fetchStatus = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/autopilot/status", {
        headers: { Authorization: `Bearer ${user.idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch { /* non-blocking */ }
    finally { setLoadingStatus(false); }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
    if (!subLoading && !isAutopilot) { router.replace("/plans"); return; }
    if (user && isAutopilot) fetchStatus();
  }, [user, authLoading, isAutopilot, subLoading, router, fetchStatus]);

  // Poll while a run is in progress
  useEffect(() => {
    if (!status?.currentlyRunning) return;
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [status?.currentlyRunning, fetchStatus]);

  const handleGiveConsent = async () => {
    if (!user || !consentAgreed) return;
    setSubmittingConsent(true);
    setError("");
    try {
      const res = await fetch("/api/autopilot/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
        body: JSON.stringify({ agreedToText: true, consentVersion: CONSENT_VERSION }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to record consent"); return; }
      setShowConsent(false);
      await fetchStatus();
    } catch { setError("Network error. Please try again."); }
    finally { setSubmittingConsent(false); }
  };

  const handleTrigger = async () => {
    if (!user || !status?.hasValidConsent) return;
    setTriggering(true);
    setError("");
    setRunResult(null);
    try {
      const res = await fetch("/api/autopilot/trigger", {
        method: "POST",
        headers: { Authorization: `Bearer ${user.idToken}` },
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Run failed"); }
      else {
        setRunResult({ lettersGenerated: data.lettersGenerated, lettersMailed: data.lettersMailed, errors: data.errors || [] });
        await fetchStatus();
      }
    } catch { setError("Network error. Please try again."); }
    finally { setTriggering(false); }
  };

  if (authLoading || subLoading || loadingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1a3fd4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthenticatedLayout activeNav="dashboard">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] bg-clip-text text-transparent">
              Autopilot
            </h1>
            <span className="text-xs font-semibold bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white px-2.5 py-0.5 rounded-full">
              Active
            </span>
          </div>
          <p className="text-slate-500 text-sm">
            Fully automated credit repair — we pull your report, generate dispute letters, and mail them for you monthly.
          </p>
        </div>

        {/* Consent required banner */}
        {status && !status.hasValidConsent && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-amber-800 text-sm">Authorization Required</p>
                <p className="text-amber-700 text-sm mt-1">
                  Federal law (FCRA § 604) requires your written authorization before we can pull your credit report. This takes 30 seconds.
                </p>
                <button
                  onClick={() => setShowConsent(true)}
                  className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition"
                >
                  Provide Authorization
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Runs Completed", value: status?.totalRunsCompleted ?? 0 },
            { label: "Letters Sent", value: status?.totalLettersSent ?? 0 },
            { label: "Status", value: status?.currentlyRunning ? "Running..." : status?.hasValidConsent ? "Ready" : "Needs Auth" },
            { label: "Next Run", value: status?.nextRunAt ? new Date(status.nextRunAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "After first run" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className="text-xl font-bold text-slate-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Manual trigger */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-900">Run Now</h2>
              <p className="text-sm text-slate-500 mt-1">
                Process all disputable items from your uploaded reports and mail letters automatically. Autopilot runs monthly — use this for an immediate pass.
              </p>
              {status?.lastRunAt && (
                <p className="text-xs text-slate-400 mt-2">
                  Last run: {new Date(status.lastRunAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
            <button
              onClick={handleTrigger}
              disabled={triggering || status?.currentlyRunning || !status?.hasValidConsent}
              className="shrink-0 px-4 py-2.5 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl text-sm font-medium hover:opacity-90 transition disabled:opacity-40"
            >
              {triggering || status?.currentlyRunning ? "Running..." : "Run Autopilot"}
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {runResult && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <p className="text-sm font-medium text-green-800">
                Run complete — {runResult.lettersGenerated} letters generated, {runResult.lettersMailed} mailed.
              </p>
              {runResult.errors.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {runResult.errors.map((e, i) => (
                    <li key={i} className="text-xs text-amber-700">{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Consent status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold mb-4">FCRA Authorization</h2>
          {status?.hasValidConsent ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Authorization on file</p>
                <p className="text-xs text-slate-500">
                  Authorized {status.consentedAt ? new Date(status.consentedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}
                  {" "}· Version {CONSENT_VERSION}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">No authorization on file</p>
                <p className="text-xs text-slate-500">Required before autopilot can run</p>
              </div>
            </div>
          )}
        </div>

        {/* Run history */}
        {(status?.recentRuns?.length ?? 0) > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold">Run History</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {status!.recentRuns.map((run) => (
                <div key={run.id} className="px-6 py-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={run.status} />
                      <span className="text-xs text-slate-400">
                        {new Date(run.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">
                      {run.itemsFound} items found · {run.lettersGenerated} letters generated · {run.lettersMailed} mailed
                    </p>
                    {run.errors.length > 0 && (
                      <p className="text-xs text-amber-600 mt-1">{run.errors.length} warning{run.errors.length !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Consent modal */}
      {showConsent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] px-6 py-4 shrink-0">
              <h2 className="text-white font-semibold text-lg">FCRA Credit Report Authorization</h2>
              <p className="text-white/80 text-sm mt-0.5">Required under the Fair Credit Reporting Act</p>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-4">
                {CONSENT_TEXT}
              </pre>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-white shrink-0 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAgreed}
                  onChange={(e) => setConsentAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#1a3fd4]"
                />
                <span className="text-sm text-slate-700">
                  I have read, understand, and agree to the above authorization. I am providing my electronic signature and authorizing Credit 800 to obtain my consumer credit report.
                </span>
              </label>
              <div className="flex gap-3">
                <button
                  onClick={handleGiveConsent}
                  disabled={!consentAgreed || submittingConsent}
                  className="flex-1 py-3 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl font-medium text-sm hover:opacity-90 transition disabled:opacity-40"
                >
                  {submittingConsent ? "Saving..." : "I Authorize"}
                </button>
                <button
                  onClick={() => { setShowConsent(false); setConsentAgreed(false); setError(""); }}
                  className="px-4 py-3 border border-slate-300 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthenticatedLayout>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";

type Priority = "HIGH" | "MEDIUM" | "LOW";

interface RecommendedAction {
  action: string;
  priority: Priority;
  description: string;
}

interface LetterAnalysis {
  creditorName: string | null;
  letterDate: string | null;
  letterType: string;
  keyClaimsAndDemands: string[];
  amountClaimed: number | null;
  deadline: string | null;
  yourLegalRights: string[];
  recommendedActions: RecommendedAction[];
  draftResponseLetter: string;
}

interface PastLetter extends LetterAnalysis {
  id: string;
  fileName: string;
  uploadedAt: string;
  status?: string;
}

const LETTER_TYPE_LABELS: Record<string, string> = {
  collection_notice: "Collection Notice",
  demand_letter: "Demand Letter",
  settlement_offer: "Settlement Offer",
  judgment_notice: "Judgment Notice",
  debt_validation_response: "Debt Validation Response",
  cease_and_desist_response: "Cease & Desist Response",
  other: "Other",
};

const PRIORITY_STYLES: Record<Priority, string> = {
  HIGH: "bg-red-100 text-red-700 border border-red-200",
  MEDIUM: "bg-amber-100 text-amber-700 border border-amber-200",
  LOW: "bg-slate-100 text-slate-600 border border-slate-200",
};

function AnalysisResults({ analysis, onBack }: { analysis: LetterAnalysis; onBack: () => void }) {
  const [copied, setCopied] = useState(false);

  // Some older drafts came back as one run-on block. If the text has almost no line
  // breaks, insert them at standard business-letter boundaries so it reads like a letter.
  const formatLetter = (raw: string): string => {
    const text = (raw || "").trim();
    const newlineCount = (text.match(/\n/g) || []).length;
    if (newlineCount >= 4) return text; // already formatted

    let t = text;
    // Break out header placeholders onto their own lines
    t = t.replace(/\s*\[YOUR NAME\]\s*/g, "\n[YOUR NAME]\n");
    t = t.replace(/\s*\[YOUR ADDRESS\]\s*/g, "[YOUR ADDRESS]\n");
    t = t.replace(/\s*\[CITY,? STATE,? ZIP\]\s*/gi, "[CITY, STATE ZIP]\n");
    t = t.replace(/\s*\[DATE\]\s*/g, "\n[DATE]\n");
    // Common letter markers onto new lines / paragraph breaks
    t = t.replace(/\s*(Re:\s)/g, "\n\n$1");
    t = t.replace(/\s*(Dear [^,]+,)\s*/g, "\n\n$1\n\n");
    t = t.replace(/\s*(Sincerely,|Respectfully,|Regards,)\s*/g, "\n\n$1\n\n");
    // Start a new paragraph after sentences that begin a new thought
    t = t.replace(/\.\s+(I am writing|I would|I request|Please note|I appreciate|Under |Pursuant)/g, ".\n\n$1");
    // Collapse 3+ newlines to 2
    t = t.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n").trim();
    return t;
  };

  const formattedLetter = formatLetter(analysis.draftResponseLetter);

  const handleCopy = async () => {
    if (!formattedLetter) return;
    await navigator.clipboard.writeText(formattedLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <button onClick={onBack} className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to all letters
      </button>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-50 rounded-xl text-sm">
        {analysis.creditorName && <span className="font-semibold text-slate-800">{analysis.creditorName}</span>}
        <span className="px-2.5 py-1 bg-blue-50 text-[#1a3fd4] rounded-full text-xs font-medium">
          {LETTER_TYPE_LABELS[analysis.letterType] ?? analysis.letterType}
        </span>
        {analysis.amountClaimed !== null && (
          <span className="text-slate-600 text-xs sm:text-sm">Amount: <strong>${analysis.amountClaimed.toLocaleString()}</strong></span>
        )}
        {analysis.deadline && (
          <span className="text-red-600 font-medium text-xs sm:text-sm">Deadline: {new Date(analysis.deadline).toLocaleDateString()}</span>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6">
        <h2 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4">Key Claims &amp; Demands</h2>
        <ul className="space-y-2.5">
          {analysis.keyClaimsAndDemands.map((claim, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />{claim}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6">
        <h2 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4">Your Legal Rights</h2>
        <ul className="space-y-2.5">
          {analysis.yourLegalRights.map((right, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />{right}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6">
        <h2 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4">Recommended Actions</h2>
        <div className="space-y-3">
          {analysis.recommendedActions.map((item, i) => (
            <div key={i} className="p-3 sm:p-4 bg-slate-50 rounded-xl">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${PRIORITY_STYLES[item.priority]}`}>{item.priority}</span>
                <span className="font-medium text-sm text-slate-800">{item.action}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
          <h2 className="font-semibold text-base sm:text-lg">Draft Response</h2>
          <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600 shrink-0">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        {/* Rendered to look like a printed letter on paper */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-inner mx-auto max-w-[640px] px-6 py-8 sm:px-10 sm:py-12">
          <div
            className="text-slate-800 leading-7"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "15px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
          >
            {formattedLetter}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyzeLetterPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState<PastLetter | null>(null);
  const [pastLetters, setPastLetters] = useState<PastLetter[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    setLoadingHistory(true);
    const load = () => {
      fetch("/api/letters", { headers: { Authorization: `Bearer ${user.idToken}` } })
        .then((r) => r.json())
        .then((d) => {
          if (d.letters) {
            setPastLetters(d.letters);
            // Auto-open a specific letter when arriving via ?letter=<id>
            if (!autoOpenedRef.current) {
              const params = new URLSearchParams(window.location.search);
              const wantId = params.get("letter");
              if (wantId) {
                const match = (d.letters as PastLetter[]).find((l) => l.id === wantId);
                if (match && match.status !== "processing" && match.status !== "error") {
                  autoOpenedRef.current = true;
                  setSelected(match);
                }
              }
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoadingHistory(false));
    };
    load();
    // Refresh periodically so processing letters flip to complete
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1a3fd4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthenticatedLayout activeNav="analyze-letter">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {selected ? (
          <AnalysisResults analysis={selected} onBack={() => setSelected(null)} />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Debt Letters</h1>
                <p className="text-slate-500 text-sm mt-1">Your analyzed creditor and collector letters.</p>
              </div>
              <button
                onClick={() => router.push("/dashboard")}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] hover:opacity-90 text-white rounded-xl text-sm font-medium transition shrink-0"
              >
                Upload a Letter
              </button>
            </div>

            {loadingHistory && pastLetters.length === 0 ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm py-8">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-teal-500 rounded-full animate-spin" />
                Loading...
              </div>
            ) : pastLetters.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
                <p className="text-slate-500 text-sm mb-4">You haven&apos;t analyzed any letters yet.</p>
                <button onClick={() => router.push("/dashboard")} className="text-teal-600 hover:text-teal-700 font-medium text-sm">
                  Upload your first letter →
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pastLetters.map((letter) => {
                  const isProcessing = letter.status === "processing";
                  const isError = letter.status === "error";
                  return (
                    <button
                      key={letter.id}
                      onClick={() => { if (!isProcessing && !isError) setSelected(letter); }}
                      disabled={isProcessing || isError}
                      className={`w-full text-left p-3 sm:p-4 bg-white border border-slate-200 rounded-xl transition group ${
                        isProcessing || isError ? "opacity-70 cursor-default" : "hover:border-teal-300 hover:bg-teal-50/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-slate-800 truncate">{letter.creditorName || letter.fileName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(letter.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isProcessing ? (
                            <span className="flex items-center gap-1.5 text-xs text-teal-600 font-medium">
                              <span className="w-3 h-3 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin" />
                              Analyzing
                            </span>
                          ) : isError ? (
                            <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-full text-xs font-medium">Failed</span>
                          ) : (
                            <>
                              <span className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-100 rounded-full text-xs font-medium max-w-[120px] truncate">
                                {LETTER_TYPE_LABELS[letter.letterType] ?? letter.letterType}
                              </span>
                              <svg className="w-4 h-4 text-slate-300 group-hover:text-teal-500 transition shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </AuthenticatedLayout>
  );
}

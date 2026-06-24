"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

type UploadType = "report" | "letter";

const REPORT_ACCEPT = ".pdf,application/pdf";
const LETTER_ACCEPT = ".pdf,application/pdf,image/jpeg,.jpg,.jpeg,image/png,.png,image/webp,.webp";

function detectBureau(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes("equifax")) return "EQUIFAX";
  if (lower.includes("experian")) return "EXPERIAN";
  if (lower.includes("transunion")) return "TRANSUNION";
  return "UNKNOWN";
}

function isValidFile(file: File, type: UploadType): boolean {
  const name = file.name.toLowerCase();
  if (type === "report") {
    return file.type === "application/pdf" || name.endsWith(".pdf");
  }
  const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  const validExts = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
  return validTypes.includes(file.type) || validExts.some((ext) => name.endsWith(ext));
}

export function UploadModal({
  type,
  onClose,
}: {
  type: UploadType;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [reportStatus, setReportStatus] = useState<"queued" | "analyzing" | "analyzed" | "error" | null>(null);
  const [reportError, setReportError] = useState("");
  const pollingReportId = useRef<string | null>(null);
  const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const title = type === "report" ? "Upload Credit Report" : "Upload Debt Letter";
  const subtitle = type === "report"
    ? "Upload your credit report PDF from Equifax, Experian, or TransUnion."
    : "Upload a letter from a creditor, collector, or bureau. PDF or photo.";

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError("");
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      if (isValidFile(dropped, type)) setFile(dropped);
      else setError(type === "report" ? "Please upload a PDF file" : "Please upload a PDF or image (JPG, PNG, WebP)");
    }
  }, [type]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const selected = e.target.files?.[0];
    if (selected) {
      if (isValidFile(selected, type)) setFile(selected);
      else setError(type === "report" ? "Please upload a PDF file" : "Please upload a PDF or image (JPG, PNG, WebP)");
    }
  };

  useEffect(() => {
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, []);

  const startPolling = useCallback((reportId: string) => {
    pollingReportId.current = reportId;
    let attempts = 0;
    const MAX_ATTEMPTS = 120; // 10 minutes at 5s intervals
    pollingInterval.current = setInterval(async () => {
      attempts++;
      if (attempts > MAX_ATTEMPTS) {
        clearInterval(pollingInterval.current!);
        setReportStatus("error");
        setReportError("Analysis is taking longer than expected. We'll notify you by email when it's ready.");
        return;
      }
      try {
        const res = await fetch(`/api/reports/status?reportId=${reportId}`);
        if (!res.ok) return;
        const data = await res.json();
        const s = (data.status as string || "").toLowerCase();
        if (s === "analyzed") {
          clearInterval(pollingInterval.current!);
          setReportStatus("analyzed");
          setTimeout(() => router.push("/disputes"), 1500);
        } else if (s === "error") {
          clearInterval(pollingInterval.current!);
          setReportStatus("error");
          setReportError(data.errorMessage || "Analysis failed. Please try again.");
        } else if (s === "analyzing") {
          setReportStatus("analyzing");
        }
      } catch { /* ignore */ }
    }, 5000);
  }, []);

  const handleSubmit = async () => {
    if (!file || !user) return;
    setSubmitting(true);
    setError("");
    try {
      if (type === "report") {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("bureau", detectBureau(file.name));
        const uploadRes = await fetch("/api/reports/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${user.idToken}` },
          body: formData,
        });
        if (!uploadRes.ok) {
          const d = await uploadRes.json().catch(() => ({}));
          throw new Error(d.error || "Failed to upload file");
        }
        const { reportId } = await uploadRes.json();
        const analyzeRes = await fetch("/api/reports/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
          body: JSON.stringify({ reportId, simulateData: false }),
        });
        if (!analyzeRes.ok) {
          const d = await analyzeRes.json().catch(() => ({}));
          throw new Error(d.error || "Failed to start analysis");
        }
        startPolling(reportId);
      } else {
        const urlRes = await fetch("/api/letters/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
          body: JSON.stringify({ fileName: file.name, mimeType: file.type }),
        });
        if (!urlRes.ok) {
          const d = await urlRes.json().catch(() => ({}));
          throw new Error(d.error || "Failed to get upload URL");
        }
        const { uploadUrl, s3Key } = await urlRes.json();
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/pdf" },
        });
        if (!putRes.ok) throw new Error(`Upload failed: ${putRes.status}`);
        const analyzeRes = await fetch("/api/letters/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
          body: JSON.stringify({ s3Key, fileName: file.name, mimeType: file.type }),
        });
        if (!analyzeRes.ok) {
          const d = await analyzeRes.json().catch(() => ({}));
          throw new Error(d.error || "Failed to start analysis");
        }
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition" aria-label="Close">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {done ? (
          <div className="text-center py-6">
            {reportStatus === "error" ? (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">Analysis Failed</h2>
                <p className="text-sm text-slate-500 mb-6">{reportError}</p>
              </>
            ) : reportStatus === "analyzed" ? (
              <>
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">Analysis Complete!</h2>
                <p className="text-sm text-slate-500 mb-6">Your credit report has been analyzed. View your dispute items now.</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {type === "report" && (reportStatus === "analyzing" || reportStatus === "queued") ? (
                    <svg className="w-8 h-8 text-teal-600 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">
                  {type === "report" && reportStatus === "analyzing" ? "Analyzing your report…" : "We're on it!"}
                </h2>
                <p className="text-sm text-slate-500 mb-6">
                  {type === "report"
                    ? "Your credit report is being analyzed in the background. The page will automatically refresh once it's complete."
                    : "Your letter is being analyzed in the background. The page will automatically refresh once it's complete."}
                </p>
              </>
            )}
            <button
              onClick={onClose}
              className="w-full py-3 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl font-medium transition"
            >
              {reportStatus === "analyzed" ? "View Disputes" : "Got it"}
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500 mt-1 mb-4">{subtitle}</p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
            )}

            <div
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${
                dragActive ? "border-teal-500 bg-teal-50" : file ? "border-green-500 bg-green-50" : "border-slate-300 hover:border-slate-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div>
                  <p className="font-medium text-green-700 text-sm">{file.name}</p>
                  <p className="text-xs text-green-600 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button onClick={() => setFile(null)} className="mt-3 text-xs text-slate-500 hover:text-slate-700 underline">
                    Choose a different file
                  </button>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="font-medium text-sm">Tap to choose or drag a file here</p>
                  <p className="text-xs text-slate-400 mt-1">{type === "report" ? "PDF" : "PDF, JPG, PNG, WebP"}</p>
                  <input type="file" accept={type === "report" ? REPORT_ACCEPT : LETTER_ACCEPT} onChange={handleFileChange} className="sr-only" />
                </label>
              )}
            </div>

            {file && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full mt-4 py-3.5 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] hover:opacity-90 text-white rounded-xl font-medium transition disabled:opacity-50"
              >
                {submitting ? "Uploading..." : "Analyze"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

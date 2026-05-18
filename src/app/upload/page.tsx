"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";

export default function UploadPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [timedOut, setTimedOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Redirect if not logged in
  if (!authLoading && !user) {
    router.push("/login");
    return null;
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError("");

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf" || droppedFile.name.endsWith(".pdf")) {
        setFile(droppedFile);
      } else {
        setError("Please upload a PDF file");
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf" || selectedFile.name.endsWith(".pdf")) {
        setFile(selectedFile);
      } else {
        setError("Please upload a PDF file");
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);
    setError("");
    setProgress("Uploading credit report...");

    try {
      // Get a pre-signed S3 upload URL (bypasses API size limits)
      const urlRes = await fetch("/api/reports/get-upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.idToken}`,
        },
        body: JSON.stringify({ fileName: file.name }),
      });

      if (!urlRes.ok) {
        const errorData = await urlRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get upload URL");
      }

      const { uploadUrl, s3Key } = await urlRes.json();

      // Upload directly to S3 (bypasses Next.js API size limits)
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "application/pdf" },
      });

      if (!putRes.ok) {
        throw new Error(`S3 upload failed: ${putRes.status} ${putRes.statusText}`);
      }

      setProgress("Creating report record...");

      // Create report record with S3 key
      const createRes = await fetch("/api/reports/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.idToken}`,
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          bureau: detectBureau(file.name),
          s3Key,
        }),
      });

      if (!createRes.ok) {
        const errorData = await createRes.json().catch(() => ({}));
        const reason = errorData.reason ? ` (${errorData.reason})` : "";
        throw new Error((errorData.details || errorData.error || "Failed to create report") + reason);
      }

      const { reportId } = await createRes.json();

      setProgress("Starting analysis...");
      setAnalyzing(true);

      // Trigger background Lambda analysis (returns immediately with status: "processing")
      const analyzeRes = await fetch("/api/reports/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.idToken}`,
        },
        body: JSON.stringify({ reportId, simulateData: false }),
      });

      if (!analyzeRes.ok) {
        const errorData = await analyzeRes.json().catch(() => ({}));
        if (analyzeRes.status === 429) {
          throw new Error(errorData.error || "Daily upload limit reached. Please try again tomorrow.");
        }
        throw new Error(errorData.details || errorData.error || "Failed to start analysis");
      }

      // Poll for completion — Lambda runs in background, updates Firestore when done
      setProgress("Analyzing credit report... (this may take a few minutes for large reports)");

      const POLL_INTERVAL = 4000; // 4 seconds
      const MAX_WAIT = 10 * 60 * 1000; // 10 minutes
      const startTime = Date.now();

      await new Promise<void>((resolve, reject) => {
        const poll = async () => {
          if (Date.now() - startTime > MAX_WAIT) {
            reject(new Error("__TIMEOUT__"));
            return;
          }

          try {
            const statusRes = await fetch(`/api/reports/status?reportId=${reportId}`, {
              headers: { Authorization: `Bearer ${user.idToken}` },
            });
            const { status, errorMessage } = await statusRes.json();

            if (status === "ANALYZED") {
              resolve();
            } else if (status === "ERROR") {
              reject(new Error(errorMessage || "Analysis failed. Please try again."));
            } else {
              // Still ANALYZING — update progress message with elapsed time
              const elapsed = Math.round((Date.now() - startTime) / 1000);
              setProgress(`Analyzing credit report... (${elapsed}s elapsed)`);
              setTimeout(poll, POLL_INTERVAL);
            }
          } catch {
            setTimeout(poll, POLL_INTERVAL);
          }
        };
        setTimeout(poll, POLL_INTERVAL);
      });

      setProgress("Analysis complete! Generating action plan...");

      // Plan is generated by the Lambda, but call generate in case it's needed
      const planRes = await fetch("/api/plans/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.idToken}`,
        },
        body: JSON.stringify({ reportId }),
      });

      if (!planRes.ok) {
        console.warn("Plan generation failed, continuing to dashboard");
        setProgress("Report analyzed! Action plan generation failed — your disputes are still ready to view.");
      } else {
        setProgress("Complete! Redirecting to dashboard...");
      }

      // Fire-and-forget change detection — compare against previous report
      fetch("/api/reports/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
        body: JSON.stringify({ reportId }),
      }).catch(() => {});

      // Redirect to dashboard
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err) {
      console.error("Upload error:", err);
      const message = err instanceof Error ? err.message : String(err);
      if (message === "__TIMEOUT__") {
        setTimedOut(true);
      } else {
        setError(`Failed to process report: ${message}`);
      }
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const detectBureau = (fileName: string): string => {
    const lower = fileName.toLowerCase();
    if (lower.includes("equifax")) return "EQUIFAX";
    if (lower.includes("experian")) return "EXPERIAN";
    if (lower.includes("transunion")) return "TRANSUNION";
    return "UNKNOWN";
  };


  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthenticatedLayout activeNav="upload">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Upload Credit Report</h1>
        <p className="text-slate-600 mb-6 sm:mb-8 text-sm sm:text-base">
          Upload your credit report PDF from Equifax, Experian, or TransUnion. Credit 800 will analyze it and identify disputable items.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {!uploading ? (
          <>
            <div
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition ${
                dragActive
                  ? "border-teal-500 bg-teal-50"
                  : file
                  ? "border-green-500 bg-green-50"
                  : "border-slate-300 hover:border-slate-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="font-medium text-green-700">{file.name}</p>
                  <p className="text-sm text-green-600 mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    onClick={() => setFile(null)}
                    className="mt-4 text-sm text-slate-500 hover:text-slate-700"
                  >
                    Remove and choose another
                  </button>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="font-medium">Drag and drop your credit report PDF</p>
                  <p className="text-sm text-slate-500 mt-1">or click to browse</p>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
              )}
            </div>

            {file && (
              <button
                onClick={handleUpload}
                className="w-full mt-6 py-3.5 sm:py-4 bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600 hover:from-lime-400 hover:via-teal-400 hover:to-cyan-500 text-white rounded-xl font-medium transition text-base sm:text-lg"
              >
                Analyze Report
              </button>
            )}

            <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-slate-50 rounded-xl">
              <h3 className="font-semibold mb-3">Supported Reports</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Equifax Credit Report
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Experian Credit Report
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  TransUnion Credit Report
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  AnnualCreditReport.com Reports
                </li>
              </ul>
            </div>

          </>
        ) : timedOut ? (
          <div className="text-center py-10 sm:py-16">
            <div className="w-16 sm:w-20 h-16 sm:h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold mb-2">Still Processing</h2>
            <p className="text-slate-600 mb-2">
              Your report is taking longer than usual to analyze. This can happen with larger reports.
            </p>
            <p className="text-slate-500 text-sm mb-6">
              Analysis continues in the background — check your dashboard in a few minutes.
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600 text-white rounded-xl font-medium"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="text-center py-10 sm:py-16">
            <div className="w-16 sm:w-20 h-16 sm:h-20 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-lg sm:text-xl font-semibold mb-2">
              {analyzing ? "Analyzing Your Report" : "Uploading..."}
            </h2>
            <p className="text-slate-600">{progress}</p>

            <div className="mt-8 max-w-md mx-auto">
              <div className="flex justify-between text-sm text-slate-500 mb-2">
                <span>Progress</span>
                <span>{analyzing ? "75%" : "25%"}</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-lime-500 to-teal-600 transition-all duration-1000"
                  style={{ width: analyzing ? "75%" : "25%" }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </main>
    </AuthenticatedLayout>
  );
}

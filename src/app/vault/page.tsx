"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { ProGate } from "@/components/ProGate";

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  blobUrl: string;
  category: string;
  uploadedAt: string;
}

const categoryLabels: Record<string, string> = {
  credit_reports: "Credit Reports",
  dispute_letters: "Dispute Letters",
  responses: "Responses",
  identity: "Identity",
  correspondence: "Correspondence",
  other: "Other",
};

export default function VaultPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [dragOver, setDragOver] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/vault", {
        headers: { Authorization: `Bearer ${user.idToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setDocuments(
        (data.documents || []).map((d: Record<string, unknown>) => ({
          id: d.id as string,
          name: (d.name as string) || "Unnamed",
          type: (d.type as string) || "",
          size: (d.size as number) || 0,
          blobUrl: (d.blobUrl as string) || "",
          category: (d.category as string) || "other",
          uploadedAt: (d.uploadedAt as string) || "",
        }))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
    if (user) fetchDocuments();
  }, [user, authLoading, router, fetchDocuments]);

  const handleUpload = async (files: FileList | null, category: string = "other") => {
    if (!files || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", file.name);
        formData.append("category", category);
        await fetch("/api/vault", {
          method: "POST",
          headers: { Authorization: `Bearer ${user.idToken}` },
          body: formData,
        });
      }
      await fetchDocuments();
    } catch (err) {
      console.error(err);
      alert("Failed to upload file(s).");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!user || !confirm("Delete this document permanently?")) return;
    setDeleting(docId);
    try {
      await fetch(`/api/vault?documentId=${docId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user.idToken}` },
      });
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete document.");
    } finally {
      setDeleting(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filtered = activeCategory === "all" ? documents : documents.filter((d) => d.category === activeCategory);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1a3fd4] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthenticatedLayout activeNav="vault">
      <ProGate feature="Document Vault">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] bg-clip-text text-transparent">
              Document Vault
            </h1>
            <p className="text-slate-500 text-sm mt-1">Securely store your credit-related documents.</p>
          </div>

          {/* Upload Area */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
            className={`border-2 border-dashed rounded-2xl p-5 sm:p-8 text-center mb-5 transition ${
              dragOver ? "border-teal-500 bg-teal-50" : "border-slate-300 bg-white hover:border-slate-400"
            }`}
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-3 py-2">
                <div className="w-6 h-6 border-2 border-[#1a3fd4] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-slate-600 text-sm font-medium">Uploading...</span>
              </div>
            ) : (
              <>
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-slate-600 text-sm mb-1 hidden sm:block">Drag &amp; drop files here or</p>
                <p className="text-slate-600 text-sm mb-1 sm:hidden">Upload your documents</p>
                <label className="inline-block px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-teal-700 transition mt-1">
                  Browse Files
                  <input type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />
                </label>
                <p className="text-xs text-slate-400 mt-2">PDF, images, and documents up to 10MB</p>
              </>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition ${
                activeCategory === "all" ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              All ({documents.length})
            </button>
            {Object.entries(categoryLabels).map(([key, label]) => {
              const count = documents.filter((d) => d.category === key).length;
              if (count === 0) return null;
              return (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition ${
                    activeCategory === key ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600"
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>

          {/* Documents List */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center">
              <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <p className="text-slate-500 text-sm">No documents yet. Upload your first file above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((doc) => (
                <div key={doc.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{doc.name}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{categoryLabels[doc.category] || doc.category}</span>
                        <span className="text-xs text-slate-400">{formatSize(doc.size)}</span>
                        <span className="text-xs text-slate-400">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <a
                      href={doc.blobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-2 text-xs font-medium text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-50 transition"
                    >
                      Download
                    </a>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deleting === doc.id}
                      className="flex-1 py-2 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                    >
                      {deleting === doc.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </ProGate>
    </AuthenticatedLayout>
  );
}

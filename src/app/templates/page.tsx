"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { ProGate } from "@/components/ProGate";
import { letterTemplates, TEMPLATE_CATEGORIES, type LetterTemplate } from "@/lib/letter-templates";

const BUREAUS = ["Equifax", "Experian", "TransUnion"];

interface GenerateForm {
  consumerName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  creditorName: string;
  accountNumber: string;
  bureau: string;
  reason: string;
  date: string;
}

const DEFAULT_FORM: GenerateForm = {
  consumerName: "", address: "", city: "", state: "", zip: "",
  creditorName: "", accountNumber: "", bureau: BUREAUS[0],
  reason: "", date: new Date().toISOString().slice(0, 10),
};

const INPUT = "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";

export default function TemplatesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate | null>(null);
  const [form, setForm] = useState<GenerateForm>(DEFAULT_FORM);
  const [copied, setCopied] = useState(false);
  const [savingVault, setSavingVault] = useState(false);
  const [savedVault, setSavedVault] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/users/profile", { headers: { Authorization: `Bearer ${user.idToken}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          setForm((f) => ({
            ...f,
            consumerName: d.profile.fullName || "",
            address: d.profile.address || "",
            city: d.profile.city || "",
            state: d.profile.state || "",
            zip: d.profile.zip || "",
          }));
        }
      })
      .catch(() => {});
  }, [user]);

  const filtered = letterTemplates.filter((t) => {
    const matchCat = category === "all" || t.category === category;
    const matchSearch = !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.useCase.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const generatedLetter = selectedTemplate
    ? selectedTemplate.generate({
        ...form,
        date: form.date
          ? new Date(form.date + "T12:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
          : undefined,
      })
    : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveVault = async () => {
    if (!user || !selectedTemplate) return;
    setSavingVault(true);
    setSavedVault(false);
    try {
      const blob = new Blob([generatedLetter], { type: "text/plain" });
      const formData = new FormData();
      const fileName = `${selectedTemplate.title.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.txt`;
      formData.append("file", blob, fileName);
      formData.append("name", fileName);
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { Authorization: `Bearer ${user.idToken}` },
        body: formData,
      });
      if (res.ok) setSavedVault(true);
    } catch {
      // ignore
    } finally {
      setSavingVault(false);
    }
  };

  const CATEGORY_BADGE_COLORS: Record<string, string> = {
    bureau_dispute: "bg-blue-100 text-blue-700",
    goodwill: "bg-purple-100 text-purple-700",
    pay_for_delete: "bg-amber-100 text-amber-700",
    debt_validation: "bg-blue-50 text-[#1a3fd4]",
    cease_desist: "bg-red-100 text-red-700",
    method_of_verification: "bg-slate-100 text-slate-700",
    inquiry_removal: "bg-lime-100 text-lime-700",
  };

  return (
    <AuthenticatedLayout activeNav="templates">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">Dispute Letter Templates</h1>
        <p className="text-slate-500 text-sm mb-6">
          FCRA &amp; FDCPA compliant templates. Fill in your details and generate a personalized letter instantly.
        </p>

        <ProGate feature="Letter Templates Library">
          {/* Category — select on mobile, tabs on sm+ */}
          <div className="sm:hidden mb-4">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {TEMPLATE_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div className="hidden sm:flex gap-2 overflow-x-auto pb-1 mb-4">
            {TEMPLATE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition ${
                  category === cat.id
                    ? "bg-teal-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-5">
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Template grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t) => (
              <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-slate-800 text-sm leading-snug">{t.title}</h3>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${CATEGORY_BADGE_COLORS[t.category]}`}>
                    {t.categoryLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-2 flex-1">{t.description}</p>
                <p className="text-xs text-slate-400 italic mb-3">{t.useCase}</p>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-xs text-teal-600 font-mono">{t.legalBasis}</span>
                  <button
                    onClick={() => { setSelectedTemplate(t); setCopied(false); setSavedVault(false); }}
                    className="w-full sm:w-auto text-center text-xs px-4 py-2 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-lg font-medium hover:opacity-90 transition"
                  >
                    Use Template
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 text-sm">
                No templates match your search.
              </div>
            )}
          </div>
        </ProGate>
      </main>

      {/* Generate Modal — bottom sheet on mobile, centered on sm+ */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center sm:justify-center sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
            {/* Modal header */}
            <div className="bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] px-4 sm:px-6 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-white font-semibold">{selectedTemplate.title}</h2>
              <button onClick={() => setSelectedTemplate(null)} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
            </div>

            {/* Scrollable form */}
            <div className="overflow-y-auto flex-1">
              <div className="p-4 sm:p-6 space-y-5">
                {/* Your Info */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Your Information</p>
                  <div className="space-y-2.5">
                    <input type="text" placeholder="Full Name" value={form.consumerName}
                      onChange={(e) => setForm((f) => ({ ...f, consumerName: e.target.value }))}
                      className={INPUT} />
                    <input type="text" placeholder="Street Address" value={form.address}
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      className={INPUT} />
                    <div className="flex gap-2">
                      <input type="text" placeholder="City" value={form.city}
                        onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                        className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                      <input type="text" placeholder="ST" value={form.state} maxLength={2}
                        onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))}
                        className="w-14 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-center" />
                      <input type="text" placeholder="ZIP" value={form.zip}
                        onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))}
                        className="w-24 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                  </div>
                </div>

                {/* Account Info */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Account Information</p>
                  <div className="space-y-2.5">
                    <input type="text" placeholder="Creditor / Collector Name" value={form.creditorName}
                      onChange={(e) => setForm((f) => ({ ...f, creditorName: e.target.value }))}
                      className={INPUT} />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input type="text" placeholder="Account Number" value={form.accountNumber}
                        onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                        className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                      <select value={form.bureau} onChange={(e) => setForm((f) => ({ ...f, bureau: e.target.value }))}
                        className="w-full sm:w-auto px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                        {BUREAUS.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <input type="text" placeholder="Reason / dispute details" value={form.reason}
                      onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                      className={INPUT} />
                    <input type="date" value={form.date}
                      onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                      className={INPUT} />
                  </div>
                </div>

                {/* Letter preview */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Letter Preview</p>
                  <textarea
                    readOnly
                    value={generatedLetter}
                    rows={8}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-mono bg-slate-50 focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="border-t border-slate-100 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row gap-2 sm:gap-3 shrink-0">
              <button
                onClick={handleCopy}
                className="flex-1 py-3 sm:py-2.5 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl text-sm font-medium hover:opacity-90 transition"
              >
                {copied ? "Copied!" : "Copy to Clipboard"}
              </button>
              <button
                onClick={handleSaveVault}
                disabled={savingVault}
                className="flex-1 py-3 sm:py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition disabled:opacity-50"
              >
                {savingVault ? "Saving..." : savedVault ? "Saved to Vault!" : "Save to Vault"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthenticatedLayout>
  );
}

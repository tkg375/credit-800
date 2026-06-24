"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { ProGate } from "@/components/ProGate";
import { cfpbComplaintTypes, type CFPBComplaintType } from "@/lib/cfpb-templates";

function CFPBComplaintContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedType, setSelectedType] = useState<CFPBComplaintType | null>(null);
  const [creditorName, setCreditorName] = useState(searchParams.get("creditor") || "");
  const [bureau, setBureau] = useState(searchParams.get("bureau") || "");
  const [accountNumber, setAccountNumber] = useState(searchParams.get("account") || "");
  const [reason, setReason] = useState(searchParams.get("reason") || "");
  const [originalDisputeDate, setOriginalDisputeDate] = useState(searchParams.get("disputeDate") || "");
  const [consumerName, setConsumerName] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [generatedComplaint, setGeneratedComplaint] = useState("");
  const [copied, setCopied] = useState(false);
  const [showMailForm, setShowMailForm] = useState(false);
  const [mailing, setMailing] = useState(false);
  const [mailSent, setMailSent] = useState(false);
  const [mailName, setMailName] = useState("");
  const [mailAddress, setMailAddress] = useState("");
  const [mailCity, setMailCity] = useState("");
  const [mailState, setMailState] = useState("");
  const [mailZip, setMailZip] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Load user profile for consumer name and address
  useEffect(() => {
    if (!user) return;
    fetch("/api/users/profile", {
      headers: { Authorization: `Bearer ${user.idToken}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.profile?.fullName) setConsumerName(data.profile.fullName);
        if (data.profile?.fullName) setMailName(data.profile.fullName);
        if (data.profile?.address) setMailAddress(data.profile.address);
        if (data.profile?.city) setMailCity(data.profile.city);
        if (data.profile?.state) setMailState(data.profile.state);
        if (data.profile?.zip) setMailZip(data.profile.zip);
      })
      .catch(() => {});
  }, [user]);

  const handleMailCfpb = async () => {
    if (!mailName || !mailAddress || !mailCity || !mailState || !mailZip) {
      alert("Please fill in all return address fields.");
      return;
    }
    setMailing(true);
    try {
      const res = await fetch("/api/cfpb/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user!.idToken}` },
        body: JSON.stringify({
          complaintText: generatedComplaint,
          fromAddress: { name: mailName, address_line1: mailAddress, address_city: mailCity, address_state: mailState, address_zip: mailZip },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Failed to mail");
      setMailSent(true);
      setShowMailForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to mail complaint.");
    } finally {
      setMailing(false);
    }
  };

  const handleGenerate = () => {
    if (!selectedType) return;
    const complaint = selectedType.generateComplaint({
      creditorName,
      bureau,
      accountNumber,
      reason,
      originalDisputeDate,
      consumerName,
      additionalDetails,
    });
    setGeneratedComplaint(complaint);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedComplaint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1a3fd4] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthenticatedLayout activeNav="cfpb">
      <ProGate feature="CFPB Complaint Generator">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] bg-clip-text text-transparent">
            CFPB Complaint Generator
          </h1>
          <p className="text-slate-500 mt-2">
            Generate a formal complaint to submit to the Consumer Financial Protection Bureau
          </p>
        </div>

        {!generatedComplaint ? (
          <div className="space-y-6">
            {/* Complaint Type Selection */}
            <div>
              <h2 className="text-lg font-semibold mb-3">1. Select Complaint Type</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {cfpbComplaintTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type)}
                    className={`p-4 rounded-xl border-2 text-left transition ${
                      selectedType?.id === type.id
                        ? "border-teal-500 bg-teal-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <h3 className="font-medium text-sm">{type.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {selectedType && (
              <>
                {/* Account Details */}
                <div>
                  <h2 className="text-lg font-semibold mb-3">2. Account Details</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
                      <input
                        type="text"
                        value={consumerName}
                        onChange={(e) => setConsumerName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                        placeholder="Full legal name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Creditor/Company Name</label>
                      <input
                        type="text"
                        value={creditorName}
                        onChange={(e) => setCreditorName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                        placeholder="e.g., Capital One"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Credit Bureau</label>
                      <select
                        value={bureau}
                        onChange={(e) => setBureau(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                      >
                        <option value="">Select bureau...</option>
                        <option value="Equifax">Equifax</option>
                        <option value="Experian">Experian</option>
                        <option value="TransUnion">TransUnion</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Account Number (last 4)</label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                        placeholder="XXXX"
                        maxLength={4}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Original Dispute Date</label>
                      <input
                        type="date"
                        value={originalDisputeDate}
                        onChange={(e) => setOriginalDisputeDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Dispute Reason</label>
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                        placeholder="Brief description of the issue"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Additional Details (optional)</label>
                      <textarea
                        value={additionalDetails}
                        onChange={(e) => setAdditionalDetails(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                        placeholder="Any additional context or supporting information"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!creditorName || !bureau || !reason || !consumerName}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50"
                >
                  Generate CFPB Complaint
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Generated Complaint</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  {mailSent ? (
                    <span className="px-4 py-2 text-sm bg-blue-50 text-[#1a3fd4] rounded-lg font-medium">✓ Mailed to CFPB</span>
                  ) : (
                    <button
                      onClick={() => setShowMailForm(!showMailForm)}
                      className="px-4 py-2 text-sm bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-lg hover:opacity-90 transition"
                    >
                      Mail to CFPB via USPS
                    </button>
                  )}
                  <button
                    onClick={() => setGeneratedComplaint("")}
                    className="px-4 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition"
                  >
                    Edit
                  </button>
                </div>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono bg-slate-50 p-4 rounded-lg max-h-[500px] overflow-y-auto">
                {generatedComplaint}
              </pre>
            </div>

            {showMailForm && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold mb-1">Your Return Address</h3>
                <p className="text-xs text-slate-500 mb-4">We&apos;ll mail your complaint directly to the CFPB at PO Box 27170, Washington DC 20038.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <input type="text" placeholder="Full Name *" value={mailName} onChange={e => setMailName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <input type="text" placeholder="Street Address *" value={mailAddress} onChange={e => setMailAddress(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <input type="text" placeholder="City *" value={mailCity} onChange={e => setMailCity(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  <div className="flex gap-2">
                    <input type="text" placeholder="State *" value={mailState} onChange={e => setMailState(e.target.value)} maxLength={2} className="w-16 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                    <input type="text" placeholder="ZIP *" value={mailZip} onChange={e => setMailZip(e.target.value)} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                </div>
                <button
                  onClick={handleMailCfpb}
                  disabled={mailing}
                  className="mt-4 w-full py-2.5 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {mailing ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Mailing...</> : "Confirm & Mail to CFPB"}
                </button>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="font-medium text-amber-800 mb-2">How to Submit</h3>
              <ol className="list-decimal list-inside text-sm text-amber-700 space-y-1">
                <li>Copy the complaint text above</li>
                <li>Visit <strong>consumerfinance.gov/complaint</strong></li>
                <li>Select &quot;Credit reporting&quot; as the product</li>
                <li>Follow the steps and paste your complaint in the narrative section</li>
                <li>Attach any supporting documentation (dispute letters, responses, etc.)</li>
                <li>Submit and save your confirmation number</li>
              </ol>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">
                <strong>Disclaimer:</strong> This tool generates complaint text for educational purposes.
                Review and customize the complaint before submitting. Credit 800 does not submit complaints
                on your behalf and is not responsible for the outcome of any complaint you file.
              </p>
            </div>
          </div>
        )}
      </main>
      </ProGate>
    </AuthenticatedLayout>
  );
}

export default function CFPBComplaintPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1a3fd4] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <CFPBComplaintContent />
    </Suspense>
  );
}

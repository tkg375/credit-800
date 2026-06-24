"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/lib/use-subscription";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { downloadCSV } from "@/lib/export-csv";
import { UploadModal } from "@/components/UploadModal";

interface RemovalStrategy {
  method: string;
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  successRate: string;
}

interface ReportItem {
  id: string;
  creditorName: string;
  originalCreditor: string | null;
  accountNumber: string;
  accountType: string;
  balance: number;
  originalBalance: number | null;
  status: string;
  dateOfFirstDelinquency: string | null;
  lastActivityDate: string | null;
  isDisputable: boolean;
  disputeReason: string | null;
  removalStrategies: RemovalStrategy[];
  bureau: string;
}

interface Dispute {
  id: string;
  itemId: string;
  creditorName: string;
  bureau: string;
  reason: string;
  status: string;
  letterContent: string | null;
  createdAt: Date;
  addressSource: string | null;
  addressConfidence: string | null;
  mailJobId: string | null;
  mailStatus: string | null;
  mailError: string | null;
  mailedAt: string | null;
  mailTracking: { barcode?: string; status?: string; lastUpdate?: string; trackingNumber?: string } | null;
  resolvedAt: Date | null;
  outcome: "won" | "denied" | null;
  escalationRound: number | null;
  escalatedToId: string | null;
  bureauResponse: string | null;
  responseReceivedAt: string | null;
  bureauResponseOutcome: "deleted" | "verified" | "updated" | "no_response" | null;
}

function estimateScoreImpact(item: ReportItem): string {
  const type = (item.accountType || "").toLowerCase();
  const status = (item.status || "").toLowerCase();
  if (type.includes("collection") || status.includes("collection")) return "~20-50 pts";
  if (type.includes("charge") || status.includes("charge") || status.includes("written")) return "~10-35 pts";
  if (type.includes("bankruptcy") || status.includes("bankruptcy")) return "~30-80 pts";
  if (status.includes("late") || status.includes("delinquent")) return "~5-15 pts";
  if (type.includes("utilization") || type.includes("revolving")) return "~10-40 pts";
  if (type.includes("judgment") || type.includes("lien") || status.includes("judgment")) return "~15-45 pts";
  if (status.includes("default")) return "~10-30 pts";
  return "~5-20 pts";
}

function getDeadlineChip(dispute: Dispute): { label: string; color: string } | null {
  if (dispute.status !== "SENT" || !dispute.mailedAt) return null;
  const daysSince = Math.floor((Date.now() - new Date(dispute.mailedAt).getTime()) / (1000 * 60 * 60 * 24));
  const daysLeft = 30 - daysSince;
  if (daysLeft <= 0) return { label: `${Math.abs(daysLeft)}d overdue`, color: "bg-red-100 text-red-700" };
  if (daysLeft <= 5) return { label: `${daysLeft}d left`, color: "bg-orange-100 text-orange-700" };
  if (daysLeft <= 10) return { label: `${daysLeft}d left`, color: "bg-amber-100 text-amber-700" };
  return { label: `${daysLeft}d left`, color: "bg-slate-100 text-slate-600" };
}

export default function DisputesPageWrapper() {
  return <Suspense><DisputesPage /></Suspense>;
}

function DisputesPage() {
  const { user, loading: authLoading } = useAuth();
  const { isPro } = useSubscription();
  const router = useRouter();
  const [uploadModalType, setUploadModalType] = useState<"report" | "letter" | null>(null);
  const [activeTab, setActiveTab] = useState<"disputable" | "disputes" | "history">("disputable");
  const [disputableItems, setDisputableItems] = useState<ReportItem[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const searchParams = useSearchParams();
  const highlightItemId = searchParams.get("item");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<string | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [strategyPicker, setStrategyPicker] = useState<string | null>(null);
  const [mailing, setMailing] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState<string | null>(null);
  const [escalating, setEscalating] = useState<string | null>(null);
  const [showMailForm, setShowMailForm] = useState(false);
  const [isReattempt, setIsReattempt] = useState(false);
  const [mailFormName, setMailFormName] = useState("");
  const [mailFormAddress, setMailFormAddress] = useState("");
  const [mailFormAddress2, setMailFormAddress2] = useState("");
  const [mailFormCity, setMailFormCity] = useState("");
  const [mailFormState, setMailFormState] = useState("");
  const [mailFormZip, setMailFormZip] = useState("");
  const [userProfile, setUserProfile] = useState<{ fullName: string; address: string; address2?: string; city: string; state: string; zip: string } | null>(null);
  const [toName, setToName] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [toAddress2, setToAddress2] = useState("");
  const [toCity, setToCity] = useState("");
  const [toState, setToState] = useState("");
  const [toZip, setToZip] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [settingOutcome, setSettingOutcome] = useState<string | null>(null);
  const [refreshingTracking, setRefreshingTracking] = useState<string | null>(null);
  // Dispute response tracker state
  const [logResponseFor, setLogResponseFor] = useState<Dispute | null>(null);
  const [responseOutcome, setResponseOutcome] = useState<"deleted" | "verified" | "updated" | "no_response">("no_response");
  const [responseNotes, setResponseNotes] = useState("");
  const [responseDate, setResponseDate] = useState(new Date().toISOString().split("T")[0]);
  const [savingResponse, setSavingResponse] = useState(false);
  // Response letter parser state
  const [parsedResult, setParsedResult] = useState<{
    outcome?: string; creditorName?: string; bureauName?: string; responseDate?: string; keyLanguage?: string;
  } | null>(null);
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    async function loadData() {
      try {
        // Fetch user profile for mail form
        try {
          const profileRes = await fetch("/api/users/profile", {
            headers: { Authorization: `Bearer ${user!.idToken}` },
          });
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            if (profileData.profile) {
              setUserProfile(profileData.profile);
            }
          }
        } catch { /* non-blocking */ }

        // Load ALL report items to analyze for removal
        const itemsRes = await fetch("/api/data/reportItems", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${user!.idToken}` },
          body: JSON.stringify({}),
        });
        const itemsData = await itemsRes.json() as { documents?: (Record<string, unknown> & { id: string })[] };
        const items = itemsData.documents || [];
        setDisputableItems(
          items
            .filter((item: Record<string, unknown>) => item.isDisputable === true)
            .map((item: Record<string, unknown> & { id: string }) => ({
              id: item.id,
              creditorName: item.creditorName as string,
              originalCreditor: (item.originalCreditor as string) || null,
              accountNumber: item.accountNumber as string,
              accountType: item.accountType as string,
              balance: item.balance as number,
              originalBalance: (item.originalBalance as number) || null,
              status: item.status as string,
              dateOfFirstDelinquency: (item.dateOfFirstDelinquency as string) || null,
              lastActivityDate: (item.lastActivityDate as string) || null,
              isDisputable: item.isDisputable as boolean,
              disputeReason: item.disputeReason as string | null,
              removalStrategies: (item.removalStrategies as RemovalStrategy[]) || [],
              bureau: item.bureau as string,
            }))
        );

        // Load existing disputes
        const disputesRes = await fetch("/api/data/disputes", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${user!.idToken}` },
          body: JSON.stringify({}),
        });
        const disputesData = await disputesRes.json() as { documents?: Record<string, unknown>[] };
        const disputeDocs = (disputesData.documents || []) as (Record<string, unknown> & { id: string })[];
        setDisputes(
          disputeDocs.map((d: Record<string, unknown> & { id: string }) => {
            const addrData = d.creditorAddress as Record<string, unknown> | null;
            // Detect address source from Firestore data
            let addressSource: string | null = null;
            let addressConfidence: string | null = null;
            if (addrData && typeof addrData === "object") {
              if (addrData.source) {
                addressSource = addrData.source as string;
                addressConfidence = (addrData.confidence as string) || null;
              } else if (addrData.address || addrData.name) {
                // Address exists but no source metadata — treat as database
                addressSource = "database";
              }
            } else if (d.letterContent && typeof d.letterContent === "string" && !String(d.letterContent).includes("[Insert Creditor")) {
              // Letter has a real address but no creditorAddress object
              addressSource = "database";
            }
            const mailTrackingData = d.mailTracking as Record<string, unknown> | null;
            return {
              id: d.id,
              itemId: d.itemId as string,
              creditorName: d.creditorName as string,
              bureau: d.bureau as string,
              reason: d.reason as string,
              status: d.status as string,
              letterContent: d.letterContent as string | null,
              createdAt: d.createdAt as Date,
              addressSource,
              addressConfidence,
              mailJobId: (d.mailJobId as string) || null,
              mailStatus: (d.mailStatus as string) || null,
              mailError: (d.mailError as string) || null,
              mailedAt: (d.mailedAt as string) || null,
              mailTracking: mailTrackingData ? {
                barcode: (mailTrackingData.barcode as string) || undefined,
                status: (mailTrackingData.status as string) || undefined,
                lastUpdate: (mailTrackingData.lastUpdate as string) || undefined,
              } : null,
              resolvedAt: (d.resolvedAt as Date) || null,
              outcome: (d.outcome as "won" | "denied") || null,
              escalationRound: (d.escalationRound as number) || null,
              escalatedToId: (d.escalatedToId as string) || null,
              bureauResponse: (d.bureauResponse as string) || null,
              responseReceivedAt: (d.responseReceivedAt as string) || null,
              bureauResponseOutcome: (d.bureauResponseOutcome as "deleted" | "verified" | "updated" | "no_response") || null,
            };
          })
        );

        // Fire-and-forget: check escalation notifications
        checkEscalationNotifications(user!.idToken, disputeDocs);

      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    }

    // Scroll to and highlight item linked from bureaus page
    if (highlightItemId) {
      setTimeout(() => {
        const el = itemRefs.current[highlightItemId];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 600);
    }

    async function checkEscalationNotifications(idToken: string, disputeDocs: Record<string, unknown>[]) {
      try {
        const now = Date.now();
        // Find SENT disputes with no escalatedToId and 30+ days since sent
        const eligible = disputeDocs.filter((d) => {
          if (d.status !== "SENT") return false;
          if (d.escalatedToId) return false;
          const ref = (d.mailedAt as string) || (d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt));
          if (!ref) return false;
          const daysSince = (now - new Date(ref).getTime()) / (1000 * 60 * 60 * 24);
          return daysSince >= 30;
        });
        if (eligible.length === 0) return;

        // Fetch existing escalation_ready notifications to dedupe
        const existingRes = await fetch("/api/notifications", {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const existingData = existingRes.ok ? await existingRes.json() : { notifications: [] };
        const existingUrls = new Set(
          (existingData.notifications || [])
            .filter((n: { type: string }) => n.type === "escalation_ready")
            .map((n: { actionUrl?: string }) => n.actionUrl)
        );

        for (const d of eligible) {
          const actionUrl = `/disputes#escalate-${d.id}`;
          if (existingUrls.has(actionUrl)) continue;

          const escalationRound = (d.escalationRound as number) || null;
          const round = escalationRound === 2 ? 3 : 2;

          await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({
              type: "escalation_ready",
              title: `Round ${round} escalation available`,
              message: `Your dispute with ${d.creditorName} has no response after 30 days. Escalate now.`,
              actionUrl,
            }),
          });

          // Send escalation ready email
          fetch("/api/disputes/notify-escalation", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ disputeId: d.id }),
          }).catch(() => {});
        }
      } catch {
        // non-blocking
      }
    }

    loadData();
  }, [user, authLoading, router]);

  const handleGenerateDispute = async (item: ReportItem, strategyMethod?: string) => {
    if (!user) return;

    setGenerating(item.id);
    setStrategyPicker(null);

    const reason = strategyMethod || item.disputeReason;

    try {
      const res = await fetch("/api/disputes/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.idToken}`,
        },
        body: JSON.stringify({
          itemId: item.id,
          creditorName: item.creditorName,
          accountNumber: item.accountNumber,
          bureau: item.bureau,
          reason,
          balance: item.balance,
        }),
      });

      if (res.status === 409) {
        const data = await res.json();
        throw new Error(data.error || "An active dispute already exists for this account.");
      }
      if (!res.ok) throw new Error("Failed to generate dispute");

      const data = await res.json();

      // Add new dispute to list
      setDisputes((prev) => [
        {
          id: data.disputeId,
          itemId: item.id,
          creditorName: item.creditorName,
          bureau: item.bureau,
          reason: reason || "Inaccurate information",
          status: "DRAFT",
          letterContent: data.letterContent,
          createdAt: new Date(),
          addressSource: data.addressSource || null,
          addressConfidence: data.addressConfidence || null,
          mailJobId: null,
          mailStatus: null,
          mailError: null,
          mailedAt: null,
          mailTracking: null,
          resolvedAt: null,
          outcome: null,
          escalationRound: null,
          escalatedToId: null,
          bureauResponse: null,
          responseReceivedAt: null,
          bureauResponseOutcome: null,
        },
        ...prev,
      ]);

      // Remove from disputable items
      setDisputableItems((prev) => prev.filter((i) => i.id !== item.id));

      setActiveTab("disputes");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate dispute letter.";
      alert(msg);
    } finally {
      setGenerating(null);
    }
  };

  const handleBulkGenerate = async () => {
    if (!user || selectedItemIds.size === 0 || bulkGenerating) return;
    const itemsToGenerate = disputableItems.filter((i) => selectedItemIds.has(i.id));
    if (itemsToGenerate.length === 0) return;

    setBulkGenerating(true);
    setBulkProgress({ done: 0, total: itemsToGenerate.length });
    setSelectedItemIds(new Set());

    for (let idx = 0; idx < itemsToGenerate.length; idx++) {
      const item = itemsToGenerate[idx];
      try {
        await handleGenerateDispute(item);
      } catch {
        // continue to next item even if one fails
      }
      setBulkProgress({ done: idx + 1, total: itemsToGenerate.length });
    }

    setBulkGenerating(false);
    setBulkProgress(null);
    setActiveTab("disputes");
  };

  const handleDeleteDispute = async (disputeId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this dispute?")) return;

    setDeleting(disputeId);

    try {
      const res = await fetch(`/api/data/disputes/${disputeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user.idToken}` },
      });

      if (!res.ok) {
        throw new Error("Failed to delete dispute");
      }

      // Remove from local state
      setDisputes((prev) => prev.filter((d) => d.id !== disputeId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete dispute. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!user) return;
    if (!confirm("Remove this item from your disputable list?")) return;

    setDeletingItem(itemId);

    try {
      const res = await fetch(`/api/data/reportItems/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user.idToken}` },
      });

      if (!res.ok) {
        throw new Error("Failed to delete item");
      }

      setDisputableItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete item. Please try again.");
    } finally {
      setDeletingItem(null);
    }
  };

  const handleResolveDispute = async (disputeId: string) => {
    if (!user) return;
    if (!confirm("Mark this dispute as resolved? It will be moved to your history.")) return;

    setResolving(disputeId);

    try {
      const now = new Date().toISOString();
      const res = await fetch(`/api/data/disputes/${disputeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
        body: JSON.stringify({ status: "RESOLVED", resolvedAt: now }),
      });

      if (!res.ok) throw new Error("Failed to resolve dispute");

      setDisputes((prev) =>
        prev.map((d) =>
          d.id === disputeId ? { ...d, status: "RESOLVED", resolvedAt: new Date(now) } : d
        )
      );
    } catch (err) {
      console.error(err);
      alert("Failed to mark dispute as resolved. Please try again.");
    } finally {
      setResolving(null);
    }
  };

  const handleSetOutcome = async (disputeId: string, outcome: "won" | "denied") => {
    if (!user) return;
    const dispute = disputes.find(d => d.id === disputeId);
    if (!dispute) return;

    // Toggle off if already set
    const newOutcome = dispute.outcome === outcome ? null : outcome;

    setSettingOutcome(disputeId);
    try {
        await fetch(`/api/data/disputes/${disputeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
        body: JSON.stringify({ outcome: newOutcome }),
      });
      setDisputes(prev => prev.map(d => d.id === disputeId ? { ...d, outcome: newOutcome } : d));
    } catch (err) {
      console.error(err);
    } finally {
      setSettingOutcome(null);
    }
  };

  const handleEscalate = async (disputeId: string) => {
    if (!user) return;
    const dispute = disputes.find(d => d.id === disputeId);
    if (!dispute) return;

    // Derive round from existing escalationRound
    const round = dispute.escalationRound === 2 ? 3 : 2;

    setEscalating(disputeId);
    try {
      const res = await fetch("/api/disputes/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
        body: JSON.stringify({ disputeId, round }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to escalate");

      // Add the new escalation dispute to the list
      const newDispute: Dispute = {
        id: data.disputeId,
        itemId: dispute.itemId,
        creditorName: dispute.creditorName,
        bureau: dispute.bureau,
        reason: `[Round ${round}] Method of Verification Demand`,
        status: "DRAFT",
        letterContent: data.letterContent,
        createdAt: new Date(),
        addressSource: dispute.addressSource,
        addressConfidence: dispute.addressConfidence,
        mailJobId: null,
        mailStatus: null,
        mailError: null,
        mailedAt: null,
        mailTracking: null,
        resolvedAt: null,
        outcome: null,
        escalationRound: round,
        escalatedToId: null,
        bureauResponse: null,
        responseReceivedAt: null,
        bureauResponseOutcome: null,
      };
      setDisputes(prev => [newDispute, ...prev.map(d => d.id === disputeId ? { ...d, escalatedToId: data.disputeId } : d)]);
      setSelectedDispute(newDispute);
      alert(`Round ${round} escalation letter created! Review and mail it to apply more pressure.`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to escalate dispute.");
    } finally {
      setEscalating(null);
    }
  };

  const handleMailLetter = async (disputeId: string) => {
    if (!user) return;

    // Pre-fill from user profile, then localStorage, then empty
    if (userProfile) {
      setMailFormName(userProfile.fullName || "");
      setMailFormAddress(userProfile.address || "");
      setMailFormAddress2(userProfile.address2 || "");
      setMailFormCity(userProfile.city || "");
      setMailFormState(userProfile.state || "");
      setMailFormZip(userProfile.zip || "");
    } else {
      const saved = localStorage.getItem("credit800_return_address");
      if (saved) {
        const parsed = JSON.parse(saved);
        setMailFormName(parsed.name || "");
        setMailFormAddress(parsed.address_line1 || "");
        setMailFormAddress2(parsed.address_line2 || "");
        setMailFormCity(parsed.address_city || "");
        setMailFormState(parsed.address_state || "");
        setMailFormZip(parsed.address_zip || "");
      } else {
        setMailFormName(user.displayName || "");
      }
    }
    setShowMailForm(true);
  };

  const handleConfirmMail = async () => {
    if (!user || !selectedDispute) return;
    if (!mailFormName || !mailFormAddress || !mailFormCity || !mailFormState || !mailFormZip) {
      alert("Please fill in all required return address fields.");
      return;
    }

    // If no creditor address on file, require manual recipient address
    const needsRecipient = !selectedDispute.addressSource;
    if (needsRecipient && (!toName || !toAddress || !toCity || !toState || !toZip)) {
      alert("Please fill in the recipient address fields.");
      return;
    }

    const disputeId = selectedDispute.id;
    const fromAddress = {
      name: mailFormName,
      address_line1: mailFormAddress,
      address_line2: mailFormAddress2,
      address_city: mailFormCity,
      address_state: mailFormState,
      address_zip: mailFormZip,
    };

    // Save return address for future use
    localStorage.setItem("credit800_return_address", JSON.stringify(fromAddress));

    // Build manual recipient address if needed
    const manualToAddress = needsRecipient ? {
      name: toName,
      address_line1: toAddress,
      address_line2: toAddress2,
      address_city: toCity,
      address_state: toState,
      address_zip: toZip,
    } : undefined;

    setShowMailForm(false);
    setIsReattempt(false);
    setMailing(disputeId);

    try {
      const res = await fetch("/api/disputes/mail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.idToken}`,
        },
        body: JSON.stringify({ disputeId, fromAddress, toAddress: manualToAddress }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.details || data.error || "Failed to mail letter");
      }

      // Update local state
      setDisputes((prev) =>
        prev.map((d) =>
          d.id === disputeId
            ? { ...d, mailJobId: data.mailJobId, mailStatus: "SUBMITTED", status: "SENT", mailedAt: new Date().toISOString() }
            : d
        )
      );

      // Also update selectedDispute if viewing
      if (selectedDispute?.id === disputeId) {
        setSelectedDispute((prev) =>
          prev ? { ...prev, mailJobId: data.mailJobId, mailStatus: "SUBMITTED", status: "SENT", mailedAt: new Date().toISOString() } : prev
        );
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to mail letter. Please try again.");
    } finally {
      setMailing(null);
    }
  };

  const handleClearMailError = async (disputeId: string) => {
    if (!user) return;

    try {
      await fetch(`/api/data/disputes/${disputeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
        body: JSON.stringify({ status: "DRAFT", mailJobId: null, mailStatus: null, mailError: null, mailDocumentId: null, mailAddressId: null }),
      });

      setDisputes((prev) =>
        prev.map((d) =>
          d.id === disputeId
            ? { ...d, mailJobId: null, mailStatus: null, mailError: null, status: "DRAFT" }
            : d
        )
      );
      if (selectedDispute?.id === disputeId) {
        setSelectedDispute((prev) =>
          prev ? { ...prev, mailJobId: null, mailStatus: null, mailError: null, status: "DRAFT" } : prev
        );
      }
    } catch (err) {
      console.error(err);
      alert("Failed to clear error. Please try again.");
    }
  };

  // Auto-sync PostGrid status whenever a mailed dispute is opened
  useEffect(() => {
    if (!selectedDispute?.mailJobId || !user) return;
    // Only skip if already at a truly final state the user has seen
    if (selectedDispute.mailStatus === "DELIVERED") return;

    fetch(`/api/disputes/mail/status?disputeId=${selectedDispute.id}`, {
      headers: { Authorization: `Bearer ${user.idToken}` },
    })
      .then(r => r.json())
      .then(data => {
        if (!data.mailStatus) return;
        setDisputes(prev => prev.map(d => d.id === selectedDispute.id ? { ...d, mailStatus: data.mailStatus, mailTracking: data.tracking } : d));
        setSelectedDispute(prev => prev ? { ...prev, mailStatus: data.mailStatus, mailTracking: data.tracking } : prev);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDispute?.id]);

  const handleReattemptMailing = async (disputeId: string) => {
    if (!user) return;

    // Load saved return address from localStorage
    const saved = localStorage.getItem("credit800_return_address");
    if (!saved) {
      // No saved address — show form in reattempt mode (no charge)
      setIsReattempt(true);
      setShowMailForm(true);
      return;
    }

    const fromAddress = JSON.parse(saved);
    if (!fromAddress.name || !fromAddress.address_line1 || !fromAddress.address_city || !fromAddress.address_state || !fromAddress.address_zip) {
      setIsReattempt(true);
      setShowMailForm(true);
      return;
    }

    setMailing(disputeId);

    try {
      // Re-send — server detects mailStatus === "CANCELLED" and skips the charge
      const res = await fetch("/api/disputes/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
        body: JSON.stringify({ disputeId, fromAddress }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Failed to mail letter");

      setDisputes((prev) =>
        prev.map((d) =>
          d.id === disputeId
            ? { ...d, mailJobId: data.mailJobId, mailStatus: "SUBMITTED", status: "SENT", mailedAt: new Date().toISOString() }
            : d
        )
      );
      if (selectedDispute?.id === disputeId) {
        setSelectedDispute((prev) =>
          prev ? { ...prev, mailJobId: data.mailJobId, mailStatus: "SUBMITTED", status: "SENT", mailedAt: new Date().toISOString() } : prev
        );
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to reattempt mailing.");
      // Reset so user can try manually
      await handleClearMailError(disputeId);
    } finally {
      setMailing(null);
    }
  };

  const handleCheckMailStatus = async (disputeId: string) => {
    if (!user) return;

    setCheckingStatus(disputeId);

    try {
      const res = await fetch(`/api/disputes/mail/status?disputeId=${disputeId}`, {
        headers: {
          Authorization: `Bearer ${user.idToken}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to check status");
      }

      // Update local state
      setDisputes((prev) =>
        prev.map((d) =>
          d.id === disputeId
            ? { ...d, mailStatus: data.mailStatus, mailTracking: data.tracking }
            : d
        )
      );

      if (selectedDispute?.id === disputeId) {
        setSelectedDispute((prev) =>
          prev ? { ...prev, mailStatus: data.mailStatus, mailTracking: data.tracking } : prev
        );
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to check mail status.");
    } finally {
      setCheckingStatus(null);
    }
  };

  const handleRefreshTracking = async (disputeId: string) => {
    if (!user) return;
    setRefreshingTracking(disputeId);
    try {
      const res = await fetch("/api/disputes/mail/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
        body: JSON.stringify({ disputeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to refresh");
      setDisputes((prev) =>
        prev.map((d) =>
          d.id === disputeId
            ? { ...d, mailStatus: data.mailStatus, mailTracking: data.mailTracking }
            : d
        )
      );
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to refresh tracking.");
    } finally {
      setRefreshingTracking(null);
    }
  };

  const handleLogResponse = async () => {
    if (!user || !logResponseFor) return;
    setSavingResponse(true);
    try {
      const res = await fetch(`/api/disputes/${logResponseFor.id}/response`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.idToken}` },
        body: JSON.stringify({
          bureauResponse: responseNotes,
          bureauResponseOutcome: responseOutcome,
          responseReceivedAt: new Date(responseDate).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save response");
      setDisputes((prev) =>
        prev.map((d) =>
          d.id === logResponseFor.id
            ? {
                ...d,
                bureauResponse: responseNotes,
                bureauResponseOutcome: responseOutcome,
                responseReceivedAt: new Date(responseDate).toISOString(),
                status: responseOutcome === "deleted" ? "RESOLVED" : d.status,
                resolvedAt: responseOutcome === "deleted" ? new Date() : d.resolvedAt,
              }
            : d
        )
      );
      setLogResponseFor(null);
      setResponseNotes("");
      setResponseOutcome("no_response");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to save response.");
    } finally {
      setSavingResponse(false);
    }
  };

  const handleParseResponseLetter = async (file: File, dispute: Dispute) => {
    if (!user) return;
    setParsing(true);
    setParsedResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("disputeId", dispute.id);
      const res = await fetch("/api/disputes/parse-response", {
        method: "POST",
        headers: { Authorization: `Bearer ${user.idToken}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse letter");
      setParsedResult(data);
      // Pre-fill log response form
      if (data.outcome) {
        const outcomeMap: Record<string, "deleted" | "verified" | "updated" | "no_response"> = {
          deleted: "deleted", verified: "verified", updated: "updated", no_response: "no_response",
        };
        setResponseOutcome(outcomeMap[data.outcome] || "no_response");
      }
      if (data.responseDate) setResponseDate(data.responseDate.split("T")[0]);
      if (data.keyLanguage) setResponseNotes(data.keyLanguage);
      setLogResponseFor(dispute);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to parse letter.");
    } finally {
      setParsing(false);
    }
  };

  const getMailStatusColor = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return "bg-blue-100 text-blue-700";
      case "IN_TRANSIT":
        return "bg-amber-100 text-amber-700";
      case "OUT_FOR_DELIVERY":
        return "bg-emerald-100 text-emerald-700";
      case "DELIVERED":
        return "bg-blue-50 text-[#1a3fd4]";
      case "RETURNED":
      case "RE_ROUTED":
      case "ERROR":
        return "bg-red-100 text-red-700";
      case "CANCELLED":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getMailStatusLabel = (status: string) => {
    switch (status) {
      case "SUBMITTED": return "Submitted to USPS";
      case "IN_TRANSIT": return "In Transit";
      case "OUT_FOR_DELIVERY": return "Out for Delivery";
      case "DELIVERED": return "Delivered";
      case "RETURNED": return "Returned to Sender";
      case "RE_ROUTED": return "Re-Routed";
      case "ERROR": return "Error";
      case "CANCELLED": return "Cancelled by PostGrid";
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-slate-100 text-slate-700";
      case "SENT":
        return "bg-blue-100 text-blue-700";
      case "UNDER_INVESTIGATION":
        return "bg-amber-100 text-amber-700";
      case "RESOLVED":
        return "bg-blue-50 text-[#1a3fd4]";
      case "REJECTED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const activeDisputes = disputes.filter((d) => d.status !== "RESOLVED" && d.status !== "REJECTED");
  const historyDisputes = disputes.filter((d) => d.status === "RESOLVED" || d.status === "REJECTED");

  const daysSinceSent = (dispute: Dispute): number => {
    const ref = dispute.mailedAt || (dispute.createdAt instanceof Date ? dispute.createdAt.toISOString() : String(dispute.createdAt));
    if (!ref) return 0;
    return Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1a3fd4] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthenticatedLayout activeNav="disputes">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Disputes</h1>
        <p className="text-slate-600 mb-6 sm:mb-8 text-sm sm:text-base">
          Review disputable items and generate FCRA-compliant dispute letters.
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          <button
            onClick={() => setActiveTab("disputable")}
            className={`shrink-0 px-4 py-2.5 rounded-xl font-medium transition text-sm whitespace-nowrap ${
              activeTab === "disputable"
                ? "bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            Disputable Items ({disputableItems.length})
          </button>
          <button
            onClick={() => setActiveTab("disputes")}
            className={`shrink-0 px-4 py-2.5 rounded-xl font-medium transition text-sm whitespace-nowrap ${
              activeTab === "disputes"
                ? "bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            My Disputes ({activeDisputes.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`shrink-0 px-4 py-2.5 rounded-xl font-medium transition text-sm whitespace-nowrap ${
              activeTab === "history"
                ? "bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            History ({historyDisputes.length})
          </button>
          <button
            onClick={() => downloadCSV("disputes.csv", disputes.map(d => ({
              id: d.id,
              creditorName: d.creditorName,
              bureau: d.bureau,
              reason: d.reason,
              status: d.status,
              createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
              outcome: d.outcome || "",
              mailedAt: d.mailedAt || "",
            })))}
            disabled={disputes.length === 0}
            className="hidden sm:flex shrink-0 ml-auto px-3 py-2 border border-slate-200 text-slate-600 text-sm rounded-xl font-medium hover:bg-slate-50 transition disabled:opacity-40 items-center gap-1.5 whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>

        {activeTab === "disputable" ? (
          <div>
            {disputableItems.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">No Disputable Items</h3>
                <p className="text-slate-500 mb-6">Upload a credit report to find items you can dispute.</p>
                <button
                  onClick={() => setUploadModalType("report")}
                  className="inline-block px-6 py-3 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl font-medium hover:opacity-90 transition"
                >
                  Upload Report
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Removal Analysis Summary */}
                <div className="bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] rounded-2xl p-6 text-white">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Credit Report Removal Analysis
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white/10 rounded-xl p-3 sm:p-4">
                      <div className="text-2xl sm:text-3xl font-bold">{disputableItems.length}</div>
                      <div className="text-xs sm:text-sm text-cyan-100">Items to Dispute</div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 sm:p-4">
                      <div className="text-2xl sm:text-3xl font-bold truncate">
                        ${disputableItems.reduce((sum, item) => sum + item.balance, 0).toLocaleString()}
                      </div>
                      <div className="text-xs sm:text-sm text-cyan-100">Potential Removal</div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 sm:p-4">
                      <div className="text-2xl sm:text-3xl font-bold">
                        {disputableItems.reduce((sum, item) =>
                          sum + (item.removalStrategies?.filter(s => s.priority === "HIGH").length || 0), 0
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-cyan-100">High Priority Strategies</div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 sm:p-4">
                      <div className="text-2xl sm:text-3xl font-bold">
                        {disputableItems.reduce((sum, item) =>
                          sum + (item.removalStrategies?.length || 0), 0
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-cyan-100">Total Strategies</div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-cyan-100">
                    Credit 800 has analyzed each debt and identified the best removal strategies based on account age, debt type, and legal factors.
                  </p>
                </div>

                {/* Bulk select controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (selectedItemIds.size === disputableItems.length) {
                          setSelectedItemIds(new Set());
                        } else {
                          setSelectedItemIds(new Set(disputableItems.map((i) => i.id)));
                        }
                      }}
                      className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                    >
                      {selectedItemIds.size === disputableItems.length ? "Deselect All" : "Select All"}
                    </button>
                    {selectedItemIds.size > 0 && (
                      <span className="text-sm text-slate-500">{selectedItemIds.size} selected</span>
                    )}
                  </div>
                  {selectedItemIds.size > 0 && (
                    <button
                      onClick={handleBulkGenerate}
                      disabled={bulkGenerating}
                      className="px-4 py-2 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white text-sm rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
                    >
                      {bulkGenerating && bulkProgress ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generating {bulkProgress.done}/{bulkProgress.total}...
                        </>
                      ) : (
                        `Generate ${selectedItemIds.size} Letter${selectedItemIds.size > 1 ? "s" : ""}`
                      )}
                    </button>
                  )}
                </div>

                {/* Individual Items */}
                <div className="space-y-4">
                {disputableItems.map((item) => (
                  <div
                    key={item.id}
                    ref={(el) => { itemRefs.current[item.id] = el; }}
                    className={`bg-white border rounded-xl p-4 sm:p-6 hover:shadow-lg transition ${
                      selectedItemIds.has(item.id)
                        ? "border-teal-400 ring-1 ring-teal-300"
                        : highlightItemId === item.id
                        ? "border-teal-500 ring-2 ring-teal-400 shadow-lg"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      {/* Checkbox */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedItemIds.has(item.id)}
                        onChange={() => {
                          setSelectedItemIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(item.id)) next.delete(item.id);
                            else next.add(item.id);
                            return next;
                          });
                        }}
                        className="mt-1.5 w-4 h-4 rounded accent-[#1a3fd4] shrink-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-semibold text-base sm:text-lg">{item.creditorName}</h3>
                          {item.bureau && item.bureau !== "UNKNOWN" && (
                            <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                              {item.bureau}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mb-3">
                          Account: ****{item.accountNumber.slice(-4)} • {item.accountType}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
                          <span className="text-slate-600">
                            Balance: <span className="font-medium">${item.balance.toLocaleString()}</span>
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.status === "DELINQUENT" ? "bg-red-100 text-red-700" :
                            item.status === "COLLECTION" ? "bg-orange-100 text-orange-700" :
                            "bg-slate-100 text-slate-700"
                          }`}>
                            {item.status}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-lime-100 text-lime-700">
                            {estimateScoreImpact(item)} if removed
                          </span>
                        </div>
                        {item.disputeReason && (
                          <p className="mt-3 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                            <strong>Suggested Dispute Reason:</strong> {item.disputeReason}
                          </p>
                        )}

                        {/* Removal Strategies Section */}
                        {item.removalStrategies && item.removalStrategies.length > 0 && (
                          <div className="mt-4 border-t border-slate-100 pt-4">
                            {/* Best Strategy - Highlighted */}
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                Best Removal Strategy
                              </h4>
                              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <span className="font-semibold text-emerald-900 text-base">{item.removalStrategies[0].method}</span>
                                      <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-500 text-white">
                                        RECOMMENDED
                                      </span>
                                    </div>
                                    <p className="text-sm text-emerald-800">{item.removalStrategies[0].description}</p>
                                  </div>
                                  <div className="flex items-center gap-2 sm:block sm:text-right shrink-0">
                                    <div className="text-xs text-emerald-600 font-medium">Success Rate</div>
                                    <div className="text-2xl font-bold text-emerald-600">
                                      {item.removalStrategies[0].successRate}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Other Strategies */}
                            {item.removalStrategies.length > 1 && (
                              <details className="group">
                                <summary className="cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-800 flex items-center gap-2 mb-3">
                                  <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                  {item.removalStrategies.length - 1} Other Strategies
                                </summary>
                                <div className="space-y-2 ml-0 sm:ml-6">
                                  {item.removalStrategies.slice(1).map((strategy, idx) => (
                                    <div
                                      key={idx}
                                      className={`p-3 rounded-lg border ${
                                        strategy.priority === "HIGH"
                                          ? "bg-emerald-50/50 border-emerald-200"
                                          : strategy.priority === "MEDIUM"
                                          ? "bg-blue-50/50 border-blue-200"
                                          : "bg-slate-50/50 border-slate-200"
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="font-medium text-slate-700 text-sm">{strategy.method}</span>
                                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                              strategy.priority === "HIGH"
                                                ? "bg-emerald-200 text-emerald-700"
                                                : strategy.priority === "MEDIUM"
                                                ? "bg-blue-200 text-blue-700"
                                                : "bg-slate-200 text-slate-600"
                                            }`}>
                                              {strategy.priority}
                                            </span>
                                          </div>
                                          <p className="text-xs text-slate-500">{strategy.description}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <div className={`text-sm font-bold ${
                                            parseInt(strategy.successRate) >= 50
                                              ? "text-emerald-600"
                                              : "text-slate-500"
                                          }`}>
                                            {strategy.successRate}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        )}

                        {/* Original Creditor Info */}
                        {item.originalCreditor && (
                          <p className="mt-3 text-xs text-slate-500">
                            Original Creditor: <span className="font-medium">{item.originalCreditor}</span>
                          </p>
                        )}

                        {/* Date Info */}
                        {(item.dateOfFirstDelinquency || item.lastActivityDate) && (
                          <div className="mt-2 flex flex-col sm:flex-row gap-1 sm:gap-4 text-xs text-slate-500">
                            {item.dateOfFirstDelinquency && (
                              <span>First Delinquency: {new Date(item.dateOfFirstDelinquency).toLocaleDateString()}</span>
                            )}
                            {item.lastActivityDate && (
                              <span>Last Activity: {new Date(item.lastActivityDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        )}
                      </div>
                      </div>{/* end checkbox+content wrapper */}
                      <div className="shrink-0 flex flex-row sm:flex-col gap-2 relative">
                        {generating === item.id ? (
                          <button
                            disabled
                            className="px-4 py-2 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white text-sm rounded-lg font-medium disabled:opacity-50"
                          >
                            <span className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Generating...
                            </span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setStrategyPicker(strategyPicker === item.id ? null : item.id)}
                            className="px-4 py-2 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white text-sm rounded-lg font-medium hover:opacity-90 transition"
                          >
                            Generate Dispute
                          </button>
                        )}
                        {/* Strategy picker dropdown */}
                        {strategyPicker === item.id && (
                          <div className="absolute top-10 right-0 sm:right-0 left-0 sm:left-auto z-20 bg-white border border-slate-200 rounded-xl shadow-xl sm:w-72 overflow-hidden">
                            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                              <p className="text-xs font-semibold text-slate-600">Choose dispute type:</p>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                              {item.removalStrategies && item.removalStrategies.length > 0 ? (
                                item.removalStrategies.map((strategy, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => handleGenerateDispute(item, strategy.method)}
                                    className="w-full text-left px-3 py-2.5 hover:bg-teal-50 transition border-b border-slate-100 last:border-b-0"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                                        strategy.priority === "HIGH"
                                          ? "bg-emerald-100 text-emerald-700"
                                          : strategy.priority === "MEDIUM"
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-slate-100 text-slate-600"
                                      }`}>
                                        {strategy.priority}
                                      </span>
                                      <span className="text-sm font-medium text-slate-800 truncate">{strategy.method}</span>
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <button
                                  onClick={() => handleGenerateDispute(item)}
                                  className="w-full text-left px-3 py-2.5 hover:bg-teal-50 transition"
                                >
                                  <span className="text-sm font-medium text-slate-800">General Dispute Letter</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={deletingItem === item.id}
                          className="px-4 py-2 border border-red-200 text-red-600 text-sm rounded-lg font-medium hover:border-red-300 hover:bg-red-50 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {deletingItem === item.id ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Remove
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === "disputes" ? (
          <div>
            {activeDisputes.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">No Active Disputes</h3>
                <p className="text-slate-500">Generate disputes from your disputable items, or check your history.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeDisputes.map((dispute) => (
                  <div
                    key={dispute.id}
                    className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{dispute.creditorName}</h3>
                          {dispute.bureau && dispute.bureau !== "UNKNOWN" && (
                            <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                              {dispute.bureau}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(dispute.status)}`}>
                            {dispute.status.replace("_", " ")}
                          </span>
                          {(() => {
                            const chip = getDeadlineChip(dispute);
                            return chip ? (
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${chip.color}`}>
                                {chip.label}
                              </span>
                            ) : null;
                          })()}
                          {dispute.outcome === "won" && (
                            <span className="text-xs px-2 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700">Won</span>
                          )}
                          {dispute.outcome === "denied" && (
                            <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-700">Denied</span>
                          )}
                          {dispute.mailStatus && (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${getMailStatusColor(dispute.mailStatus)}`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {getMailStatusLabel(dispute.mailStatus)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{dispute.reason}</p>
                        {/* Outcome toggle buttons for SENT/active disputes */}
                        {(dispute.status === "SENT" || dispute.status === "UNDER_INVESTIGATION") && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-slate-400">Outcome:</span>
                            <button
                              onClick={() => handleSetOutcome(dispute.id, "won")}
                              disabled={settingOutcome === dispute.id}
                              className={`text-xs px-2.5 py-1 rounded-full font-medium border transition ${
                                dispute.outcome === "won"
                                  ? "bg-emerald-500 text-white border-emerald-500"
                                  : "border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                              }`}
                            >
                              Won
                            </button>
                            <button
                              onClick={() => handleSetOutcome(dispute.id, "denied")}
                              disabled={settingOutcome === dispute.id}
                              className={`text-xs px-2.5 py-1 rounded-full font-medium border transition ${
                                dispute.outcome === "denied"
                                  ? "bg-red-500 text-white border-red-500"
                                  : "border-red-300 text-red-600 hover:bg-red-50"
                              }`}
                            >
                              Denied
                            </button>
                            <span className="text-slate-200">|</span>
                            <button
                              onClick={() => {
                                setLogResponseFor(dispute);
                                setResponseOutcome(dispute.bureauResponseOutcome || "no_response");
                                setResponseNotes(dispute.bureauResponse || "");
                                setResponseDate(dispute.responseReceivedAt ? dispute.responseReceivedAt.split("T")[0] : new Date().toISOString().split("T")[0]);
                              }}
                              className="text-xs px-2.5 py-1 rounded-full font-medium border border-blue-300 text-blue-600 hover:bg-blue-50 transition"
                            >
                              {dispute.bureauResponseOutcome ? "Edit Response" : "Log Response"}
                            </button>
                            <label className={`text-xs px-2.5 py-1 rounded-full font-medium border border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition cursor-pointer ${parsing ? "opacity-50 pointer-events-none" : ""}`}>
                              {parsing ? "Parsing..." : "Upload Letter"}
                              <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleParseResponseLetter(f, dispute); }} disabled={parsing} />
                            </label>
                          </div>
                        )}
                        {/* Bureau response outcome badge */}
                        {dispute.bureauResponseOutcome && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className={`px-2 py-0.5 rounded-full font-medium ${
                              dispute.bureauResponseOutcome === "deleted" ? "bg-emerald-100 text-emerald-700" :
                              dispute.bureauResponseOutcome === "verified" ? "bg-red-100 text-red-700" :
                              dispute.bureauResponseOutcome === "updated" ? "bg-amber-100 text-amber-700" :
                              "bg-slate-100 text-slate-600"
                            }`}>
                              Bureau: {dispute.bureauResponseOutcome.replace("_", " ")}
                            </span>
                            <span className="text-slate-400">
                              {{
                                deleted: "Item removed! Upload new report to confirm",
                                verified: "Consider escalation or goodwill letter",
                                updated: "Check updated report entry",
                                no_response: "Ready to escalate — 30 days have passed",
                              }[dispute.bureauResponseOutcome]}
                            </span>
                          </div>
                        )}
                        {/* Mail tracking card */}
                        {dispute.mailJobId && (
                          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {dispute.mailTracking?.trackingNumber && (
                                  <span className="font-mono text-slate-600">{dispute.mailTracking.trackingNumber}</span>
                                )}
                                {dispute.mailStatus && (
                                  <span className={`px-2 py-0.5 rounded-full font-medium ${getMailStatusColor(dispute.mailStatus)}`}>
                                    {getMailStatusLabel(dispute.mailStatus)}
                                  </span>
                                )}
                                {dispute.mailTracking?.lastUpdate && (
                                  <span className="text-slate-400">
                                    {new Date(dispute.mailTracking.lastUpdate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleRefreshTracking(dispute.id)}
                                disabled={refreshingTracking === dispute.id}
                                className="px-2 py-1 border border-slate-300 text-slate-600 rounded-md hover:bg-white transition disabled:opacity-50 flex items-center gap-1 shrink-0"
                              >
                                {refreshingTracking === dispute.id ? (
                                  <div className="w-3 h-3 border border-slate-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                )}
                                Refresh
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => setSelectedDispute(dispute)}
                          className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg font-medium hover:border-slate-300 hover:bg-slate-50 transition"
                        >
                          View Letter
                        </button>
                        <button
                          onClick={() => handleResolveDispute(dispute.id)}
                          disabled={resolving === dispute.id}
                          className="px-3 py-2 border border-emerald-200 text-emerald-600 text-sm rounded-lg font-medium hover:border-emerald-300 hover:bg-emerald-50 transition disabled:opacity-50"
                          title="Mark as Resolved"
                        >
                          {resolving === dispute.id ? (
                            <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteDispute(dispute.id)}
                          disabled={deleting === dispute.id}
                          className="px-3 py-2 border border-red-200 text-red-600 text-sm rounded-lg font-medium hover:border-red-300 hover:bg-red-50 transition disabled:opacity-50"
                        >
                          {deleting === dispute.id ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* History Tab */
          <div>
            {historyDisputes.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">No History Yet</h3>
                <p className="text-slate-500">Resolved disputes will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historyDisputes.map((dispute) => (
                  <div
                    key={dispute.id}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-6 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg text-slate-700">{dispute.creditorName}</h3>
                          {dispute.bureau && dispute.bureau !== "UNKNOWN" && (
                            <span className="text-xs px-2 py-1 bg-slate-200 text-slate-600 rounded-full">
                              {dispute.bureau}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(dispute.status)}`}>
                            {dispute.status.replace("_", " ")}
                          </span>
                          {dispute.outcome === "won" && (
                            <span className="text-xs px-2 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700">Won</span>
                          )}
                          {dispute.outcome === "denied" && (
                            <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-700">Denied</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">{dispute.reason}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                          {dispute.resolvedAt && (
                            <span>Resolved: {new Date(dispute.resolvedAt).toLocaleDateString()}</span>
                          )}
                          {dispute.createdAt && (
                            <span>Created: {new Date(dispute.createdAt).toLocaleDateString()}</span>
                          )}
                        </div>
                        {/* Outcome toggle for history */}
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-slate-400">Outcome:</span>
                          <button
                            onClick={() => handleSetOutcome(dispute.id, "won")}
                            disabled={settingOutcome === dispute.id}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium border transition ${
                              dispute.outcome === "won"
                                ? "bg-emerald-500 text-white border-emerald-500"
                                : "border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                            }`}
                          >
                            Won
                          </button>
                          <button
                            onClick={() => handleSetOutcome(dispute.id, "denied")}
                            disabled={settingOutcome === dispute.id}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium border transition ${
                              dispute.outcome === "denied"
                                ? "bg-red-500 text-white border-red-500"
                                : "border-red-300 text-red-600 hover:bg-red-50"
                            }`}
                          >
                            Denied
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => setSelectedDispute(dispute)}
                          className="px-4 py-2 border border-slate-200 text-slate-500 text-sm rounded-lg font-medium hover:border-slate-300 hover:bg-white transition"
                        >
                          View Letter
                        </button>
                        <button
                          onClick={() => handleDeleteDispute(dispute.id)}
                          disabled={deleting === dispute.id}
                          className="px-3 py-2 border border-red-200 text-red-600 text-sm rounded-lg font-medium hover:border-red-300 hover:bg-red-50 transition disabled:opacity-50"
                        >
                          {deleting === dispute.id ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Letter Modal */}
        {selectedDispute && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setSelectedDispute(null); }}>
            <div className="bg-white w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl rounded-xl" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-200 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-semibold">Dispute Letter</h2>
                <button
                  onClick={() => setSelectedDispute(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 min-h-0">
                {/* Address confidence banner */}
                {selectedDispute.addressSource === "database" && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-sm text-green-700">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Creditor address verified from our database
                  </div>
                )}
                {selectedDispute.addressSource === "ai" && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-700">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Address auto-detected — please verify before sending
                  </div>
                )}
                {!selectedDispute.addressSource && (
                  <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-lg flex items-center gap-2 text-sm text-teal-700">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Creditor address not found — you can enter it manually when mailing.
                  </div>
                )}
                <pre className="whitespace-pre-wrap font-sans text-xs text-slate-700 leading-relaxed">
                  {selectedDispute.letterContent || "Letter content not available."}
                </pre>
              </div>
              {/* Mail status banner */}
              {selectedDispute.mailStatus && (
                <div className={`px-6 py-3 border-t flex items-center justify-between gap-3 shrink-0 ${
                  selectedDispute.mailStatus === "DELIVERED" ? "bg-green-50" :
                  selectedDispute.mailStatus === "ERROR" || selectedDispute.mailStatus === "RETURNED" ? "bg-red-50" :
                  selectedDispute.mailStatus === "CANCELLED" ? "bg-orange-50" :
                  "bg-blue-50"
                }`}>
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium truncate">
                      {selectedDispute.mailStatus === "ERROR"
                        ? `Mailing error: ${selectedDispute.mailError || "Unknown error"}`
                        : getMailStatusLabel(selectedDispute.mailStatus)}
                    </span>
                  </div>
                  {(selectedDispute.mailStatus === "ERROR" || selectedDispute.mailStatus === "CANCELLED") ? (
                    <button
                      onClick={() => handleReattemptMailing(selectedDispute.id)}
                      disabled={mailing === selectedDispute.id}
                      className={`text-sm px-3 py-1 border rounded-lg transition disabled:opacity-50 whitespace-nowrap shrink-0 ${
                        selectedDispute.mailStatus === "CANCELLED"
                          ? "border-orange-300 text-orange-700 hover:bg-orange-100"
                          : "border-red-300 text-red-700 hover:bg-red-100"
                      }`}
                    >
                      {mailing === selectedDispute.id ? "Sending..." : "Reattempt Mailing"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCheckMailStatus(selectedDispute.id)}
                      disabled={checkingStatus === selectedDispute.id}
                      className="text-sm px-3 py-1 border rounded-lg hover:bg-white transition disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      {checkingStatus === selectedDispute.id ? "Checking..." : "Refresh Status"}
                    </button>
                  )}
                </div>
              )}
              {selectedDispute.mailTracking?.status && (
                <div className="px-6 py-2 bg-slate-50 border-t text-xs text-slate-600 flex items-center gap-4 shrink-0">
                  <span>USPS: {selectedDispute.mailTracking.status}</span>
                  {selectedDispute.mailTracking.lastUpdate && (
                    <span>Updated: {new Date(selectedDispute.mailTracking.lastUpdate).toLocaleString()}</span>
                  )}
                </div>
              )}
              {/* Mail address form */}
              {showMailForm && (
                <div className="px-6 py-4 border-t bg-slate-50 shrink-0 max-h-[50vh] overflow-y-auto">
                  {/* Recipient address (only when not on file) */}
                  {!selectedDispute.addressSource && (
                    <>
                      <h4 className="text-sm font-semibold mb-3">Recipient Address (Creditor)</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                        <input
                          type="text"
                          placeholder="Company / Creditor Name *"
                          value={toName}
                          onChange={(e) => setToName(e.target.value)}
                          className="px-3 py-2 border border-slate-300 rounded-lg text-sm sm:col-span-2"
                        />
                        <input
                          type="text"
                          placeholder="Street Address / P.O. Box *"
                          value={toAddress}
                          onChange={(e) => setToAddress(e.target.value)}
                          className="px-3 py-2 border border-slate-300 rounded-lg text-sm sm:col-span-2"
                        />
                        <input
                          type="text"
                          placeholder="Dept / Suite (optional)"
                          value={toAddress2}
                          onChange={(e) => setToAddress2(e.target.value)}
                          className="px-3 py-2 border border-slate-300 rounded-lg text-sm sm:col-span-2"
                        />
                        <input
                          type="text"
                          placeholder="City *"
                          value={toCity}
                          onChange={(e) => setToCity(e.target.value)}
                          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="State *"
                            value={toState}
                            onChange={(e) => setToState(e.target.value)}
                            maxLength={2}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-20 uppercase"
                          />
                          <input
                            type="text"
                            placeholder="ZIP *"
                            value={toZip}
                            onChange={(e) => setToZip(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm flex-1"
                          />
                        </div>
                      </div>
                    </>
                  )}
                  <h4 className="text-sm font-semibold mb-3">Your Return Address</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Full Name *"
                      value={mailFormName}
                      onChange={(e) => setMailFormName(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm sm:col-span-2"
                    />
                    <input
                      type="text"
                      placeholder="Street Address *"
                      value={mailFormAddress}
                      onChange={(e) => setMailFormAddress(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm sm:col-span-2"
                    />
                    <input
                      type="text"
                      placeholder="Apt/Suite (optional)"
                      value={mailFormAddress2}
                      onChange={(e) => setMailFormAddress2(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm sm:col-span-2"
                    />
                    <input
                      type="text"
                      placeholder="City *"
                      value={mailFormCity}
                      onChange={(e) => setMailFormCity(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="State *"
                        value={mailFormState}
                        onChange={(e) => setMailFormState(e.target.value)}
                        maxLength={2}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-20"
                      />
                      <input
                        type="text"
                        placeholder="ZIP *"
                        value={mailFormZip}
                        onChange={(e) => setMailFormZip(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm flex-1"
                      />
                    </div>
                  </div>
                  {!isReattempt && (
                    <p className="text-xs text-slate-500 mt-3 mb-2 text-center">
                      A <span className="font-semibold text-slate-700">$2.00 mailing fee</span> will be charged to your card on file when you confirm.
                    </p>
                  )}
                  {isReattempt && (
                    <p className="text-xs text-green-600 mt-3 mb-2 text-center font-medium">
                      No charge — reattempting a cancelled letter is free.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirmMail}
                      className="flex-1 py-2 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-lg font-medium text-sm hover:opacity-90 transition"
                    >
                      {isReattempt ? "Confirm & Reattempt Mailing" : "Confirm & Mail — $2.00"}
                    </button>
                    <button
                      onClick={() => { setShowMailForm(false); setIsReattempt(false); }}
                      className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-white transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              <div className="p-6 border-t border-slate-200 flex gap-3 shrink-0">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedDispute.letterContent || "");
                    alert("Letter copied to clipboard!");
                  }}
                  className="flex-1 py-3 border border-slate-200 rounded-xl font-medium hover:bg-slate-50 transition"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([selectedDispute.letterContent || ""], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `dispute-${selectedDispute.bureau}-${Date.now()}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex-1 py-3 border border-slate-200 rounded-xl font-medium hover:bg-slate-50 transition"
                >
                  Download Letter
                </button>
                {!selectedDispute.mailJobId && !showMailForm && (
                  isPro ? (
                    <button
                      onClick={() => handleMailLetter(selectedDispute.id)}
                      disabled={mailing === selectedDispute.id}
                      className="flex-1 py-3 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {mailing === selectedDispute.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Mailing...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Mail via USPS
                        </>
                      )}
                    </button>
                  ) : (
                    null
                  )
                )}
                {(selectedDispute.status === "SENT" || selectedDispute.status === "UNDER_INVESTIGATION") && !selectedDispute.escalatedToId && (() => {
                  const days = daysSinceSent(selectedDispute);
                  const canEscalate = days >= 30;
                  const daysLeft = 30 - days;
                  const round = selectedDispute.escalationRound === 2 ? 3 : 2;
                  return canEscalate ? (
                    <button
                      onClick={() => handleEscalate(selectedDispute.id)}
                      disabled={escalating === selectedDispute.id}
                      className="flex-1 py-3 border-2 border-purple-500 text-purple-700 bg-purple-50 rounded-xl font-medium hover:bg-purple-100 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {escalating === selectedDispute.id ? (
                        <><div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />Escalating...</>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                          Round {round}
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-medium flex items-center justify-center gap-2 text-sm cursor-not-allowed" title="Must wait 30 days after sending before escalating">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Round {round} in {daysLeft}d
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Log Response Modal */}
      {logResponseFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg">Log Bureau Response</h2>
              <button onClick={() => setLogResponseFor(null)} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Dispute with</p>
                <p className="font-semibold">{logResponseFor.creditorName} — {logResponseFor.bureau}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bureau Response Outcome</label>
                <select
                  value={responseOutcome}
                  onChange={(e) => setResponseOutcome(e.target.value as typeof responseOutcome)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="deleted">Deleted — Item was removed</option>
                  <option value="verified">Verified — Bureau confirmed item</option>
                  <option value="updated">Updated — Item was modified</option>
                  <option value="no_response">No Response — No reply received</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Response Date</label>
                <input
                  type="date"
                  value={responseDate}
                  onChange={(e) => setResponseDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
                <textarea
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  rows={3}
                  placeholder="Summarize what the bureau said..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className={`p-3 rounded-lg text-xs ${
                responseOutcome === "deleted" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" :
                responseOutcome === "verified" ? "bg-red-50 border border-red-200 text-red-700" :
                responseOutcome === "updated" ? "bg-amber-50 border border-amber-200 text-amber-700" :
                "bg-slate-50 border border-slate-200 text-slate-600"
              }`}>
                <strong>Next Step: </strong>
                {{
                  deleted: "Item removed! Upload a new credit report to confirm the deletion.",
                  verified: "Consider a Round 2 escalation or writing a goodwill letter.",
                  updated: "Pull a new report to review the updated entry.",
                  no_response: "30 days have passed — you are ready to escalate.",
                }[responseOutcome]}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleLogResponse}
                  disabled={savingResponse}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition disabled:opacity-50"
                >
                  {savingResponse ? "Saving..." : "Save Response"}
                </button>
                <button onClick={() => setLogResponseFor(null)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Parse Response Modal - show parsed result before saving */}
      {parsedResult && logResponseFor === null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg">Parsed Letter</h2>
              <button onClick={() => setParsedResult(null)} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-slate-500">Extracted the following from the bureau letter:</p>
              {parsedResult.outcome && <p className="text-sm"><strong>Outcome:</strong> {parsedResult.outcome}</p>}
              {parsedResult.creditorName && <p className="text-sm"><strong>Creditor:</strong> {parsedResult.creditorName}</p>}
              {parsedResult.bureauName && <p className="text-sm"><strong>Bureau:</strong> {parsedResult.bureauName}</p>}
              {parsedResult.responseDate && <p className="text-sm"><strong>Date:</strong> {parsedResult.responseDate}</p>}
              {parsedResult.keyLanguage && (
                <div>
                  <p className="text-sm font-medium">Key Language:</p>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg mt-1">{parsedResult.keyLanguage}</p>
                </div>
              )}
              <p className="text-xs text-slate-400">The log response form has been pre-filled with these values. Close this and confirm the details.</p>
              <button
                onClick={() => setParsedResult(null)}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
      <UploadModal type={uploadModalType} onClose={() => setUploadModalType(null)} />
    </AuthenticatedLayout>
  );
}

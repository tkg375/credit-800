"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth-context";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { ProGate } from "@/components/ProGate";
import { usePlaidLink } from "react-plaid-link";
import {
  computeTotals,
  computeAllocation,
  isAsset,
  type AllocationSlice,
} from "@/lib/portfolio-calculator";
import type { PortfolioAccount, PortfolioSnapshot, AccountType } from "@/lib/portfolio-types";
import { ACCOUNT_TYPE_LABELS as TYPE_LABELS } from "@/lib/portfolio-types";

const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false });
const PieChart = dynamic(() => import("recharts").then((m) => m.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then((m) => m.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then((m) => m.Cell), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then((m) => m.Legend), { ssr: false });
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false }
);

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

function formatMoney(n: number): string {
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `-$${formatted}` : `$${formatted}`;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ── Plaid Link wrapper (only renders when linkToken is available) ─────────────
function PlaidLinkButton({
  linkToken,
  onSuccess,
  onExit,
}: {
  linkToken: string;
  onSuccess: (publicToken: string, metadata: PlaidLinkMetadata) => void;
  onExit: () => void;
}) {
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken, metadata) => onSuccess(publicToken, metadata as unknown as PlaidLinkMetadata),
    onExit,
  });

  return (
    <button
      onClick={() => open()}
      disabled={!ready}
      className="w-full px-4 py-3 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50"
    >
      {ready ? "Connect Account" : "Loading Plaid..."}
    </button>
  );
}

interface PlaidLinkMetadata {
  institution?: { institution_id: string; name: string };
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    subtype: string | null;
    balances: { current: number | null; available: number | null };
  }>;
}

// ── Add Account Modal ─────────────────────────────────────────────────────────
function AddAccountModal({
  onClose,
  onAdded,
  idToken,
}: {
  onClose: () => void;
  onAdded: (accounts: PortfolioAccount[]) => void;
  idToken: string;
}) {
  const [tab, setTab] = useState<"manual" | "plaid">("manual");
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [type, setType] = useState<AccountType>("checking");
  const [balance, setBalance] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const balNum = parseFloat(balance);
    if (!name.trim() || !institution.trim()) {
      setError("Name and institution are required.");
      return;
    }
    if (isNaN(balNum)) {
      setError("Enter a valid balance amount.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/portfolio/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ name: name.trim(), institution: institution.trim(), type, balance: balNum }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add account");
      onAdded([data.account]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const fetchLinkToken = async () => {
    setLoadingLink(true);
    setError("");
    try {
      const res = await fetch("/api/portfolio/plaid/create-link-token", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not initialize Plaid");
      setLinkToken(data.linkToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Plaid");
    } finally {
      setLoadingLink(false);
    }
  };

  useEffect(() => {
    if (tab === "plaid" && !linkToken) {
      fetchLinkToken();
    }
  }, [tab]);

  const handlePlaidSuccess = async (publicToken: string, metadata: PlaidLinkMetadata) => {
    setConnecting(true);
    setError("");
    try {
      const res = await fetch("/api/portfolio/plaid/exchange-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          publicToken,
          institutionId: metadata.institution?.institution_id,
          institutionName: metadata.institution?.name,
          accounts: metadata.accounts,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to connect account");
      onAdded(data.accounts);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      setConnecting(false);
    }
  };

  const ASSET_ACCOUNT_TYPES: AccountType[] = [
    "checking", "savings", "investment", "retirement", "crypto", "real_estate", "vehicle", "other_asset",
  ];
  const LIABILITY_ACCOUNT_TYPES: AccountType[] = [
    "credit_card", "mortgage", "student_loan", "auto_loan", "other_liability",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Add Account</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Tabs */}
          <div className="flex mt-4 bg-slate-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setTab("manual")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${
                tab === "manual" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setTab("plaid")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${
                tab === "plaid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Connect Bank
            </button>
          </div>
        </div>

        <div className="p-6">
          {tab === "manual" ? (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Account Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Chase Checking"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Institution</label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. Chase, Vanguard"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Account Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as AccountType)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none bg-white"
                >
                  <optgroup label="Assets">
                    {ASSET_ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Liabilities">
                    {LIABILITY_ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Current Balance ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">Enter the amount owed for liabilities</p>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={saving}
                className="w-full px-4 py-3 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {saving ? "Adding..." : "Add Account"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Securely connect your bank or investment accounts via Plaid. Your credentials are
                never stored — balances sync directly from your institution.
              </p>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <svg className="w-4 h-4 text-teal-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Bank accounts, investment & retirement accounts
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <svg className="w-4 h-4 text-teal-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Live balance syncing
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <svg className="w-4 h-4 text-teal-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Bank-level 256-bit encryption
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {connecting ? (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-slate-600">
                  <div className="w-5 h-5 border-2 border-[#1a3fd4] border-t-transparent rounded-full animate-spin" />
                  Importing accounts...
                </div>
              ) : loadingLink ? (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-slate-600">
                  <div className="w-5 h-5 border-2 border-[#1a3fd4] border-t-transparent rounded-full animate-spin" />
                  Initializing...
                </div>
              ) : linkToken ? (
                <PlaidLinkButton
                  linkToken={linkToken}
                  onSuccess={handlePlaidSuccess}
                  onExit={() => {}}
                />
              ) : (
                <button
                  onClick={fetchLinkToken}
                  className="w-full px-4 py-3 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl font-medium hover:opacity-90 transition"
                >
                  Connect Account
                </button>
              )}
              <p className="text-xs text-slate-400 text-center">
                Powered by Plaid — used by thousands of financial apps
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Edit Account Modal ────────────────────────────────────────────────────────
function EditAccountModal({
  account,
  onClose,
  onUpdated,
  idToken,
}: {
  account: PortfolioAccount;
  onClose: () => void;
  onUpdated: (id: string, updates: Partial<PortfolioAccount>) => void;
  idToken: string;
}) {
  const [name, setName] = useState(account.name);
  const [institution, setInstitution] = useState(account.institution);
  const [balance, setBalance] = useState(String(account.balance));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const updates: Record<string, unknown> = { name, institution };
    if (account.source === "manual") {
      const balNum = parseFloat(balance);
      if (isNaN(balNum)) {
        setError("Enter a valid balance.");
        setSaving(false);
        return;
      }
      updates.balance = balNum;
    }
    try {
      const res = await fetch(`/api/portfolio/accounts/${account.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      onUpdated(account.id, { name, institution, ...(account.source === "manual" ? { balance: parseFloat(balance) } : {}) });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Edit Account</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Account Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Institution</label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
            />
          </div>
          {account.source === "manual" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Balance ($)</label>
              <input
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
              />
            </div>
          )}
          {account.source === "plaid" && (
            <p className="text-xs text-slate-400">Balance is synced automatically from Plaid and cannot be edited manually.</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50 text-sm"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Account Row ───────────────────────────────────────────────────────────────
function AccountRow({
  account,
  onEdit,
  onDelete,
}: {
  account: PortfolioAccount;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const asset = isAsset(account.type);

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Institution initials */}
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a3fd4] to-[#00d4aa] flex items-center justify-center text-white text-xs font-bold shrink-0">
        {getInitials(account.institution)}
      </div>
      {/* Name + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-slate-900 truncate">{account.name}</span>
          {account.source === "plaid" && (
            <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded-full font-medium shrink-0">
              Plaid
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-slate-400">{account.institution}</span>
          <span className="text-slate-200">·</span>
          <span className="text-xs text-slate-400">{TYPE_LABELS[account.type]}</span>
          {account.lastSyncedAt && (
            <>
              <span className="text-slate-200">·</span>
              <span className="text-xs text-slate-400">
                Synced {new Date(account.lastSyncedAt).toLocaleDateString()}
              </span>
            </>
          )}
        </div>
      </div>
      {/* Balance */}
      <div className="text-right shrink-0">
        <span className={`text-sm font-semibold ${asset ? "text-slate-900" : "text-red-600"}`}>
          {asset ? formatMoney(account.balance) : `-${formatMoney(account.balance)}`}
        </span>
      </div>
      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
          title="Edit"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          title="Delete"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<PortfolioAccount[]>([]);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PortfolioAccount | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [acctRes, snapRes] = await Promise.all([
        fetch("/api/portfolio/accounts", {
          headers: { Authorization: `Bearer ${user.idToken}` },
        }),
        fetch("/api/portfolio/snapshots", {
          headers: { Authorization: `Bearer ${user.idToken}` },
        }),
      ]);
      const [acctData, snapData] = await Promise.all([acctRes.json(), snapRes.json()]);
      setAccounts(acctData.accounts ?? []);
      setSnapshots(snapData.snapshots ?? []);
    } catch {
      // silently fail — empty state handles it
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSync = async () => {
    if (!user || syncing) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/portfolio/plaid/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.idToken}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.accounts?.length) {
        setAccounts((prev) =>
          prev.map((a) => {
            const updated = data.accounts.find((u: PortfolioAccount) => u.id === a.id);
            return updated ? { ...a, ...updated } : a;
          })
        );
        // Reload snapshots after sync
        const snapRes = await fetch("/api/portfolio/snapshots", {
          headers: { Authorization: `Bearer ${user.idToken}` },
        });
        const snapData = await snapRes.json();
        setSnapshots(snapData.snapshots ?? []);
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    setDeleting(true);
    try {
      await fetch(`/api/portfolio/accounts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user.idToken}` },
      });
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setDeleteConfirm(null);
      // Refresh snapshots
      const snapRes = await fetch("/api/portfolio/snapshots", {
        headers: { Authorization: `Bearer ${user.idToken}` },
      });
      const snapData = await snapRes.json();
      setSnapshots(snapData.snapshots ?? []);
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdated = (id: string, updates: Partial<PortfolioAccount>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  if (!user) return null;

  const { totalAssets, totalLiabilities, netWorth } = computeTotals(accounts);
  const allocation: AllocationSlice[] = computeAllocation(accounts);
  const assetAccounts = accounts.filter((a) => !a.isHidden && isAsset(a.type));
  const liabilityAccounts = accounts.filter((a) => !a.isHidden && !isAsset(a.type));
  const hasPlaidAccounts = accounts.some((a) => a.source === "plaid");

  // Format snapshot dates for the chart
  const chartData = snapshots.map((s) => ({
    date: new Date(s.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    netWorth: s.netWorth,
  }));

  // 30-day delta
  const thirtyDaysAgo = snapshots.find((s) => {
    const d = new Date(s.date);
    const diff = (Date.now() - d.getTime()) / 86400000;
    return diff >= 28 && diff <= 35;
  });
  const delta = thirtyDaysAgo ? netWorth - thirtyDaysAgo.netWorth : null;

  return (
    <AuthenticatedLayout activeNav="portfolio">
      <ProGate feature="Portfolio Manager">
        <div className="relative">
          <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center px-6">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Coming Soon</h2>
              <p className="text-slate-500 text-sm max-w-xs">Portfolio Manager is under active development and will be available shortly.</p>
            </div>
          </div>
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-8 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] bg-clip-text text-transparent">
                Portfolio Manager
              </h1>
              <p className="text-slate-500 text-sm mt-1">Your complete financial picture</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {hasPlaidAccounts && (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-teal-400 hover:text-teal-600 transition disabled:opacity-50"
                >
                  <svg className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {syncing ? "Syncing..." : "Sync"}
                </button>
              )}
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl hover:opacity-90 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Account
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-12 h-12 border-4 border-[#1a3fd4] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {/* Net Worth — gradient */}
                <div className="bg-gradient-to-br from-[#1a3fd4] to-[#00d4aa] rounded-xl p-5 text-white">
                  <p className="text-xs text-white/70 uppercase tracking-wider font-medium mb-1">Net Worth</p>
                  <p className="text-3xl font-bold">{formatMoney(netWorth)}</p>
                  {delta !== null && (
                    <p className={`text-xs mt-2 ${delta >= 0 ? "text-white/80" : "text-white/60"}`}>
                      {delta >= 0 ? "↑" : "↓"} {formatMoney(Math.abs(delta))} vs 30 days ago
                    </p>
                  )}
                </div>
                {/* Total Assets */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Total Assets</p>
                  <p className="text-2xl font-bold text-slate-900">{formatMoney(totalAssets)}</p>
                  <p className="text-xs text-green-600 mt-2">{assetAccounts.length} account{assetAccounts.length !== 1 ? "s" : ""}</p>
                </div>
                {/* Total Liabilities */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Total Liabilities</p>
                  <p className="text-2xl font-bold text-red-600">{formatMoney(totalLiabilities)}</p>
                  <p className="text-xs text-slate-400 mt-2">{liabilityAccounts.length} account{liabilityAccounts.length !== 1 ? "s" : ""}</p>
                </div>
              </div>

              {/* Charts Row */}
              {accounts.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-4 mb-8">
                  {/* Allocation Pie */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h2 className="font-semibold text-slate-800 mb-4">Asset Allocation</h2>
                    {allocation.length > 0 ? (
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height={256} minWidth={0}>
                          <PieChart>
                            <Pie
                              data={allocation}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={2}
                            >
                              {allocation.map((slice, i) => (
                                <Cell key={i} fill={slice.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v: unknown) => formatMoney(Number(v))} />
                            <Legend
                              iconType="circle"
                              iconSize={8}
                              formatter={(value) => (
                                <span className="text-xs text-slate-600">{value}</span>
                              )}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-52 flex items-center justify-center text-sm text-slate-400">
                        Add asset accounts to see allocation
                      </div>
                    )}
                  </div>

                  {/* Net Worth History */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h2 className="font-semibold text-slate-800 mb-4">Net Worth History</h2>
                    {chartData.length > 1 ? (
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height={256} minWidth={0}>
                          <LineChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 10, fill: "#94a3b8" }}
                              tickLine={false}
                              axisLine={false}
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: "#94a3b8" }}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={fmt}
                              width={55}
                            />
                            <Tooltip
                              formatter={(v: unknown) => [formatMoney(Number(v)), "Net Worth"]}
                              contentStyle={{
                                background: "#fff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="netWorth"
                              stroke="#14b8a6"
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 4, fill: "#14b8a6" }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-52 flex flex-col items-center justify-center text-center">
                        <p className="text-sm text-slate-400">History builds as you return daily</p>
                        <p className="text-xs text-slate-300 mt-1">Come back tomorrow to see your first data point</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {accounts.length === 0 && (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
                  <div className="w-14 h-14 bg-gradient-to-br from-teal-50 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-700 font-medium">No accounts yet</p>
                  <p className="text-sm text-slate-400 mt-1 mb-6">Connect your bank accounts or add them manually to track your net worth</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-xl text-sm font-medium hover:opacity-90 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Your First Account
                  </button>
                </div>
              )}

              {/* Account Lists */}
              {accounts.length > 0 && (
                <div className="space-y-6">
                  {/* Assets */}
                  {assetAccounts.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-slate-700">Assets</h2>
                        <span className="text-sm font-semibold text-slate-900">{formatMoney(totalAssets)}</span>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                        {assetAccounts.map((a) => (
                          <AccountRow
                            key={a.id}
                            account={a}
                            onEdit={() => setEditingAccount(a)}
                            onDelete={() => setDeleteConfirm(a.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Liabilities */}
                  {liabilityAccounts.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-slate-700">Liabilities</h2>
                        <span className="text-sm font-semibold text-red-600">-{formatMoney(totalLiabilities)}</span>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                        {liabilityAccounts.map((a) => (
                          <AccountRow
                            key={a.id}
                            account={a}
                            onEdit={() => setEditingAccount(a)}
                            onDelete={() => setDeleteConfirm(a.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>

        {/* Add Account Modal */}
        {showAddModal && (
          <AddAccountModal
            onClose={() => setShowAddModal(false)}
            onAdded={(newAccounts) => {
              setAccounts((prev) => [...prev, ...newAccounts]);
              loadData(); // reload to get updated snapshot
            }}
            idToken={user.idToken}
          />
        )}

        {/* Edit Account Modal */}
        {editingAccount && (
          <EditAccountModal
            account={editingAccount}
            onClose={() => setEditingAccount(null)}
            onUpdated={handleUpdated}
            idToken={user.idToken}
          />
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Remove Account</h3>
              <p className="text-sm text-slate-600 mb-6">
                Are you sure you want to remove this account? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition disabled:opacity-50"
                >
                  {deleting ? "Removing..." : "Remove"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>{/* end relative wrapper */}
      </ProGate>
    </AuthenticatedLayout>
  );
}

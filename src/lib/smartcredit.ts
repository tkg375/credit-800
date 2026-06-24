/**
 * SmartCredit Enterprise API Client
 *
 * Handles account linking, credit data ingestion, and webhook verification
 * for the SmartCredit Enterprise partner integration.
 *
 * Env vars required (set once API docs are received):
 *   SMARTCREDIT_PARTNER_ID     — your partner ID (currently 38488)
 *   SMARTCREDIT_API_KEY        — enterprise API key
 *   SMARTCREDIT_API_BASE_URL   — base URL for enterprise API endpoints
 *   SMARTCREDIT_WEBHOOK_SECRET — used to verify incoming webhook signatures
 *
 * TODO: Fill in all endpoint paths and request/response shapes once
 * SmartCredit provides Enterprise API documentation.
 */

export interface SmartCreditLinkPayload {
  /** SmartCredit's user/member ID after the user creates their account */
  smartCreditUserId: string;
  /** Your platform's user ID */
  platformUserId: string;
}

export interface SmartCreditScore {
  bureau: "TRANSUNION" | "EQUIFAX" | "EXPERIAN";
  score: number;
  model: string;
  pulledAt: string;
}

export interface SmartCreditTradeline {
  creditorName: string;
  accountNumber: string;
  accountType: string;
  balance: number | null;
  creditLimit: number | null;
  status: string;
  dateOpened: string | null;
  dateOfFirstDelinquency: string | null;
  lastActivityDate: string | null;
  isNegative: boolean;
  bureau: "TRANSUNION" | "EQUIFAX" | "EXPERIAN";
}

export interface SmartCreditReport {
  smartCreditUserId: string;
  reportId: string;
  pulledAt: string;
  scores: SmartCreditScore[];
  tradelines: SmartCreditTradeline[];
  collectionAccounts: SmartCreditTradeline[];
}

export interface SmartCreditWebhookEvent {
  event: "credit_report_updated" | "score_change" | "collection_added" | "account_linked";
  smartCreditUserId: string;
  platformUserId?: string;
  data: SmartCreditReport | Record<string, unknown>;
  timestamp: string;
}

function getConfig() {
  const partnerId = process.env.SMARTCREDIT_PARTNER_ID;
  const apiKey = process.env.SMARTCREDIT_API_KEY;
  const baseUrl = process.env.SMARTCREDIT_API_BASE_URL;
  const webhookSecret = process.env.SMARTCREDIT_WEBHOOK_SECRET;

  if (!partnerId || !apiKey || !baseUrl) {
    throw new Error(
      "SmartCredit Enterprise API is not configured. Set SMARTCREDIT_PARTNER_ID, SMARTCREDIT_API_KEY, and SMARTCREDIT_API_BASE_URL."
    );
  }

  return { partnerId, apiKey, baseUrl, webhookSecret };
}

/**
 * Fetch the latest credit report for a linked SmartCredit user.
 *
 * TODO: Confirm endpoint path and response shape from API docs.
 */
export async function fetchSmartCreditReport(
  smartCreditUserId: string
): Promise<SmartCreditReport> {
  const { apiKey, baseUrl } = getConfig();

  // TODO: Replace with actual endpoint once API docs are received
  const res = await fetch(`${baseUrl}/v1/members/${smartCreditUserId}/report`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[smartcredit] Failed to fetch report (${res.status}): ${err}`);
  }

  const raw = await res.json();

  // TODO: Map raw API response to SmartCreditReport shape
  // This is a placeholder mapping — update once API docs confirm field names
  return {
    smartCreditUserId,
    reportId: raw.reportId ?? raw.id ?? `sc_${Date.now()}`,
    pulledAt: raw.pulledAt ?? raw.reportDate ?? new Date().toISOString(),
    scores: (raw.scores ?? []).map((s: any) => ({
      bureau: s.bureau ?? "TRANSUNION",
      score: s.score ?? s.value,
      model: s.model ?? "VantageScore 3.0",
      pulledAt: s.pulledAt ?? new Date().toISOString(),
    })),
    tradelines: (raw.tradelines ?? raw.accounts ?? []).map(mapTradeline),
    collectionAccounts: (raw.collectionAccounts ?? raw.collections ?? []).map(mapTradeline),
  };
}

/**
 * Link a SmartCredit member account to a platform user account.
 * Called after the user completes SmartCredit signup.
 *
 * TODO: Confirm endpoint and request body from API docs.
 */
export async function linkSmartCreditAccount(
  payload: SmartCreditLinkPayload
): Promise<{ success: boolean }> {
  const { apiKey, baseUrl, partnerId } = getConfig();

  // TODO: Replace with actual endpoint once API docs are received
  const res = await fetch(`${baseUrl}/v1/partners/${partnerId}/link`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      memberId: payload.smartCreditUserId,
      externalUserId: payload.platformUserId,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[smartcredit] Account link failed (${res.status}): ${err}`);
  }

  return { success: true };
}

/**
 * Verify that an incoming webhook request is from SmartCredit.
 * Returns true if the signature is valid.
 *
 * TODO: Confirm signature header name and algorithm from API docs.
 * Common patterns: HMAC-SHA256 over raw body, header: X-SmartCredit-Signature
 */
export function verifySmartCreditWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const { webhookSecret } = getConfig();

  if (!webhookSecret) {
    console.warn("[smartcredit] SMARTCREDIT_WEBHOOK_SECRET not set — skipping signature verification");
    return true;
  }

  if (!signatureHeader) return false;

  // TODO: Replace with actual signature algorithm once API docs confirm it
  // Example HMAC-SHA256 verification:
  const crypto = require("crypto");
  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expected)
  );
}

/**
 * Build the SmartCredit signup/referral URL for a user.
 * Optionally pre-fills user data if SmartCredit supports query params.
 */
export function buildSmartCreditSignupUrl(opts?: {
  firstName?: string;
  lastName?: string;
  email?: string;
}): string {
  const partnerId = process.env.SMARTCREDIT_PARTNER_ID ?? "38488";
  const base = `https://www.smartcredit.com/join/?pid=${partnerId}`;

  // TODO: Confirm whether SmartCredit Enterprise supports pre-fill query params
  // If yes, append: &firstName=...&lastName=...&email=...
  if (opts?.firstName || opts?.email) {
    const params = new URLSearchParams();
    if (opts.firstName) params.set("firstName", opts.firstName);
    if (opts.lastName) params.set("lastName", opts.lastName);
    if (opts.email) params.set("email", opts.email);
    return `${base}&${params.toString()}`;
  }

  return base;
}

function mapTradeline(t: any): SmartCreditTradeline {
  return {
    creditorName: t.creditorName ?? t.name ?? "",
    accountNumber: t.accountNumber ?? t.accountNum ?? "",
    accountType: t.accountType ?? t.type ?? "",
    balance: t.balance ?? t.currentBalance ?? null,
    creditLimit: t.creditLimit ?? t.limit ?? null,
    status: t.status ?? t.accountStatus ?? "",
    dateOpened: t.dateOpened ?? t.openDate ?? null,
    dateOfFirstDelinquency: t.dateOfFirstDelinquency ?? t.firstDelinquency ?? null,
    lastActivityDate: t.lastActivityDate ?? t.lastActivity ?? null,
    isNegative: !!(t.isNegative ?? t.derogatory ?? t.negative),
    bureau: t.bureau ?? "TRANSUNION",
  };
}

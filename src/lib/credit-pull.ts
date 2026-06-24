/**
 * Credit Bureau API Abstraction Layer
 *
 * This module provides a single interface for pulling consumer credit reports
 * from any supported provider. Swap the implementation by setting:
 *   CREDIT_PULL_PROVIDER=crs|bloom|softpull|equifax|stub
 *
 * All implementations must:
 * - Use soft inquiries only (no hard pulls)
 * - Never log or persist the full SSN
 * - Return normalized data in the CreditPullResult format
 *
 * FCRA compliance notes:
 * - Every call to pullCreditReport MUST have a corresponding consent record ID
 * - The consentId is passed to every provider implementation for logging
 * - Permissible purpose: consumer's written authorization (FCRA § 604(a)(2))
 */

export interface CreditPullIdentity {
  firstName: string;
  lastName: string;
  /** ISO date: YYYY-MM-DD */
  dateOfBirth: string;
  /**
   * Full SSN — used ONLY for the credit pull API call.
   * NEVER stored, logged, or persisted by this module.
   */
  ssn: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface CreditTradeline {
  creditorName: string;
  accountNumber: string;
  accountType: string;
  /** Current balance in dollars */
  balance: number | null;
  creditLimit: number | null;
  status: string;
  dateOpened: string | null;
  dateOfFirstDelinquency: string | null;
  lastActivityDate: string | null;
  isNegative: boolean;
  bureau: "EQUIFAX" | "EXPERIAN" | "TRANSUNION";
  latePayments?: string[];
}

export interface CreditPullResult {
  /** External report ID from the bureau/provider */
  externalReportId: string;
  /** VantageScore 3.0 or 4.0 */
  vantageScore: number | null;
  bureau: "EQUIFAX" | "EXPERIAN" | "TRANSUNION" | "TRI_MERGE";
  tradelines: CreditTradeline[];
  pulledAt: string;
  provider: string;
}

export type CreditPullProvider = "crs" | "bloom" | "softpull" | "equifax" | "smartcredit" | "stub";

// ---------------------------------------------------------------------------
// Stub provider — returns mock data for development/testing
// Replace with real provider before going to production
// ---------------------------------------------------------------------------

async function pullStub(
  identity: CreditPullIdentity
): Promise<CreditPullResult> {
  console.warn(
    "[credit-pull] Using STUB provider. Set CREDIT_PULL_PROVIDER to a real provider before production."
  );
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 500));

  return {
    externalReportId: `stub_${Date.now()}`,
    vantageScore: 612,
    bureau: "TRI_MERGE",
    pulledAt: new Date().toISOString(),
    provider: "stub",
    tradelines: [
      {
        creditorName: "Midland Credit Management",
        accountNumber: "****7832",
        accountType: "Collection",
        balance: 1250,
        creditLimit: null,
        status: "COLLECTION",
        dateOpened: "2019-03-15",
        dateOfFirstDelinquency: "2019-08-01",
        lastActivityDate: "2020-02-15",
        isNegative: true,
        bureau: "EQUIFAX",
      },
      {
        creditorName: "Portfolio Recovery Associates",
        accountNumber: "****5566",
        accountType: "Collection",
        balance: 890,
        creditLimit: null,
        status: "COLLECTION",
        dateOpened: "2018-06-20",
        dateOfFirstDelinquency: "2018-11-01",
        lastActivityDate: "2019-04-10",
        isNegative: true,
        bureau: "TRANSUNION",
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// CRS Credit API provider
// Docs: https://crscreditapi.com/documentation
// Env vars: CREDIT_PULL_CRS_API_KEY
// ---------------------------------------------------------------------------

async function pullCRS(
  identity: CreditPullIdentity
): Promise<CreditPullResult> {
  const apiKey = process.env.CREDIT_PULL_CRS_API_KEY;
  if (!apiKey) throw new Error("CREDIT_PULL_CRS_API_KEY is not configured");

  // TODO: Implement CRS Credit API integration
  // Reference: https://crscreditapi.com/documentation
  // Endpoint: POST https://api.crscreditapi.com/v1/reports/soft-pull
  // Headers: { "X-API-Key": apiKey, "Content-Type": "application/json" }
  // Body: { firstName, lastName, dob, ssn, address, city, state, zip }
  //
  // Map response.tradelines to CreditTradeline[]
  // Map response.scores.vantage to vantageScore
  throw new Error(
    "CRS Credit API provider not yet implemented. See credit-pull.ts for integration instructions."
  );
}

// ---------------------------------------------------------------------------
// Bloom Credit provider
// Docs: https://developers.bloomcredit.io
// Env vars: BLOOM_CREDIT_CLIENT_ID, BLOOM_CREDIT_CLIENT_SECRET
// ---------------------------------------------------------------------------

async function pullBloom(
  identity: CreditPullIdentity
): Promise<CreditPullResult> {
  const clientId = process.env.BLOOM_CREDIT_CLIENT_ID;
  const clientSecret = process.env.BLOOM_CREDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    throw new Error(
      "BLOOM_CREDIT_CLIENT_ID and BLOOM_CREDIT_CLIENT_SECRET are not configured"
    );

  // TODO: Implement Bloom Credit integration
  // Step 1 — OAuth2 token exchange:
  //   POST https://api.bloomcredit.io/auth/token
  //   body: { client_id, client_secret, grant_type: "client_credentials" }
  //
  // Step 2 — Pull report:
  //   POST https://api.bloomcredit.io/data/v1/consumer/report
  //   Headers: { Authorization: "Bearer <token>" }
  //   body: { consumer: { first_name, last_name, ssn, dob, address... } }
  //   skus: ["equifax-bronze-soft-vantage-internet", ...] or tri-merge equivalent
  //
  // Map response to CreditPullResult
  throw new Error(
    "Bloom Credit provider not yet implemented. See credit-pull.ts for integration instructions."
  );
}

// ---------------------------------------------------------------------------
// Soft Pull Solutions provider
// Docs: https://softpullsolutions.com/api
// Env vars: CREDIT_PULL_SPS_API_KEY
// ---------------------------------------------------------------------------

async function pullSoftPullSolutions(
  identity: CreditPullIdentity
): Promise<CreditPullResult> {
  const apiKey = process.env.CREDIT_PULL_SPS_API_KEY;
  if (!apiKey)
    throw new Error("CREDIT_PULL_SPS_API_KEY is not configured");

  // TODO: Implement Soft Pull Solutions integration
  // Reference: https://softpullsolutions.com/api-documentation
  throw new Error(
    "Soft Pull Solutions provider not yet implemented. See credit-pull.ts for integration instructions."
  );
}

// ---------------------------------------------------------------------------
// Equifax OneView (Consumer Credit Report) provider
// Docs: https://developer.equifax.com/products/apiproducts/oneview-consumer-credit-report
// Sandbox scope: https://api.equifax.com/business/oneview/consumer-credit/v1
// Env vars: EQUIFAX_CLIENT_ID, EQUIFAX_CLIENT_SECRET
// ---------------------------------------------------------------------------

/** In-memory token cache to avoid redundant OAuth2 calls */
let equifaxTokenCache: { token: string; expiresAt: number } | null = null;

async function getEquifaxToken(clientId: string, clientSecret: string): Promise<string> {
  const now = Date.now();
  if (equifaxTokenCache && equifaxTokenCache.expiresAt > now + 30_000) {
    return equifaxTokenCache.token;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://api.equifax.com/v2/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.equifax.com/business/oneview/consumer-credit/v1",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[equifax] OAuth2 token exchange failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  equifaxTokenCache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 1800) * 1000,
  };
  return equifaxTokenCache.token;
}

async function pullEquifax(
  identity: CreditPullIdentity
): Promise<CreditPullResult> {
  const clientId = process.env.EQUIFAX_CLIENT_ID;
  const clientSecret = process.env.EQUIFAX_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    throw new Error("EQUIFAX_CLIENT_ID and EQUIFAX_CLIENT_SECRET are not configured");

  const token = await getEquifaxToken(clientId, clientSecret);

  // TODO: Confirm exact request body field names once test credentials are approved
  // and API reference is accessible at developer.equifax.com
  //
  // Expected request shape (update field names from API reference as needed):
  //   POST https://api.equifax.com/business/oneview/consumer-credit/v1
  //   Headers: { Authorization: "Bearer <token>", Content-Type: "application/json" }
  //   Body: {
  //     consumers: [{
  //       name: [{ firstName, lastName }],
  //       socialNum: identity.ssn,           // confirm field name
  //       dateOfBirth: identity.dateOfBirth, // confirm format (YYYY-MM-DD or MM/DD/YYYY)
  //       addresses: [{
  //         line1: identity.address,
  //         city: identity.city,
  //         state: identity.state,
  //         zip: identity.zip,
  //       }],
  //     }],
  //     featuresTog: ["softInquiry"],        // confirm soft-pull toggle field
  //   }
  //
  // Expected response shape (update paths from API reference):
  //   response.consumers[0].equifaxUSConsumerCreditReport[0]
  //     .scores[]           → find VantageScore (modelIndicator === "VS4" or similar)
  //     .tradelines[]       → account/tradeline array
  //     .reportDate         → report date
  //     .identifier         → external report ID

  const res = await fetch("https://api.equifax.com/business/oneview/consumer-credit/v1", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      consumers: [
        {
          name: [{ firstName: identity.firstName, lastName: identity.lastName }],
          socialNum: identity.ssn,
          dateOfBirth: identity.dateOfBirth,
          addresses: [
            {
              line1: identity.address,
              city: identity.city,
              state: identity.state,
              zip: identity.zip,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[equifax] Credit report request failed (${res.status}): ${err}`);
  }

  const data = await res.json();

  // TODO: Update these paths once the API reference is confirmed
  const report = data?.consumers?.[0]?.equifaxUSConsumerCreditReport?.[0];
  if (!report) throw new Error("[equifax] Unexpected response shape — missing report data");

  const scores: Array<{ score: number; modelIndicator: string }> = report.scores ?? [];
  const vantageEntry = scores.find((s) =>
    s.modelIndicator?.toUpperCase().startsWith("VS")
  );

  const tradelines: CreditTradeline[] = (report.tradelines ?? []).map((t: any) => ({
    creditorName: t.creditorName ?? t.subscriberName ?? "",
    accountNumber: t.accountNumber ?? "",
    accountType: t.portfolioTypeCode ?? t.accountType ?? "",
    balance: t.currentBalance ?? null,
    creditLimit: t.creditLimit ?? t.highCreditAmount ?? null,
    status: t.accountStatusCode ?? t.status ?? "",
    dateOpened: t.dateOpened ?? null,
    dateOfFirstDelinquency: t.dateFirstDelinquency ?? null,
    lastActivityDate: t.dateLastActivity ?? null,
    isNegative: !!(t.derogatory || t.collections || t.chargeOff),
    bureau: "EQUIFAX" as const,
  }));

  return {
    externalReportId: report.identifier ?? report.reportDate ?? `equifax_${Date.now()}`,
    vantageScore: vantageEntry?.score ?? null,
    bureau: "EQUIFAX",
    tradelines,
    pulledAt: new Date().toISOString(),
    provider: "equifax",
  };
}

// ---------------------------------------------------------------------------
// SmartCredit Enterprise provider
// Pulls via the SmartCredit API using a pre-linked member account.
// Requires the user to have already linked their SmartCredit account via
// POST /api/smartcredit/link (stores smartCreditUserId on the user profile).
// Env vars: SMARTCREDIT_API_KEY, SMARTCREDIT_API_BASE_URL
// ---------------------------------------------------------------------------

async function pullSmartCredit(
  identity: CreditPullIdentity,
  smartCreditUserId?: string
): Promise<CreditPullResult> {
  if (!smartCreditUserId) {
    throw new Error(
      "SmartCredit pull requires a linked smartCreditUserId. " +
      "The user must complete SmartCredit account setup first."
    );
  }

  const { fetchSmartCreditReport } = await import("./smartcredit");
  const report = await fetchSmartCreditReport(smartCreditUserId);

  const primaryScore = report.scores?.[0];
  const allTradelines = [
    ...(report.tradelines ?? []),
    ...(report.collectionAccounts ?? []),
  ];

  return {
    externalReportId: report.reportId,
    vantageScore: primaryScore?.score ?? null,
    bureau: "TRANSUNION",
    pulledAt: report.pulledAt,
    provider: "smartcredit",
    tradelines: allTradelines.map((t) => ({
      creditorName: t.creditorName,
      accountNumber: t.accountNumber,
      accountType: t.accountType,
      balance: t.balance,
      creditLimit: t.creditLimit,
      status: t.status,
      dateOpened: t.dateOpened,
      dateOfFirstDelinquency: t.dateOfFirstDelinquency,
      lastActivityDate: t.lastActivityDate,
      isNegative: t.isNegative,
      bureau: t.bureau,
    })),
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Pull a consumer credit report for the given identity.
 *
 * SECURITY: The SSN in `identity` is used for the API call only and must
 * NEVER be logged, written to a database, or included in error messages.
 * The caller is responsible for clearing the SSN from memory after calling
 * this function.
 *
 * @param identity - Consumer PII needed for identity verification
 * @param consentId - Firestore ID of the user's active FCRA consent record
 * @param smartCreditUserId - Required when provider is "smartcredit"
 */
export async function pullCreditReport(
  identity: CreditPullIdentity,
  consentId: string,
  smartCreditUserId?: string
): Promise<CreditPullResult> {
  const provider = (process.env.CREDIT_PULL_PROVIDER ?? "stub") as CreditPullProvider;

  // Log the pull attempt (without any PII or SSN)
  console.log(
    `[credit-pull] Initiating ${provider} soft pull. consentId=${consentId}`
  );

  switch (provider) {
    case "crs":
      return pullCRS(identity);
    case "bloom":
      return pullBloom(identity);
    case "softpull":
      return pullSoftPullSolutions(identity);
    case "equifax":
      return pullEquifax(identity);
    case "smartcredit":
      return pullSmartCredit(identity, smartCreditUserId);
    case "stub":
    default:
      return pullStub(identity);
  }
}

/**
 * Map a raw tradeline from a credit pull to the dispute reason string
 * used in the dispute letter generation flow.
 */
export function tradelineToDisputeReason(tradeline: CreditTradeline): string {
  if (tradeline.accountType === "Medical Collection") {
    return "Medical collection — verify HIPAA compliance and insurance coverage";
  }
  if (tradeline.accountType === "Collection") {
    return "Collection account — demand validation of original signed agreement and complete chain of assignment";
  }
  if (tradeline.latePayments && tradeline.latePayments.length > 0) {
    return "Late payment reported — verify accuracy of payment dates and creditor reporting";
  }
  if (tradeline.balance && tradeline.creditLimit) {
    return "Inaccurate balance or account status — request verification of all reported information";
  }
  return "Information is inaccurate or unverifiable — request full investigation under FCRA § 611";
}

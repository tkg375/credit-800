import { firestore } from "./dynamodb";

/**
 * Increment this version whenever the consent text changes.
 * Users who consented under an older version must re-consent.
 */
export const CONSENT_VERSION = "1.0";

/**
 * Exact text shown to the user at time of consent.
 * This text is stored verbatim with each consent record for audit purposes.
 * It must satisfy FCRA § 604(a)(2) — written instructions of the consumer.
 */
export const CONSENT_TEXT = `AUTHORIZATION TO OBTAIN CONSUMER CREDIT REPORT
Fair Credit Reporting Act (FCRA) § 604(a)(2) — Written Authorization

By clicking "I Authorize", you ("Consumer") hereby instruct and authorize Credit 800 ("Company") to take the following actions on your behalf:

1. CREDIT REPORT ACCESS
   The Company is authorized to obtain your consumer credit report(s) from one or more of the three national consumer reporting agencies — Equifax, Experian, and/or TransUnion — using a SOFT INQUIRY. Soft inquiries do NOT affect your credit score and are not visible to lenders.

2. PURPOSE
   Your credit report will be used solely to: (a) identify negative, inaccurate, or unverifiable items on your credit file; (b) prepare formal dispute letters under the Fair Credit Reporting Act (FCRA) and/or Fair Debt Collection Practices Act (FDCPA) on your behalf; and (c) mail those letters to the applicable creditors and/or credit bureaus via certified U.S. Mail under your name and signature.

3. RECURRING AUTHORIZATION
   This authorization covers monthly credit report access for as long as your Autopilot subscription remains active. The Company will pull your report no more than once per 30-day period. You may revoke this authorization at any time by canceling your Autopilot subscription or visiting our support page at credit-800.com/support, effective at the end of your current billing period.

4. DATA HANDLING & SECURITY
   Your full Social Security Number is transmitted directly to the credit bureau via encrypted connection for identity verification only. It is NEVER stored by Credit 800 in any database, log, or file. Only the last four digits of your SSN are retained for record-keeping. All credit data is encrypted at rest and in transit, handled pursuant to the FCRA, the Gramm-Leach-Bliley Act (GLBA), and our Privacy Policy.

5. YOUR FCRA RIGHTS
   You have the right to know what is in your credit file. You have the right to ask for your credit score. You have the right to dispute incomplete or inaccurate information. Consumer reporting agencies must correct or delete inaccurate, incomplete, or unverifiable information. Consumer reporting agencies may not report outdated negative information. Access to your file is limited. You must give your consent for reports to be provided to employers. You may seek damages from violators. Identity theft victims and active duty military personnel have additional rights.

   For more information about your rights under the FCRA, visit consumerfinance.gov/learnmore or write to: Consumer Financial Protection Bureau, 1700 G Street N.W., Washington, DC 20552.

6. ELECTRONIC SIGNATURE
   By clicking "I Authorize", you are providing your electronic signature as required by the Electronic Signatures in Global and National Commerce Act (ESIGN), 15 U.S.C. § 7001. This constitutes your written authorization under FCRA § 604(a)(2) and has the same legal effect as a handwritten signature.

This authorization is effective as of the date and time you click "I Authorize" below.`.trim();

export interface ConsentRecord {
  id: string;
  userId: string;
  version: string;
  consentText: string;
  consentedAt: string;
  ip: string;
  userAgent: string;
  revokedAt?: string;
  isActive: boolean;
}

/**
 * Record a new FCRA consent for a user.
 * Returns the consent record ID.
 */
export async function recordConsent(params: {
  userId: string;
  ip: string;
  userAgent: string;
}): Promise<string> {
  const { userId, ip, userAgent } = params;
  const now = new Date().toISOString();

  const consentId = await firestore.addDoc("fcraConsents", {
    userId,
    version: CONSENT_VERSION,
    consentText: CONSENT_TEXT,
    consentedAt: now,
    ip,
    userAgent,
    isActive: true,
    revokedAt: null,
  });

  // Update the user's record to point to their active consent
  await firestore.updateDoc("users", userId, {
    autopilotConsentId: consentId,
    autopilotConsentedAt: now,
    autopilotConsentVersion: CONSENT_VERSION,
  });

  return consentId;
}

/**
 * Returns the user's active, non-revoked consent if it exists and matches
 * the current consent version. Returns null if consent is missing, revoked,
 * or stale (version mismatch requires re-consent).
 *
 * Uses the consentId stored on the user doc to avoid needing a composite index.
 */
export async function getValidConsent(userId: string): Promise<ConsentRecord | null> {
  const userDoc = await firestore.getDoc("users", userId);
  if (!userDoc.exists) return null;

  const consentId = userDoc.data.autopilotConsentId as string | null;
  const consentVersion = userDoc.data.autopilotConsentVersion as string | null;

  // No consent on file, or it was for an older version
  if (!consentId || consentVersion !== CONSENT_VERSION) return null;

  // Look up the consent record directly by ID
  const doc = await firestore.getDoc("fcraConsents", consentId);
  if (!doc.exists || !doc.data.isActive) return null;

  return {
    id: doc.id,
    userId: doc.data.userId as string,
    version: doc.data.version as string,
    consentText: doc.data.consentText as string,
    consentedAt: doc.data.consentedAt as string,
    ip: doc.data.ip as string,
    userAgent: doc.data.userAgent as string,
    revokedAt: (doc.data.revokedAt as string) || undefined,
    isActive: doc.data.isActive as boolean,
  };
}

/**
 * Revoke a user's active consent. The record is kept immutably for
 * compliance audit trail — only the isActive flag is set to false.
 */
export async function revokeConsent(userId: string, consentId: string): Promise<void> {
  // Verify ownership before revoking
  const doc = await firestore.getDoc("fcraConsents", consentId);
  if (!doc.exists || doc.data.userId !== userId) {
    throw new Error("Consent record not found or unauthorized");
  }

  await firestore.updateDoc("fcraConsents", consentId, {
    isActive: false,
    revokedAt: new Date().toISOString(),
  });

  await firestore.updateDoc("users", userId, {
    autopilotConsentId: null,
    autopilotConsentedAt: null,
  });
}

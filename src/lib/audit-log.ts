import { firestore } from "./dynamodb";

export type AuditActionType =
  | "autopilot_consent_given"
  | "autopilot_consent_revoked"
  | "autopilot_enrolled"
  | "autopilot_paused"
  | "autopilot_resumed"
  | "autopilot_run_started"
  | "autopilot_run_completed"
  | "autopilot_run_failed"
  | "autopilot_run_skipped"
  | "credit_pull_initiated"
  | "credit_pull_completed"
  | "credit_pull_failed"
  | "dispute_auto_generated"
  | "letter_auto_mailed"
  | "letter_auto_mail_failed"
  | "autopilot_subscription_activated"
  | "autopilot_subscription_canceled"
  | "two_factor_verified"
  | "two_factor_failed"
  | "smartcredit_account_linked"
  | "smartcredit_webhook_received";

export interface AuditEntry {
  userId: string;
  action: AuditActionType;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

/**
 * Write an immutable audit log entry. Never throws — failures are logged
 * but must not crash the calling code path.
 */
export async function logAuditEvent(entry: AuditEntry): Promise<void> {
  try {
    await firestore.addDoc("auditLogs", {
      ...entry,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
}

/**
 * POST /api/smartcredit/webhook
 *
 * Receives automatic credit data push events from SmartCredit Enterprise.
 * When a linked user's credit report updates, SmartCredit calls this endpoint
 * with fresh tradelines, scores, and collection account data.
 *
 * This powers the "fully automated" experience — no manual upload needed.
 *
 * TODO: Register this URL in your SmartCredit partner portal once Enterprise
 * API docs are received:
 *   https://yourdomain.com/api/smartcredit/webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { firestore, COLLECTIONS } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit-log";
import {
  verifySmartCreditWebhookSignature,
  type SmartCreditWebhookEvent,
  type SmartCreditReport,
} from "@/lib/smartcredit";
import { tradelineToDisputeReason } from "@/lib/credit-pull";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Read raw body for signature verification
  const rawBody = await req.text();

  // TODO: Confirm the exact header name SmartCredit uses for signatures
  const signature = req.headers.get("x-smartcredit-signature");

  if (!verifySmartCreditWebhookSignature(rawBody, signature)) {
    console.warn("[smartcredit/webhook] Invalid signature — rejecting request");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: SmartCreditWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log(`[smartcredit/webhook] Received event: ${event.event} for member: ${event.smartCreditUserId}`);

  // Resolve internal user ID from SmartCredit member ID
  const links = await firestore.query(
    "smartCreditLinks",
    [{ field: "smartCreditUserId", op: "EQUAL", value: event.smartCreditUserId }],
    "linkedAt",
    "DESCENDING",
    1
  );

  if (links.length === 0) {
    console.warn(`[smartcredit/webhook] No linked user found for SmartCredit member: ${event.smartCreditUserId}`);
    return NextResponse.json({ received: true });
  }

  const userId = links[0].data.userId as string;
  const now = new Date().toISOString();

  switch (event.event) {
    case "credit_report_updated":
    case "collection_added":
      await handleReportUpdate(userId, event.data as SmartCreditReport, now);
      break;

    case "score_change":
      await handleScoreChange(userId, event.data as SmartCreditReport, now);
      break;

    case "account_linked":
      await firestore.updateDoc("smartCreditLinks", links[0].id, {
        status: "active",
        confirmedAt: now,
      });
      break;

    default:
      console.log(`[smartcredit/webhook] Unhandled event type: ${event.event}`);
  }

  await logAuditEvent({
    userId,
    action: "smartcredit_webhook_received",
    resourceId: event.smartCreditUserId,
    metadata: { event: event.event },
  });

  return NextResponse.json({ received: true });
}

async function handleReportUpdate(
  userId: string,
  report: SmartCreditReport,
  now: string
) {
  // Save the report record
  const reportId = await firestore.addDoc(COLLECTIONS.creditReports, {
    userId,
    source: "smartcredit",
    bureau: "TRANSUNION",
    externalReportId: report.reportId,
    provider: "smartcredit",
    status: "ANALYZED",
    analyzedAt: now,
    createdAt: now,
  });

  // Save updated scores
  for (const score of report.scores ?? []) {
    await firestore.addDoc(COLLECTIONS.creditScores, {
      userId,
      score: score.score,
      source: score.model ?? "VantageScore",
      bureau: score.bureau,
      recordedAt: score.pulledAt ?? now,
      smartCreditReportId: report.reportId,
    });
  }

  // Find negative tradelines + collections not yet disputed
  const allNegatives = [
    ...(report.tradelines ?? []).filter((t) => t.isNegative),
    ...(report.collectionAccounts ?? []),
  ];

  for (const tradeline of allNegatives) {
    // Avoid duplicates — check if this account already has a reportItem
    const existing = await firestore.query(COLLECTIONS.reportItems, [
      { field: "userId", op: "EQUAL", value: userId },
      { field: "creditorName", op: "EQUAL", value: tradeline.creditorName },
      { field: "accountNumber", op: "EQUAL", value: tradeline.accountNumber },
    ]);

    if (existing.length > 0) continue;

    await firestore.addDoc(COLLECTIONS.reportItems, {
      userId,
      creditReportId: reportId,
      creditorName: tradeline.creditorName,
      accountNumber: tradeline.accountNumber,
      accountType: tradeline.accountType,
      balance: tradeline.balance,
      creditLimit: tradeline.creditLimit,
      status: tradeline.status,
      dateOpened: tradeline.dateOpened,
      dateOfFirstDelinquency: tradeline.dateOfFirstDelinquency,
      lastActivityDate: tradeline.lastActivityDate,
      isDisputable: true,
      disputeReason: tradelineToDisputeReason({
        ...tradeline,
        bureau: tradeline.bureau,
        latePayments: [],
      }),
      bureau: tradeline.bureau,
      source: "smartcredit",
      createdAt: now,
    });
  }

  // Notify user
  await firestore.addDoc(COLLECTIONS.notifications, {
    userId,
    type: "credit_report_updated",
    title: "Credit Report Updated",
    message: `Your SmartCredit report has been updated. ${allNegatives.length} item(s) found that may be disputable.`,
    read: false,
    createdAt: now,
  });
}

async function handleScoreChange(
  userId: string,
  report: SmartCreditReport,
  now: string
) {
  for (const score of report.scores ?? []) {
    await firestore.addDoc(COLLECTIONS.creditScores, {
      userId,
      score: score.score,
      source: score.model ?? "VantageScore",
      bureau: score.bureau,
      recordedAt: score.pulledAt ?? now,
      smartCreditReportId: report.reportId,
    });
  }

  const primaryScore = report.scores?.[0];
  if (primaryScore) {
    await firestore.addDoc(COLLECTIONS.notifications, {
      userId,
      type: "score_change",
      title: "Credit Score Updated",
      message: `Your ${primaryScore.bureau} score has been updated to ${primaryScore.score}.`,
      read: false,
      createdAt: now,
    });
  }
}

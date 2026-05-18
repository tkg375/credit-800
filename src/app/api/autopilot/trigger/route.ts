import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getUserSubscription } from "@/lib/subscription";
import { getValidConsent } from "@/lib/fcra-consent";
import { pullCreditReport, tradelineToDisputeReason, type CreditPullIdentity } from "@/lib/credit-pull";
import { firestore, COLLECTIONS } from "@/lib/db";
import { resolveCreditorAddress, formatAddress } from "@/lib/creditor-addresses";
import { sendLetter, letterToHtml } from "@/lib/postgrid";
import { stripe, resolvePaymentMethod } from "@/lib/stripe";
import { logAuditEvent } from "@/lib/audit-log";
import { getLimiters } from "@/lib/ratelimit";

export const maxDuration = 60;

interface AutopilotRunRecord {
  runId: string;
}

/**
 * POST /api/autopilot/trigger
 *
 * Runs the full autopilot pipeline:
 *   1. Validate subscription + consent + cooldown
 *   2. Pull credit report (via configured provider)
 *   3. Save tradelines as reportItems
 *   4. For each disputable item: generate letter + mail via PostGrid
 *   5. Record run summary + audit log
 *
 * Body (optional): { identity: CreditPullIdentity }
 * If identity is omitted, the trigger processes existing unaddressed
 * disputable report items only (no new credit pull).
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await getUserSubscription(user.uid);
  if (!sub.isAutopilot) {
    return NextResponse.json({ error: "Autopilot subscription required" }, { status: 403 });
  }

  // --- Consent check ---
  const consent = await getValidConsent(user.uid);
  if (!consent) {
    return NextResponse.json(
      { error: "Valid FCRA consent is required before running autopilot. Please complete the authorization step." },
      { status: 403 }
    );
  }

  // --- Distributed lock: prevent concurrent runs from the same user ---
  // Uses Upstash sliding window as an atomic lock (1 request per 5-min window).
  // This closes the race condition between cooldown-check and run-record creation.
  const { success: lockAcquired } = await getLimiters().autopilotLock.limit(user.uid);
  if (!lockAcquired) {
    return NextResponse.json(
      { error: "An autopilot run is already starting. Please wait a moment." },
      { status: 409 }
    );
  }

  // --- Cooldown check: one run per 30 days ---
  const recentRuns = await firestore.query(
    "autopilotRuns",
    [{ field: "userId", op: "EQUAL", value: user.uid }],
    "startedAt",
    "DESCENDING",
    1
  );
  const lastRun = recentRuns[0];
  if (lastRun) {
    if (lastRun.data.status === "running") {
      return NextResponse.json(
        { error: "An autopilot run is already in progress.", runId: lastRun.id },
        { status: 409 }
      );
    }
    if (lastRun.data.status === "completed") {
      const cooldownMs = 30 * 24 * 60 * 60 * 1000;
      const elapsed = Date.now() - new Date(lastRun.data.startedAt as string).getTime();
      if (elapsed < cooldownMs) {
        const nextRunAt = new Date(
          new Date(lastRun.data.startedAt as string).getTime() + cooldownMs
        ).toISOString();
        return NextResponse.json(
          { error: "Autopilot already ran this month. Next run available after " + nextRunAt, nextRunAt },
          { status: 429 }
        );
      }
    }
  }

  if (!sub.stripeCustomerId) {
    return NextResponse.json({ error: "No billing information on file." }, { status: 402 });
  }

  // --- Create run record ---
  const now = new Date().toISOString();
  const runId = await firestore.addDoc("autopilotRuns", {
    userId: user.uid,
    consentId: consent.id,
    startedAt: now,
    status: "running",
    itemsFound: 0,
    lettersGenerated: 0,
    lettersMailed: 0,
    errors: [],
  });

  await logAuditEvent({
    userId: user.uid,
    action: "autopilot_run_started",
    resourceId: runId,
    metadata: { consentId: consent.id },
  });

  const errors: string[] = [];
  let itemsFound = 0;
  let lettersGenerated = 0;
  let lettersMailed = 0;

  try {
    // --- Step 1: Credit pull (if identity provided) ---
    let body: { identity?: CreditPullIdentity } = {};
    try {
      body = await req.json();
    } catch { /* identity is optional */ }

    if (body.identity) {
      const identity = body.identity;

      // Validate required identity fields (never log SSN)
      if (!identity.firstName || !identity.lastName || !identity.dateOfBirth || !identity.ssn || !identity.address || !identity.city || !identity.state || !identity.zip) {
        await firestore.updateDoc("autopilotRuns", runId, { status: "failed", errors: ["Missing required identity fields"], completedAt: new Date().toISOString() });
        return NextResponse.json({ error: "Missing required identity fields for credit pull" }, { status: 400 });
      }

      await logAuditEvent({
        userId: user.uid,
        action: "credit_pull_initiated",
        resourceId: runId,
        metadata: { consentId: consent.id, provider: process.env.CREDIT_PULL_PROVIDER || "stub" },
      });

      let pullResult;
      try {
        pullResult = await pullCreditReport(identity, consent.id);
      } catch (pullErr) {
        const msg = pullErr instanceof Error ? pullErr.message : String(pullErr);
        await logAuditEvent({ userId: user.uid, action: "credit_pull_failed", resourceId: runId, metadata: { error: msg } });
        await firestore.updateDoc("autopilotRuns", runId, { status: "failed", errors: [msg], completedAt: new Date().toISOString() });
        return NextResponse.json({ error: "Credit pull failed: " + msg }, { status: 502 });
      }

      // Store credit score
      if (pullResult.vantageScore) {
        await firestore.addDoc(COLLECTIONS.creditScores, {
          userId: user.uid,
          score: pullResult.vantageScore,
          source: "VantageScore",
          bureau: pullResult.bureau,
          recordedAt: now,
          autopilotRunId: runId,
        });
      }

      // Create a creditReport record
      const reportId = await firestore.addDoc(COLLECTIONS.creditReports, {
        userId: user.uid,
        source: "autopilot",
        bureau: pullResult.bureau,
        externalReportId: pullResult.externalReportId,
        provider: pullResult.provider,
        status: "ANALYZED",
        analyzedAt: now,
        autopilotRunId: runId,
        createdAt: now,
      });

      // Save negative tradelines as reportItems
      const negatives = pullResult.tradelines.filter((t) => t.isNegative);
      for (const tradeline of negatives) {
        await firestore.addDoc(COLLECTIONS.reportItems, {
          userId: user.uid,
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
          disputeReason: tradelineToDisputeReason(tradeline),
          bureau: tradeline.bureau,
          latePayments: tradeline.latePayments || [],
          createdAt: now,
        });
      }

      await logAuditEvent({
        userId: user.uid,
        action: "credit_pull_completed",
        resourceId: runId,
        metadata: { externalReportId: pullResult.externalReportId, negativeItems: negatives.length },
      });
    }

    // --- Step 2: Find all undisputed disputable items ---
    const allDisputable = await firestore.query(COLLECTIONS.reportItems, [
      { field: "userId", op: "EQUAL", value: user.uid },
      { field: "isDisputable", op: "EQUAL", value: true },
    ]);

    const undisputed = allDisputable.filter((item) => !item.data.disputeId);
    itemsFound = undisputed.length;

    if (itemsFound === 0) {
      await firestore.updateDoc("autopilotRuns", runId, {
        status: "completed",
        itemsFound: 0,
        lettersGenerated: 0,
        lettersMailed: 0,
        completedAt: new Date().toISOString(),
      });
      await logAuditEvent({ userId: user.uid, action: "autopilot_run_completed", resourceId: runId, metadata: { note: "no disputable items found" } });
      return NextResponse.json({ runId, status: "completed", itemsFound: 0, lettersGenerated: 0, lettersMailed: 0 });
    }

    // --- Step 3: Fetch user profile for letter personalization ---
    const profileDoc = await firestore.getDoc(COLLECTIONS.users, user.uid);
    const profile = profileDoc.exists ? {
      fullName: (profileDoc.data.fullName as string) || user.email?.split("@")[0] || "Consumer",
      dateOfBirth: (profileDoc.data.dateOfBirth as string) || "",
      address: (profileDoc.data.address as string) || "",
      address2: (profileDoc.data.address2 as string) || "",
      city: (profileDoc.data.city as string) || "",
      state: (profileDoc.data.state as string) || "",
      zip: (profileDoc.data.zip as string) || "",
    } : null;

    const hasFullAddress = profile && profile.address && profile.city && profile.state && profile.zip;
    if (!hasFullAddress) {
      errors.push("Profile address is incomplete — letters generated but mailing skipped. Update your profile to enable auto-mailing.");
    }

    // --- Step 4: Resolve payment method once ---
    const paymentMethodId = await resolvePaymentMethod(sub.stripeCustomerId, sub.stripeSubscriptionId);

    // --- Step 5: Generate + mail letters ---
    for (const item of undisputed) {
      const creditorName = (item.data.creditorName as string) || "Unknown Creditor";
      const accountNumber = (item.data.accountNumber as string) || "Unknown";
      const bureau = (item.data.bureau as string) || "";
      const reason = (item.data.disputeReason as string) || "Information is inaccurate or unverifiable";
      const balance = item.data.balance as number | undefined;

      // Generate letter content
      const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      const balanceStr = balance !== undefined ? `$${balance.toLocaleString()}` : "Unknown";
      const senderName = profile?.fullName || user.email?.split("@")[0] || "Consumer";
      const senderAddress = profile && hasFullAddress
        ? `${profile.address}${profile.address2 ? "\n" + profile.address2 : ""}\n${profile.city}, ${profile.state} ${profile.zip}`
        : "[Address Required]";

      let creditorAddress = null;
      try {
        creditorAddress = resolveCreditorAddress(creditorName);
      } catch { /* address not required for letter generation */ }

      const addressBlock = creditorAddress
        ? `${creditorAddress.name}\n${formatAddress(creditorAddress)}`
        : `${creditorName}\n[Insert Address]`;

      const letterContent = `${today}

${addressBlock}

Re: Formal Dispute Under FCRA Section 611 — ${creditorName}, Acct #${accountNumber}, Balance: ${balanceStr}

To Whom It May Concern:

I am formally disputing the above account on my credit report pursuant to the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681i (Section 611).

REASON FOR DISPUTE:
${reason}

INVESTIGATION REQUEST:
Under FCRA § 1681i, I request that you: (1) contact ${creditorName} to verify the accuracy of every element of this account; (2) verify the balance, payment history, dates, and account status; (3) verify the account belongs to me; and (4) review any enclosed documentation.

REQUIRED ACTIONS (FCRA § 1681i):
- Complete your investigation within 30 days
- Forward all relevant information to the furnisher
- Provide written results within 5 business days of completion
- Delete or correct any information that cannot be verified
- Notify me of my right to add a consumer statement

If the furnisher cannot verify this information, it must be promptly deleted. Failure to investigate or continued reporting of inaccurate information may result in complaints to the CFPB and legal action under FCRA § 1681n/§ 1681o.

Sincerely,

${senderName}
${senderAddress}${profile?.dateOfBirth ? "\nDOB: " + profile.dateOfBirth : ""}

`;

      // Save dispute record
      let disputeId: string;
      try {
        disputeId = await firestore.addDoc(COLLECTIONS.disputes, {
          userId: user.uid,
          itemId: item.id,
          creditorName,
          bureau,
          reason,
          status: "DRAFT",
          letterContent,
          creditorAddress: creditorAddress ? {
            name: creditorAddress.name,
            address: creditorAddress.address,
            city: creditorAddress.city,
            state: creditorAddress.state,
            zip: creditorAddress.zip,
            department: creditorAddress.department || null,
            source: creditorAddress.source,
          } : null,
          autopilotRunId: runId,
          createdAt: now,
          updatedAt: now,
        });

        await firestore.updateDoc(COLLECTIONS.reportItems, item.id, {
          isDisputable: false,
          disputeStatus: "DRAFT",
          disputeId,
        });

        lettersGenerated++;

        await logAuditEvent({
          userId: user.uid,
          action: "dispute_auto_generated",
          resourceId: disputeId,
          metadata: { creditorName, bureau, runId },
        });
      } catch (genErr) {
        const msg = `Failed to generate letter for ${creditorName}: ${genErr instanceof Error ? genErr.message : String(genErr)}`;
        errors.push(msg);
        continue;
      }

      // Skip mailing if address is incomplete or no payment method
      if (!hasFullAddress || !creditorAddress?.address || !paymentMethodId) {
        continue;
      }

      // Charge $2 mailing fee
      let mailingPi: { id: string } | null = null;
      try {
        const pi = await stripe.paymentIntents.create({
          amount: 200,
          currency: "usd",
          customer: sub.stripeCustomerId!,
          payment_method: paymentMethodId,
          confirm: true,
          off_session: true,
          description: `Autopilot mailing — ${creditorName}`,
          metadata: { userId: user.uid, disputeId, autopilotRunId: runId },
        }, { idempotencyKey: `autopilot-mail-${runId}-${disputeId}` });

        if (pi.status !== "succeeded") {
          errors.push(`Payment failed for ${creditorName} — letter saved as draft`);
          continue;
        }
        mailingPi = pi;
      } catch (payErr) {
        errors.push(`Payment error for ${creditorName}: ${payErr instanceof Error ? payErr.message : String(payErr)}`);
        continue;
      }

      // Mail via PostGrid — refund charge if it fails
      try {
        const letter = await sendLetter({
          to: {
            name: creditorAddress.name,
            address_line1: creditorAddress.address,
            address_line2: creditorAddress.department || "",
            address_city: creditorAddress.city,
            address_state: creditorAddress.state,
            address_zip: creditorAddress.zip,
          },
          from: {
            name: profile!.fullName,
            address_line1: profile!.address,
            address_line2: profile!.address2 || "",
            address_city: profile!.city,
            address_state: profile!.state,
            address_zip: profile!.zip,
          },
          html: letterToHtml(letterContent),
          description: `Autopilot: ${creditorName} (${bureau})`,
        });

        await firestore.updateDoc(COLLECTIONS.disputes, disputeId, {
          mailJobId: letter.id,
          mailStatus: "SUBMITTED",
          mailedAt: new Date().toISOString(),
          mailExpectedDelivery: letter.expected_delivery_date || null,
          status: "SENT",
          updatedAt: new Date().toISOString(),
        });

        lettersMailed++;

        await logAuditEvent({
          userId: user.uid,
          action: "letter_auto_mailed",
          resourceId: disputeId,
          metadata: { creditorName, bureau, mailJobId: letter.id, runId },
        });
      } catch (mailErr) {
        if (mailingPi) {
          await stripe.refunds.create({ payment_intent: mailingPi.id }).catch(e => console.error("Autopilot refund failed:", e));
        }
        const msg = `Mailing failed for ${creditorName}: ${mailErr instanceof Error ? mailErr.message : String(mailErr)}`;
        errors.push(msg);
        await logAuditEvent({
          userId: user.uid,
          action: "letter_auto_mail_failed",
          resourceId: disputeId,
          metadata: { creditorName, error: msg, runId },
        });
      }
    }

    // --- Finalize run ---
    const finalStatus = errors.length > 0 && lettersMailed === 0 ? "failed" : "completed";
    await firestore.updateDoc("autopilotRuns", runId, {
      status: finalStatus,
      itemsFound,
      lettersGenerated,
      lettersMailed,
      errors,
      completedAt: new Date().toISOString(),
    });

    await logAuditEvent({
      userId: user.uid,
      action: "autopilot_run_completed",
      resourceId: runId,
      metadata: { itemsFound, lettersGenerated, lettersMailed, errors },
    });

    return NextResponse.json({ runId, status: finalStatus, itemsFound, lettersGenerated, lettersMailed, errors } satisfies { runId: string; status: string; itemsFound: number; lettersGenerated: number; lettersMailed: number; errors: string[] });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[autopilot/trigger] Unhandled error:", msg);
    await firestore.updateDoc("autopilotRuns", runId, {
      status: "failed",
      errors: [msg],
      completedAt: new Date().toISOString(),
    });
    await logAuditEvent({ userId: user.uid, action: "autopilot_run_failed", resourceId: runId, metadata: { error: msg } });
    return NextResponse.json({ error: "Autopilot run failed" }, { status: 500 });
  }
}

export type { AutopilotRunRecord };

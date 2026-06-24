import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { sendLetter, letterToHtml, type PostGridAddress } from "@/lib/postgrid";
import { sendDisputeMailedEmail } from "@/lib/email";
import { getUserSubscription } from "@/lib/subscription";
import { stripe, resolvePaymentMethod } from "@/lib/stripe";
import { getLimiters } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success: rlOk } = await getLimiters().mailLetter.limit(user.uid);
  if (!rlOk) {
    return NextResponse.json({ error: "Daily mailing limit reached (10/day). Try again tomorrow." }, { status: 429 });
  }

  const sub = await getUserSubscription(user.uid);

  const body = await request.json();
  const { disputeId, fromAddress, toAddress: manualToAddress } = body;

  if (!disputeId) {
    return NextResponse.json({ error: "disputeId is required" }, { status: 400 });
  }

  if (!fromAddress || !fromAddress.name || !fromAddress.address_line1 || !fromAddress.address_city || !fromAddress.address_state || !fromAddress.address_zip) {
    return NextResponse.json({ error: "fromAddress is required with name, address_line1, address_city, address_state, and address_zip" }, { status: 400 });
  }

  // Fail fast if PostGrid is not configured
  if (!process.env.POSTGRID_API_KEY) {
    return NextResponse.json(
      { error: "Mail service is not configured. Please contact support." },
      { status: 503 }
    );
  }

  try {
    // Fetch the dispute from Firestore
    const dispute = await firestore.getDoc(COLLECTIONS.disputes, disputeId);

    if (!dispute.exists) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    // Verify ownership
    if (dispute.data.userId !== user.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check letter content exists
    const letterContent = dispute.data.letterContent as string | undefined;
    if (!letterContent) {
      return NextResponse.json({ error: "Dispute has no letter content" }, { status: 400 });
    }

    // Check that a creditor address is available (from DB or manual entry)
    const creditorAddress = dispute.data.creditorAddress as Record<string, unknown> | undefined;
    if (!creditorAddress?.address && !manualToAddress) {
      return NextResponse.json(
        { error: "No creditor address available. Please provide the recipient address." },
        { status: 400 }
      );
    }

    // Check if already mailed (allow reattempt if previous job was cancelled)
    if (dispute.data.mailJobId && dispute.data.mailStatus !== "CANCELLED") {
      return NextResponse.json(
        { error: "This dispute letter has already been mailed", mailJobId: dispute.data.mailJobId },
        { status: 409 }
      );
    }

    // Build recipient address (use manual override if provided, otherwise DB)
    const creditorName = (dispute.data.creditorName as string) || "Creditor";
    let toAddress: PostGridAddress;
    if (manualToAddress?.address_line1) {
      toAddress = {
        name: manualToAddress.name || creditorName,
        address_line1: manualToAddress.address_line1,
        address_line2: manualToAddress.address_line2 || "",
        address_city: manualToAddress.address_city,
        address_state: manualToAddress.address_state,
        address_zip: manualToAddress.address_zip,
      };
    } else {
      toAddress = {
        name: (creditorAddress!.name as string) || creditorName,
        address_line1: creditorAddress!.address as string,
        address_line2: (creditorAddress!.department as string) || "",
        address_city: creditorAddress!.city as string,
        address_state: creditorAddress!.state as string,
        address_zip: creditorAddress!.zip as string,
      };
    }

    // Build sender address from request
    const senderAddress: PostGridAddress = {
      name: fromAddress.name,
      address_line1: fromAddress.address_line1,
      address_line2: fromAddress.address_line2 || "",
      address_city: fromAddress.address_city,
      address_state: fromAddress.address_state,
      address_zip: fromAddress.address_zip,
    };

    // Guard against unfilled placeholder addresses
    const addressFields = [toAddress.address_line1, toAddress.address_city, toAddress.address_state, toAddress.address_zip, senderAddress.address_line1];
    if (addressFields.some(f => f?.includes("["))) {
      return NextResponse.json(
        { error: "Letter contains unfilled address placeholders. Please update your profile and creditor address before mailing." },
        { status: 400 }
      );
    }

    // Skip charge if this is a reattempt of a previously cancelled letter
    const isReattempt = dispute.data.mailStatus === "CANCELLED";
    let pi: { id: string } | null = null;

    if (!isReattempt) {
      // Require a Stripe customer and card for paid mailings
      if (!sub.stripeCustomerId) {
        return NextResponse.json({ error: "No card on file. Add a payment method in Profile → Payment Method to mail letters." }, { status: 402 });
      }

      // Resolve the subscriber's saved payment method for the $2 mailing fee
      const paymentMethodId = await resolvePaymentMethod(sub.stripeCustomerId, sub.stripeSubscriptionId);
      if (!paymentMethodId) {
        return NextResponse.json({ error: "No card on file. Add a payment method in Profile → Payment Method to mail letters." }, { status: 402 });
      }

      // Charge $2 mailing fee (off-session, after all validation passes)
      const createdPi = await stripe.paymentIntents.create(
        {
          amount: 200,
          currency: "usd",
          customer: sub.stripeCustomerId,
          payment_method: paymentMethodId,
          confirm: true,
          off_session: true,
          description: `USPS mailing fee — dispute letter (${creditorName})`,
          metadata: { userId: user.uid, disputeId },
        },
        { idempotencyKey: `letter-${user.uid}-${disputeId}` }
      );

      if (createdPi.status !== "succeeded") {
        return NextResponse.json({ error: "Payment of $2.00 mailing fee failed. Please update your payment method." }, { status: 402 });
      }
      pi = createdPi;
    }

    // Replace any placeholder address block in letter content with the actual recipient address
    const addressLine2Part = toAddress.address_line2 ? `\n${toAddress.address_line2}` : "";
    const actualAddressBlock = `${toAddress.name}\n${toAddress.address_line1}${addressLine2Part}\n${toAddress.address_city}, ${toAddress.address_state} ${toAddress.address_zip}`;

    // Replace the two known placeholder patterns produced by generate/route.ts
    let finalLetterContent = letterContent
      .replace(/\[Insert Creditor\/Collection Agency Address\]\n\[City, State ZIP\]/g, `${toAddress.address_line1}${addressLine2Part}\n${toAddress.address_city}, ${toAddress.address_state} ${toAddress.address_zip}`)
      .replace(/\[Insert Bureau Address\]\n\[City, State ZIP\]/g, `${toAddress.address_line1}${addressLine2Part}\n${toAddress.address_city}, ${toAddress.address_state} ${toAddress.address_zip}`);

    // Also ensure the recipient name line is correct if it was a placeholder
    finalLetterContent = finalLetterContent.replace(
      /^(\[Insert Creditor.*?\])/m,
      actualAddressBlock
    );

    // Save crowdsourced address when user manually provided one (non-blocking)
    if (manualToAddress?.address_line1) {
      const normalizedName = creditorName.toLowerCase().trim().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ");
      firestore.setDoc("communityAddresses", normalizedName, {
        name: toAddress.name || creditorName,
        normalizedName,
        address: toAddress.address_line1,
        address2: toAddress.address_line2 || "",
        city: toAddress.address_city,
        state: toAddress.address_state,
        zip: toAddress.address_zip,
        submittedBy: user.uid,
        useCount: 1,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        source: "community",
        confidence: "medium",
      }).catch(e => console.error("Failed to save community address:", e));
    }

    // Convert letter text to HTML
    const html = letterToHtml(finalLetterContent);

    // Send via PostGrid — refund the charge if this fails
    let letter;
    try {
      letter = await sendLetter({
        to: toAddress,
        from: senderAddress,
        html,
        description: `Dispute: ${creditorName} (${dispute.data.bureau || "unknown bureau"})`,
      });
    } catch (pgErr) {
      // Refund the $2 charge since nothing was mailed
      if (!isReattempt && pi) {
        await stripe.refunds.create({ payment_intent: pi.id }).catch(e => console.error("Refund failed:", e));
      }
      throw pgErr;
    }

    // Update Firestore with mail metadata and corrected letter content
    const now = new Date().toISOString();
    await firestore.updateDoc(COLLECTIONS.disputes, disputeId, {
      mailJobId: letter.id,
      mailStatus: "SUBMITTED",
      mailedAt: now,
      mailExpectedDelivery: letter.expected_delivery_date || null,
      status: "SENT",
      letterContent: finalLetterContent,
      updatedAt: now,
    });

    // Send email notification (non-blocking)
    if (user.email) {
      const profileDoc = await firestore.getDoc(COLLECTIONS.users, user.uid).catch(() => null);
      const name = (profileDoc?.data?.fullName as string) || "";
      sendDisputeMailedEmail(user.email, name, creditorName, letter.expected_delivery_date || "").catch((err) => console.error("[email] fire-and-forget error:", err));
    }

    return NextResponse.json({
      success: true,
      mailJobId: letter.id,
      mailStatus: "SUBMITTED",
      expectedDelivery: letter.expected_delivery_date,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Mail dispatch failed:", errorMsg);

    // Record the error in Firestore so the user can see what went wrong
    try {
      await firestore.updateDoc(COLLECTIONS.disputes, disputeId, {
        mailStatus: "ERROR",
        mailError: error instanceof Error ? error.message : String(error),
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // Don't fail the response if error recording fails
    }

    return NextResponse.json(
      { error: "Failed to mail letter", details: errorMsg },
      { status: 500 }
    );
  }
}

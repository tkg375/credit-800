import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { sendLetter, letterToHtml, type PostGridAddress } from "@/lib/postgrid";
import { sendDisputeMailedEmail } from "@/lib/email";
import { getUserSubscription } from "@/lib/subscription";
import { stripe } from "@/lib/stripe";

/** Resolve the best payment method ID for an off-session charge.
 *  Priority: subscription.default_payment_method
 *         → customer.invoice_settings.default_payment_method
 *         → first card on file
 */
async function resolvePaymentMethod(customerId: string, subscriptionId: string | null): Promise<string | null> {
  // 1. Subscription's default payment method (most reliable for subscription customers)
  if (subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["default_payment_method"],
      });
      const pm = sub.default_payment_method as Stripe.PaymentMethod | string | null;
      if (pm) return typeof pm === "string" ? pm : pm.id;
    } catch {
      // fall through
    }
  }

  // 2. Customer invoice_settings default
  try {
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    if (!customer.deleted) {
      const pm = customer.invoice_settings?.default_payment_method;
      if (pm) return typeof pm === "string" ? pm : (pm as Stripe.PaymentMethod).id;
    }
  } catch {
    // fall through
  }

  // 3. First card attached to the customer
  try {
    const pms = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
    if (pms.data.length > 0) return pms.data[0].id;
  } catch {
    // fall through
  }

  return null;
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await getUserSubscription(user.uid);

  if (!sub.stripeCustomerId) {
    return NextResponse.json({ error: "No card on file. Add a payment method in Profile → Payment Method to mail letters." }, { status: 402 });
  }

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

    // Check if already mailed
    if (dispute.data.mailJobId) {
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

    // Resolve the subscriber's saved payment method for the $2 mailing fee
    const paymentMethodId = await resolvePaymentMethod(sub.stripeCustomerId, sub.stripeSubscriptionId);
    if (!paymentMethodId) {
      return NextResponse.json({ error: "No card on file. Add a payment method in Profile → Payment Method to mail letters." }, { status: 402 });
    }

    // Charge $2 mailing fee (off-session, after all validation passes)
    const pi = await stripe.paymentIntents.create({
      amount: 200, // $2.00
      currency: "usd",
      customer: sub.stripeCustomerId,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
      description: `USPS mailing fee — dispute letter (${creditorName})`,
      metadata: { userId: user.uid, disputeId },
    });

    if (pi.status !== "succeeded") {
      return NextResponse.json({ error: "Payment of $2.00 mailing fee failed. Please update your payment method." }, { status: 402 });
    }

    // Convert letter text to HTML
    const html = letterToHtml(letterContent);

    // Send via PostGrid
    const letter = await sendLetter({
      to: toAddress,
      from: senderAddress,
      html,
      description: `Dispute: ${creditorName} (${dispute.data.bureau || "unknown bureau"})`,
    });

    // Update Firestore with mail metadata
    const now = new Date().toISOString();
    await firestore.updateDoc(COLLECTIONS.disputes, disputeId, {
      mailJobId: letter.id,
      mailStatus: "SUBMITTED",
      mailedAt: now,
      mailExpectedDelivery: letter.expected_delivery_date || null,
      status: "SENT",
      updatedAt: now,
    });

    // Send email notification (non-blocking)
    if (user.email) {
      const profileDoc = await firestore.getDoc(COLLECTIONS.users, user.uid).catch(() => null);
      const name = (profileDoc?.data?.fullName as string) || "";
      sendDisputeMailedEmail(user.email, name, creditorName, letter.expected_delivery_date || "").catch(() => {});
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

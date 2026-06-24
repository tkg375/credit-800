import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { firestore } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit-log";

/**
 * POST /api/stripe/subscription/upgrade
 *
 * Upgrades an existing free user to Autopilot.
 * Body: { setupIntentId: string }
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const priceId = process.env.STRIPE_AUTOPILOT_PRICE_ID;
  if (!priceId) return NextResponse.json({ error: "Autopilot plan not configured" }, { status: 500 });

  let setupIntentId: string;
  try {
    const body = await req.json();
    setupIntentId = body.setupIntentId;
    if (!setupIntentId) throw new Error("missing setupIntentId");
  } catch {
    return NextResponse.json({ error: "setupIntentId is required" }, { status: 400 });
  }

  try {
    const userDoc = await firestore.getDoc("users", user.uid);
    const customerId = userDoc?.data?.stripeCustomerId as string | undefined;
    if (!customerId) return NextResponse.json({ error: "No Stripe customer found" }, { status: 400 });

    // Get the payment method from the setup intent
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    let paymentMethodId = setupIntent.payment_method as string | null;

    // If status isn't succeeded yet, try to confirm it server-side
    if (!paymentMethodId) {
      return NextResponse.json({ error: "Payment method not found on setup intent" }, { status: 400 });
    }

    // Attach and set as default
    try {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    } catch { /* already attached */ }

    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      metadata: { userId: user.uid, planTier: "autopilot" },
    });

    // Update user doc
    await firestore.updateDoc("users", user.uid, {
      stripeSubscriptionId: subscription.id,
      planTier: "autopilot",
      subscriptionStatus: "active",
      updatedAt: new Date().toISOString(),
    });

    await logAuditEvent({
      userId: user.uid,
      action: "autopilot_subscription_activated",
      metadata: { subscriptionId: subscription.id },
    });

    return NextResponse.json({ success: true, subscriptionId: subscription.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe/subscription/upgrade]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

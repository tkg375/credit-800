import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { firestore } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit-log";

/**
 * POST /api/stripe/subscription/activate
 *
 * Called after the client confirms a SetupIntent.
 * Creates the Autopilot subscription using the saved payment method.
 *
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
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    const paymentMethodId = setupIntent.payment_method as string;
    if (!paymentMethodId) {
      return NextResponse.json({ error: "No payment method on setup intent" }, { status: 400 });
    }

    const userDoc = await firestore.getDoc("users", user.uid);
    const customerId = userDoc?.data?.stripeCustomerId as string;
    if (!customerId) return NextResponse.json({ error: "No Stripe customer found" }, { status: 400 });

    // Attach payment method as default
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      metadata: { userId: user.uid, planTier: "autopilot" },
    });

    await firestore.updateDoc("users", user.uid, {
      stripeSubscriptionId: subscription.id,
      planTier: "autopilot",
    });

    await logAuditEvent({
      userId: user.uid,
      action: "autopilot_subscription_activated",
      metadata: { subscriptionId: subscription.id },
    });

    return NextResponse.json({ success: true, subscriptionId: subscription.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe/subscription/activate]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

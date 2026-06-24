import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { firestore } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit-log";

/**
 * POST /api/stripe/subscription/upgrade-existing
 * Upgrades a free user to Autopilot using an existing payment method on file.
 * Body: { paymentMethodId: string }
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const priceId = process.env.STRIPE_AUTOPILOT_PRICE_ID;
  if (!priceId) return NextResponse.json({ error: "Autopilot plan not configured" }, { status: 500 });

  let paymentMethodId: string;
  try {
    const body = await req.json();
    paymentMethodId = body.paymentMethodId;
    if (!paymentMethodId) throw new Error("missing paymentMethodId");
  } catch {
    return NextResponse.json({ error: "paymentMethodId is required" }, { status: 400 });
  }

  try {
    const userDoc = await firestore.getDoc("users", user.uid);
    const customerId = userDoc?.data?.stripeCustomerId as string | undefined;
    if (!customerId) return NextResponse.json({ error: "No Stripe customer found" }, { status: 400 });

    // Set as default
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
    console.error("[stripe/subscription/upgrade-existing]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

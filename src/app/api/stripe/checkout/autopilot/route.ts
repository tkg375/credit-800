import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { firestore } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit-log";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();

  let bodySuccessUrl: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.successUrl === "string") bodySuccessUrl = body.successUrl;
  } catch { /* no body / not JSON */ }
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const priceId = process.env.STRIPE_AUTOPILOT_PRICE_ID;
  if (!priceId) {
    console.error("[checkout/autopilot] STRIPE_AUTOPILOT_PRICE_ID is not set");
    return NextResponse.json({ error: "Autopilot plan not yet configured" }, { status: 500 });
  }

  try {
    const userDoc = await firestore.getDoc("users", user.uid);
    let customerId = userDoc?.data?.stripeCustomerId as string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { userId: user.uid },
      });
      customerId = customer.id;
      await firestore.updateDoc("users", user.uid, { stripeCustomerId: customerId });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://credit-800.com";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      customer_update: { name: "auto", address: "auto" },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: bodySuccessUrl || `${appUrl}/autopilot?subscribed=1`,
      cancel_url: `${appUrl}/pricing`,
      metadata: { userId: user.uid, planTier: "autopilot" },
    });

    await logAuditEvent({
      userId: user.uid,
      action: "autopilot_subscription_activated",
      metadata: { sessionId: session.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[checkout/autopilot] Stripe error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

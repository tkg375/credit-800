import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { firestore } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit-log";

export async function POST() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userDoc = await firestore.getDoc("users", user.uid);
    const subscriptionId = userDoc?.data?.stripeSubscriptionId as string | undefined;

    if (!subscriptionId) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 400 });
    }

    // Cancel at period end — user keeps access until billing cycle ends
    await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });

    await firestore.updateDoc("users", user.uid, {
      subscriptionStatus: "canceling",
      updatedAt: new Date().toISOString(),
    });

    await logAuditEvent({
      userId: user.uid,
      action: "autopilot_subscription_canceled",
      metadata: { subscriptionId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe/subscription/cancel]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

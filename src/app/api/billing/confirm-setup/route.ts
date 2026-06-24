import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { paymentMethodId } = await req.json();
  if (!paymentMethodId) return NextResponse.json({ error: "paymentMethodId required" }, { status: 400 });

  const userDoc = await firestore.getDoc(COLLECTIONS.users, user.uid);
  const customerId = (userDoc?.data?.stripeCustomerId as string) || null;
  if (!customerId) return NextResponse.json({ error: "No Stripe customer found" }, { status: 400 });

  // Attach payment method to customer (no-op if already attached)
  try {
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  } catch {
    // Already attached — ignore
  }

  // Set as default payment method on the customer
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  // If Autopilot subscriber, update the subscription default too
  const subscriptionId = userDoc?.data?.stripeSubscriptionId as string | undefined;
  if (subscriptionId) {
    await stripe.subscriptions.update(subscriptionId, {
      default_payment_method: paymentMethodId,
    }).catch((err) => console.error("[email] fire-and-forget error:", err));
  }

  return NextResponse.json({ success: true });
}

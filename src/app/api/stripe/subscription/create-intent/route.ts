import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { firestore } from "@/lib/db";

/**
 * POST /api/stripe/subscription/create-intent
 *
 * Creates a Stripe customer (if needed) + a SetupIntent to securely
 * collect a payment method. After the client confirms the SetupIntent,
 * it calls /api/stripe/subscription/activate to create the subscription.
 */
export async function POST() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: { userId: user.uid },
    });

    return NextResponse.json({ clientSecret: setupIntent.client_secret });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe/subscription/create-intent]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

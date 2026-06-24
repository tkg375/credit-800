import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getLimiters, getRateLimitKey } from "@/lib/ratelimit";

/**
 * POST /api/stripe/subscription/prepare
 *
 * Creates a Stripe customer + SetupIntent WITHOUT creating a user account.
 * Called before registration so we can collect payment before committing.
 *
 * Body: { email: string }
 */
export async function POST(req: NextRequest) {
  const { success } = await getLimiters().autopilotSignup.limit(getRateLimitKey(req));
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  let email: string;
  try {
    const body = await req.json();
    email = body.email?.toLowerCase().trim();
    if (!email) throw new Error("missing email");
  } catch {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const customer = await stripe.customers.create({
      email,
      metadata: { pendingRegistration: "true" },
    });

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: { pendingCustomerId: customer.id },
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: customer.id,
      setupIntentId: setupIntent.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe/subscription/prepare]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { stripe } from "@/lib/stripe";
import { firestore, signToken } from "@/lib/db";
import { getUserForAuth } from "@/lib/dynamodb";
import { sendWelcomeEmail } from "@/lib/email";
import { logAuditEvent } from "@/lib/audit-log";
import { getLimiters, getRateLimitKey } from "@/lib/ratelimit";

/**
 * POST /api/stripe/subscription/complete
 *
 * Called after the SetupIntent is confirmed on the client.
 * Creates the user account + activates the Autopilot subscription atomically.
 * No account is created until this call succeeds.
 *
 * Body: {
 *   email, password,
 *   fullName, dateOfBirth, phone, address, address2, city, state, zip,
 *   setupIntentId, customerId
 * }
 */
export async function POST(req: NextRequest) {
  const { success } = await getLimiters().autopilotSignup.limit(getRateLimitKey(req));
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  let body: {
    email: string; password: string;
    fullName: string; dateOfBirth: string; phone: string;
    address: string; address2: string; city: string; state: string; zip: string;
    setupIntentId: string; customerId: string;
  };

  try {
    body = await req.json();
    if (!body.email || !body.password || !body.setupIntentId || !body.customerId) {
      throw new Error("missing required fields");
    }
  } catch {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const priceId = process.env.STRIPE_AUTOPILOT_PRICE_ID;
  if (!priceId) return NextResponse.json({ error: "Autopilot plan not configured" }, { status: 500 });

  const email = body.email.toLowerCase().trim();

  // Check email not already taken
  const existing = await getUserForAuth(email);
  if (existing) {
    return NextResponse.json({ error: "EMAIL_EXISTS" }, { status: 409 });
  }

  try {
    // Retrieve the confirmed SetupIntent to get the payment method
    const setupIntent = await stripe.setupIntents.retrieve(body.setupIntentId);
    if (setupIntent.status !== "succeeded") {
      return NextResponse.json({ error: "Payment method not confirmed. Please complete the card form." }, { status: 400 });
    }

    const paymentMethodId = setupIntent.payment_method as string;

    // Set as default payment method on the customer
    await stripe.paymentMethods.attach(paymentMethodId, { customer: body.customerId });
    await stripe.customers.update(body.customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: body.customerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      metadata: { planTier: "autopilot" },
    });

    // Now create the user account
    const uid = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(body.password, 12);

    await firestore.setDoc("users", uid, {
      email,
      passwordHash,
      tokenVersion: 0,
      stripeCustomerId: body.customerId,
      stripeSubscriptionId: subscription.id,
      planTier: "autopilot",
      subscriptionStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Update Stripe customer with the real userId
    await stripe.customers.update(body.customerId, {
      metadata: { userId: uid, pendingRegistration: "false" },
    });

    // Save profile
    await firestore.updateDoc("users", uid, {
      fullName: body.fullName,
      dateOfBirth: body.dateOfBirth,
      phone: body.phone,
      address: body.address,
      address2: body.address2,
      city: body.city,
      state: body.state,
      zip: body.zip,
    });

    const token = await signToken({ uid, email, tokenVersion: 0 });

    sendWelcomeEmail(email, body.fullName || "").catch((err) => console.error("[email] fire-and-forget error:", err));

    await logAuditEvent({
      userId: uid,
      action: "autopilot_subscription_activated",
      metadata: { subscriptionId: subscription.id, customerId: body.customerId },
    });

    const response = NextResponse.json({ uid, email, token });
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe/subscription/complete]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

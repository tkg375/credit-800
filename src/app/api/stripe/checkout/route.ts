import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { firestore } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    console.error("[checkout] Auth failed — no user");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let bodySuccessUrl: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.successUrl === "string") bodySuccessUrl = body.successUrl;
  } catch { /* no body / not JSON */ }

  const priceId = process.env["STRIPE_PRO_PRICE_ID"];
  if (!priceId) {
    console.error("[checkout] STRIPE_PRO_PRICE_ID is not set");
    return NextResponse.json({ error: "Price not configured" }, { status: 500 });
  }

  if (!process.env["STRIPE_SECRET_KEY"]) {
    console.error("[checkout] STRIPE_SECRET_KEY is not set");
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  try {
    // Check if user already has a Stripe customer ID
    const userDoc = await firestore.getDoc("users", user.uid);
    let customerId = userDoc?.data?.stripeCustomerId as string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { userId: user.uid },
      });
      customerId = customer.id;
      await firestore.updateDoc("users", user.uid, {
        stripeCustomerId: customerId,
      });
    }

    // Apply 20% referral discount only if:
    // 1. User was referred by a code
    // 2. They haven't used the discount yet
    // 3. The referrer is an active Pro subscriber
    const referredBy = userDoc?.data?.referredBy as string | undefined;
    const referralDiscountUsed = userDoc?.data?.referralDiscountUsed as boolean | undefined;
    const referralCouponId = process.env.STRIPE_REFERRAL_COUPON_ID;

    let applyDiscount = false;
    if (referredBy && !referralDiscountUsed && referralCouponId) {
      // Look up the referrer and verify they are an active Pro subscriber
      const referrals = await firestore.query("referrals", [
        { field: "referralCode", op: "EQUAL", value: referredBy },
      ]);
      if (referrals.length > 0) {
        const referrerId = referrals[0].data.referrerId as string;
        const referrerDoc = await firestore.getDoc("users", referrerId);
        const referrerStatus = referrerDoc?.data?.subscriptionStatus as string | undefined;
        if (referrerStatus === "active" || referrerStatus === "trialing") {
          applyDiscount = true;
        }
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      customer_update: { name: "auto", address: "auto" },
      line_items: [{ price: priceId as string, quantity: 1 }],
      ...(applyDiscount && { discounts: [{ coupon: referralCouponId! }] }),
      success_url: bodySuccessUrl || `${process.env.NEXT_PUBLIC_APP_URL || "https://credit-800.com"}/pricing`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://credit-800.com"}/pricing`,
      metadata: { userId: user.uid },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[checkout] Stripe error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

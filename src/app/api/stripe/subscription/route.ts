import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { firestore } from "@/lib/db";
import Stripe from "stripe";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch user doc first — used both for Stripe IDs and as the authoritative fallback
  const userDoc = await firestore.getDoc("users", user.uid);
  const manualStatus = userDoc?.data?.subscriptionStatus as string | undefined;
  const manualIsPro = manualStatus === "active" || manualStatus === "trialing";
  const manualPlanTier = userDoc?.data?.planTier as string | undefined;
  const customerId = userDoc?.data?.stripeCustomerId as string | undefined;
  const subscriptionId = userDoc?.data?.stripeSubscriptionId as string | undefined;

  // No Stripe IDs — rely solely on manually-set Firestore status
  if (!subscriptionId || !customerId) {
    const plan = manualIsPro ? (manualPlanTier ?? "pro") : "none";
    const amount = plan === "autopilot" ? 4900 : plan === "pro" ? 500 : 0;
    return NextResponse.json({
      plan,
      status: manualStatus ?? "none",
      amount,
      currentPeriodEnd: userDoc?.data?.currentPeriodEnd ?? null,
      subscription: null,
    });
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["default_payment_method", "latest_invoice"],
    }) as unknown as Stripe.Subscription & { current_period_end: number };

    const stripeIsPro = subscription.status === "active" || subscription.status === "trialing";

    // If Stripe says inactive but Firestore says active, trust Firestore
    if (!stripeIsPro && manualIsPro) {
      return NextResponse.json({
        plan: "pro",
        status: manualStatus,
        subscription: null,
      });
    }

    const paymentMethod = subscription.default_payment_method as Stripe.PaymentMethod | null;
    const card = paymentMethod?.card;
    const latestInvoice = subscription.latest_invoice as Stripe.Invoice | null;

    // Detect autopilot vs pro from the price ID
    const activePriceId = subscription.items.data[0]?.price?.id;
    const autopilotPriceId = process.env.STRIPE_AUTOPILOT_PRICE_ID;
    const planTier = stripeIsPro && activePriceId && autopilotPriceId && activePriceId === autopilotPriceId
      ? "autopilot"
      : stripeIsPro ? "pro" : "none";

    return NextResponse.json({
      plan: planTier,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      amount: subscription.items.data[0]?.price?.unit_amount ?? 500,
      currency: subscription.items.data[0]?.price?.currency ?? "usd",
      paymentMethod: card
        ? {
            brand: card.brand,
            last4: card.last4,
            expMonth: card.exp_month,
            expYear: card.exp_year,
          }
        : null,
      lastInvoiceAmount: latestInvoice?.amount_paid ?? null,
      lastInvoiceDate: latestInvoice?.created
        ? new Date(latestInvoice.created * 1000).toISOString()
        : null,
    });
  } catch (err) {
    console.error("Failed to fetch Stripe subscription:", err);
    // Stripe call failed — fall back to Firestore status rather than blocking the user
    return NextResponse.json({
      plan: manualIsPro ? (manualPlanTier ?? "pro") : "none",
      status: manualStatus ?? "error",
      subscription: null,
    });
  }
}

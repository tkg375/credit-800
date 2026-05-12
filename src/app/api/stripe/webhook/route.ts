import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { firestore } from "@/lib/db";
import { sendNewSubscriberNotification, sendProUpgradeEmail, sendAutopilotUpgradeEmail, sendPaymentFailedEmail } from "@/lib/email";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const uid = session.metadata?.userId || session.metadata?.userId;
        if (!uid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)) {
          console.error("checkout.session.completed: invalid or missing userId in metadata", session.id);
          break;
        }
        let planTier: "pro" | "autopilot" = "pro";
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const periodEnd = subscription.items.data[0]?.current_period_end;
          // Determine plan tier from the price ID on the subscription
          const priceId = subscription.items.data[0]?.price?.id;
          const autopilotPriceId = process.env.STRIPE_AUTOPILOT_PRICE_ID;
          planTier = priceId && autopilotPriceId && priceId === autopilotPriceId ? "autopilot" : "pro";
          await firestore.updateDoc("users", uid, {
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            planTier,
            ...(periodEnd && { currentPeriodEnd: new Date(periodEnd * 1000).toISOString() }),
          });

          // Handle referral reward: only credit referrer when referred user actually subscribes
          const userDoc = await firestore.getDoc("users", uid);
          const referredBy = userDoc?.data?.referredBy as string | undefined;
          const referralDiscountUsed = userDoc?.data?.referralDiscountUsed as boolean | undefined;
          if (referredBy && !referralDiscountUsed) {
            // Mark discount as used for this subscriber
            await firestore.updateDoc("users", uid, { referralDiscountUsed: true });

            // Increment referrer's rewards count
            const referrals = await firestore.query("referrals", [
              { field: "referralCode", op: "EQUAL", value: referredBy },
            ]);
            if (referrals.length > 0) {
              const referral = referrals[0];
              await firestore.updateDoc("referrals", referral.id, {
                rewards: (referral.data.rewards as number || 0) + 1,
              });
            }
          }
        }
        const subscriberEmail = session.customer_details?.email || "unknown";
        const amount = session.amount_total ?? 500;
        // Email the customer the correct plan confirmation
        if (session.customer_details?.email) {
          if (planTier === "autopilot") {
            await sendAutopilotUpgradeEmail(session.customer_details.email, amount);
          } else {
            await sendProUpgradeEmail(session.customer_details.email, amount);
          }
        }
        // Notify owner with plan info
        await sendNewSubscriberNotification(subscriberEmail, amount, planTier);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        const uid = customer.metadata?.userId;
        if (uid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uid)) {
          const userDoc = await firestore.getDoc("users", uid);
          if (!userDoc?.exists) { console.error("subscription.updated: user not found", uid); break; }
          const periodEnd = subscription.items.data[0]?.current_period_end;
          const priceId = subscription.items.data[0]?.price?.id;
          const autopilotPriceId = process.env.STRIPE_AUTOPILOT_PRICE_ID;
          const planTier = priceId && autopilotPriceId && priceId === autopilotPriceId ? "autopilot" : "pro";
          await firestore.updateDoc("users", uid, {
            subscriptionStatus: subscription.status,
            planTier,
            ...(periodEnd && { currentPeriodEnd: new Date(periodEnd * 1000).toISOString() }),
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        const uid = customer.metadata?.userId;
        if (uid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uid)) {
          const userDoc = await firestore.getDoc("users", uid);
          if (!userDoc?.exists) { console.error("subscription.deleted: user not found", uid); break; }
          await firestore.updateDoc("users", uid, {
            subscriptionStatus: "canceled",
            stripeSubscriptionId: null,
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customer = await stripe.customers.retrieve(invoice.customer as string) as Stripe.Customer;
        const uid = customer.metadata?.userId;
        if (uid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uid)) {
          const userDoc = await firestore.getDoc("users", uid);
          if (!userDoc?.exists) { console.error("invoice.payment_failed: user not found", uid); break; }
          const planTier = (userDoc.data?.planTier as string) || "pro";
          const planLabel = planTier === "autopilot" ? "Autopilot" : "Self Service";

          await firestore.updateDoc("users", uid, {
            subscriptionStatus: "past_due",
          });

          const userEmail = customer.email || (userDoc.data?.email as string | undefined);
          if (userEmail) {
            await sendPaymentFailedEmail(userEmail, planLabel);
          }
        }
        break;
      }
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
  }

  return NextResponse.json({ received: true });
}

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthUser } from "@/lib/auth";
import { sendLetter, letterToHtml, type PostGridAddress } from "@/lib/postgrid";
import { getUserSubscription } from "@/lib/subscription";
import { stripe } from "@/lib/stripe";

// CFPB mailing address
const CFPB_ADDRESS: PostGridAddress = {
  name: "Consumer Financial Protection Bureau",
  address_line1: "PO Box 27170",
  address_line2: "",
  address_city: "Washington",
  address_state: "DC",
  address_zip: "20038",
};

/** Resolve the best payment method ID for an off-session charge.
 *  Priority: subscription.default_payment_method
 *         → customer.invoice_settings.default_payment_method
 *         → first card on file
 */
async function resolvePaymentMethod(customerId: string, subscriptionId: string | null): Promise<string | null> {
  if (subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["default_payment_method"],
      });
      const pm = sub.default_payment_method as Stripe.PaymentMethod | string | null;
      if (pm) return typeof pm === "string" ? pm : pm.id;
    } catch {
      // fall through
    }
  }

  try {
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    if (!customer.deleted) {
      const pm = customer.invoice_settings?.default_payment_method;
      if (pm) return typeof pm === "string" ? pm : (pm as Stripe.PaymentMethod).id;
    }
  } catch {
    // fall through
  }

  try {
    const pms = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
    if (pms.data.length > 0) return pms.data[0].id;
  } catch {
    // fall through
  }

  return null;
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await getUserSubscription(user.uid);

  if (!sub.stripeCustomerId) {
    return NextResponse.json({ error: "No card on file. Add a payment method in Profile → Payment Method to mail letters." }, { status: 402 });
  }

  if (!process.env.POSTGRID_API_KEY) {
    return NextResponse.json({ error: "Mail service is not configured." }, { status: 503 });
  }

  const { complaintText, fromAddress } = await req.json();

  if (!complaintText) return NextResponse.json({ error: "complaintText is required" }, { status: 400 });
  if (!fromAddress?.name || !fromAddress?.address_line1 || !fromAddress?.address_city || !fromAddress?.address_state || !fromAddress?.address_zip) {
    return NextResponse.json({ error: "fromAddress is required" }, { status: 400 });
  }

  try {
    // Resolve the subscriber's saved payment method for the $2 mailing fee
    const paymentMethodId = await resolvePaymentMethod(sub.stripeCustomerId, sub.stripeSubscriptionId);
    if (!paymentMethodId) {
      return NextResponse.json({ error: "No card on file. Add a payment method in Profile → Payment Method to mail letters." }, { status: 402 });
    }

    // Charge $2 mailing fee off-session
    const pi = await stripe.paymentIntents.create({
      amount: 200, // $2.00
      currency: "usd",
      customer: sub.stripeCustomerId,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
      description: "USPS mailing fee — CFPB complaint letter",
      metadata: { userId: user.uid },
    });

    if (pi.status !== "succeeded") {
      return NextResponse.json({ error: "Payment of $2.00 mailing fee failed. Please update your payment method." }, { status: 402 });
    }

    const html = letterToHtml(complaintText);
    const letter = await sendLetter({
      to: CFPB_ADDRESS,
      from: {
        name: fromAddress.name,
        address_line1: fromAddress.address_line1,
        address_line2: fromAddress.address_line2 || "",
        address_city: fromAddress.address_city,
        address_state: fromAddress.address_state,
        address_zip: fromAddress.address_zip,
      },
      html,
      description: "CFPB Complaint Letter",
    });

    return NextResponse.json({
      success: true,
      mailJobId: letter.id,
      expectedDelivery: letter.expected_delivery_date,
    });
  } catch (error) {
    console.error("CFPB mail error:", error);
    return NextResponse.json({ error: "Failed to mail complaint" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userDoc = await firestore.getDoc(COLLECTIONS.users, user.uid);
  const customerId = (userDoc?.data?.stripeCustomerId as string) || null;

  if (!customerId) return NextResponse.json({ card: null });

  try {
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    if (customer.deleted) return NextResponse.json({ card: null });

    // Get default payment method
    let pmId: string | null = null;
    const def = customer.invoice_settings?.default_payment_method;
    if (def) pmId = typeof def === "string" ? def : (def as Stripe.PaymentMethod).id;

    if (!pmId) {
      const list = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
      if (list.data.length > 0) pmId = list.data[0].id;
    }

    if (!pmId) return NextResponse.json({ card: null });

    const pm = await stripe.paymentMethods.retrieve(pmId);
    const card = pm.card;
    return NextResponse.json({
      card: card ? { brand: card.brand, last4: card.last4, expMonth: card.exp_month, expYear: card.exp_year, pmId } : null,
    });
  } catch {
    return NextResponse.json({ card: null });
  }
}

export async function DELETE() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userDoc = await firestore.getDoc(COLLECTIONS.users, user.uid);
  const customerId = (userDoc?.data?.stripeCustomerId as string) || null;
  if (!customerId) return NextResponse.json({ success: true });

  try {
    const list = await stripe.paymentMethods.list({ customer: customerId, type: "card" });
    await Promise.all(list.data.map((pm) => stripe.paymentMethods.detach(pm.id)));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

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

  // Verify the payment method belongs to this customer before setting it as default
  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (paymentMethod.customer !== customerId) {
    return NextResponse.json({ error: "Payment method not found" }, { status: 400 });
  }

  // Set as default payment method on the customer
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  return NextResponse.json({ success: true });
}

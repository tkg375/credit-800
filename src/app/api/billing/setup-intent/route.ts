import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userDoc = await firestore.getDoc(COLLECTIONS.users, user.uid);
  let customerId: string = (userDoc?.data?.stripeCustomerId as string) || "";

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { userId: user.uid },
    });
    customerId = customer.id;
    await firestore.updateDoc(COLLECTIONS.users, user.uid, { stripeCustomerId: customerId });
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
    usage: "off_session",
  });

  return NextResponse.json({ clientSecret: setupIntent.client_secret, customerId });
}

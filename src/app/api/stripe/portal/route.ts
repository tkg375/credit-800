import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { firestore } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userDoc = await firestore.getDoc("users", user.uid);
    const customerId = userDoc?.data?.stripeCustomerId as string | undefined;

    if (!customerId) {
      return NextResponse.json({ error: "No subscription found" }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://credit-800.com"}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Failed to create portal session:", error);
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
  }
}

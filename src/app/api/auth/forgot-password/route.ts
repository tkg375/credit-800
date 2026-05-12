import { NextRequest, NextResponse } from "next/server";
import { getUserForAuth } from "@/lib/dynamodb";
import { firestore } from "@/lib/firebase-admin";
import { sendPasswordResetEmail } from "@/lib/email";
import { getLimiters, getRateLimitKey } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json() as { email: string };

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const { success } = await getLimiters().forgotPassword.limit(
      getRateLimitKey(request, email)
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const user = await getUserForAuth(email);

    // Always return success to avoid revealing whether an email exists
    if (!user) {
      return NextResponse.json({ success: true });
    }

    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await firestore.updateDoc("users", user.uid, {
      resetToken: token,
      resetTokenExpiry: expiry,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://credit-800.com";
    const resetUrl = `${baseUrl}/reset-password?token=${token}&uid=${user.uid}`;
    await sendPasswordResetEmail(user.email, resetUrl);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[auth/forgot-password]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { firestore } from "@/lib/db";
import { getUserResetToken } from "@/lib/dynamodb";
import { getLimiters, getRateLimitKey } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  try {
    const { uid, token, password } = await request.json() as { uid: string; token: string; password: string };

    const { success } = await getLimiters().forgotPassword.limit(getRateLimitKey(request, uid));
    if (!success) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    if (!uid || !token || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "WEAK_PASSWORD" }, { status: 400 });
    }

    // Use direct DB read to access resetToken (stripped by normal getDoc)
    const userReset = await getUserResetToken(uid);
    if (!userReset) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    const { resetToken: storedToken, resetTokenExpiry, tokenVersion: currentVersion } = userReset;

    const tokensMatch = storedToken && token && storedToken.length === token.length &&
      timingSafeEqual(Buffer.from(storedToken), Buffer.from(token));
    if (!tokensMatch) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    if (!resetTokenExpiry || new Date(resetTokenExpiry) < new Date()) {
      return NextResponse.json({ error: "Reset link has expired" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await firestore.updateDoc("users", uid, {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
      tokenVersion: currentVersion + 1,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[auth/reset-password]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

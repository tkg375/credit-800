import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { firestore } from "@/lib/db";
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

    if (password.length < 6) {
      return NextResponse.json({ error: "WEAK_PASSWORD" }, { status: 400 });
    }

    const doc = await firestore.getDoc("users", uid);
    if (!doc.exists) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    const { resetToken, resetTokenExpiry } = doc.data as { resetToken?: string; resetTokenExpiry?: string };

    if (!resetToken || resetToken !== token) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    if (!resetTokenExpiry || new Date(resetTokenExpiry) < new Date()) {
      return NextResponse.json({ error: "Reset link has expired" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Increment tokenVersion to invalidate all existing JWT sessions
    const currentVersion = (doc.data.tokenVersion as number | undefined) ?? 0;

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

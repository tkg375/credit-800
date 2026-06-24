import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserForAuth } from "@/lib/dynamodb";
import { signToken, firestore } from "@/lib/db";
import { getLimiters, getRateLimitKey } from "@/lib/ratelimit";
import { sendOTPEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json() as { email: string; password: string };

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const { success } = await getLimiters().login.limit(getRateLimitKey(request, email));
    if (!success) {
      return NextResponse.json({ error: "Too many login attempts. Please try again later." }, { status: 429 });
    }

    const user = await getUserForAuth(email);
    if (!user) {
      return NextResponse.json({ error: "INVALID_LOGIN_CREDENTIALS" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "INVALID_LOGIN_CREDENTIALS" }, { status: 401 });
    }

    // Fetch user doc for tokenVersion and plan tier
    const userDoc = await firestore.getDoc("users", user.uid);
    const tokenVersion = (userDoc.data.tokenVersion as number | undefined) ?? 0;
    const planTier = (userDoc.data.planTier as string | undefined) ?? "";
    const name = (userDoc.data.fullName as string) || (userDoc.data.displayName as string) || "";

    // Mandatory 2FA for Autopilot customers
    if (planTier === "autopilot") {
      // Generate OTP
      const bytes = crypto.getRandomValues(new Uint8Array(4));
      const code = ((new DataView(bytes.buffer).getUint32(0) % 900000) + 100000).toString();
      const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
      const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

      await firestore.updateDoc("users", user.uid, {
        twoFactorCode: hashHex,
        twoFactorCodeExpiry: expiry,
        twoFactorCodeSentAt: new Date().toISOString(),
        twoFactorAttempts: 0,
      });

      await sendOTPEmail(user.email, name, code);

      // Issue a short-lived pending token (15 min) — not a full session
      const pendingToken = await signToken({ uid: user.uid, email: user.email, tokenVersion, pending2FA: true });
      const response = NextResponse.json({ requires2FA: true });
      response.cookies.set("auth-token", pendingToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 15, // 15 minutes
        path: "/",
      });
      return response;
    }

    const token = await signToken({ uid: user.uid, email: user.email, tokenVersion });

    const response = NextResponse.json({ uid: user.uid, email: user.email, token });
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("[auth/login] FATAL:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

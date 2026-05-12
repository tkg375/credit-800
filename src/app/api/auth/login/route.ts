import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserForAuth } from "@/lib/dynamodb";
import { signToken } from "@/lib/firebase-admin";
import { getLimiters, getRateLimitKey } from "@/lib/ratelimit";

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

    // Fetch tokenVersion so sessions can be invalidated on password change
    const { firestore } = await import("@/lib/firebase-admin");
    const userDoc = await firestore.getDoc("users", user.uid);
    const tokenVersion = (userDoc.data.tokenVersion as number | undefined) ?? 0;

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
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[auth/login] FATAL:", msg, err);
    return NextResponse.json({ error: "Internal server error", detail: msg }, { status: 500 });
  }
}

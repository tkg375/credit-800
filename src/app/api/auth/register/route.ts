import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserForAuth } from "@/lib/dynamodb";
import { firestore } from "@/lib/firebase-admin";
import { signToken } from "@/lib/firebase-admin";
import { getLimiters, getRateLimitKey } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json() as { email: string; password: string };

    const { success } = await getLimiters().register.limit(getRateLimitKey(request));
    if (!success) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "WEAK_PASSWORD" }, { status: 400 });
    }

    const existing = await getUserForAuth(email);
    if (existing) {
      return NextResponse.json({ error: "EMAIL_EXISTS" }, { status: 409 });
    }

    const uid = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user document in DynamoDB (id = uid)
    await firestore.setDoc("users", uid, {
      email: email.toLowerCase().trim(),
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const token = await signToken({ uid, email: email.toLowerCase().trim() });

    const response = NextResponse.json({ uid, email: email.toLowerCase().trim(), token });
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("[auth/register]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

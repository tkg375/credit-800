import { NextRequest, NextResponse } from "next/server";
import { firestore, signToken } from "@/lib/db";
import { verifyToken } from "@/lib/jwt";
import { getUserFor2FA } from "@/lib/dynamodb";

const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  // Read the pending token from cookie
  const pendingToken = request.cookies.get("auth-token")?.value;
  if (!pendingToken) return NextResponse.json({ error: "No pending session" }, { status: 401 });

  const payload = await verifyToken(pendingToken);
  if (!payload || !payload.pending2FA) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  let code: string;
  try {
    const body = await request.json();
    code = String(body.code || "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Invalid code format" }, { status: 400 });
  }

  const userRecord = await getUserFor2FA(payload.uid);
  if (!userRecord) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const storedHash = userRecord.twoFactorCode;
  const expiry = userRecord.twoFactorCodeExpiry;
  const attempts = userRecord.twoFactorAttempts;

  if (!storedHash || !expiry) {
    return NextResponse.json({ error: "No pending verification code. Please log in again." }, { status: 400 });
  }

  if (new Date(expiry).getTime() < Date.now()) {
    await firestore.updateDoc("users", payload.uid, { twoFactorCode: null, twoFactorCodeExpiry: null, twoFactorAttempts: null });
    return NextResponse.json({ error: "Code expired. Please log in again." }, { status: 400 });
  }

  if (attempts >= MAX_ATTEMPTS) {
    await firestore.updateDoc("users", payload.uid, { twoFactorCode: null, twoFactorCodeExpiry: null, twoFactorAttempts: null });
    return NextResponse.json({ error: "Too many failed attempts. Please log in again." }, { status: 429 });
  }

  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

  if (hashHex !== storedHash) {
    await firestore.updateDoc("users", payload.uid, { twoFactorAttempts: attempts + 1 });
    const remaining = MAX_ATTEMPTS - attempts - 1;
    return NextResponse.json({ error: `Incorrect code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.` }, { status: 400 });
  }

  // Clear OTP and issue full session
  await firestore.updateDoc("users", payload.uid, {
    twoFactorCode: null,
    twoFactorCodeExpiry: null,
    twoFactorAttempts: null,
  });

  const fullToken = await signToken({ uid: payload.uid, email: payload.email, tokenVersion: payload.tokenVersion });

  const response = NextResponse.json({ uid: payload.uid, email: payload.email });
  response.cookies.set("auth-token", fullToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return response;
}

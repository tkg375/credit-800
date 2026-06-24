import { NextRequest, NextResponse } from "next/server";
import { firestore } from "@/lib/db";
import { verifyToken } from "@/lib/jwt";
import { sendOTPEmail } from "@/lib/email";
import { getUserFor2FA } from "@/lib/dynamodb";

export async function POST(request: NextRequest) {
  const pendingToken = request.cookies.get("auth-token")?.value;
  if (!pendingToken) return NextResponse.json({ error: "No pending session" }, { status: 401 });

  const payload = await verifyToken(pendingToken);
  if (!payload || !payload.pending2FA) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  // Use raw read to bypass stripSensitive
  const userRecord = await getUserFor2FA(payload.uid);
  if (!userRecord) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const lastSentAt = userRecord.twoFactorCodeSentAt;
  const name = userRecord.fullName;

  // Throttle: 60 seconds between resends
  if (lastSentAt) {
    const secsSince = (Date.now() - new Date(lastSentAt).getTime()) / 1000;
    if (secsSince < 60) {
      return NextResponse.json({ error: "Please wait before requesting a new code.", throttled: true, retryAfter: Math.ceil(60 - secsSince) }, { status: 429 });
    }
  }

  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const code = ((new DataView(bytes.buffer).getUint32(0) % 900000) + 100000).toString();
  const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

  await firestore.updateDoc("users", payload.uid, {
    twoFactorCode: hashHex,
    twoFactorCodeExpiry: expiry,
    twoFactorCodeSentAt: new Date().toISOString(),
    twoFactorAttempts: 0,
  });

  try {
    await sendOTPEmail(payload.email, name, code);
  } catch (err) {
    console.error("[2fa/resend] email send failed:", err);
    return NextResponse.json({ error: "Failed to send email. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ sent: true });
}

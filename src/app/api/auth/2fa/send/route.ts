import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { sendOTPEmail } from "@/lib/email";

function generateOTP(): string {
  // CSPRNG-based 6-digit OTP — Math.random() is not cryptographically safe
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const value = (new DataView(bytes.buffer).getUint32(0) % 900000) + 100000;
  return value.toString();
}

export async function POST() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userDoc = await firestore.getDoc(COLLECTIONS.users, user.uid);
    const name = (userDoc.data.fullName as string) || (userDoc.data.displayName as string) || "";

    // Throttle: don't resend within 60 seconds
    const lastSentAt = userDoc.data.twoFactorCodeSentAt as string | null;
    if (lastSentAt) {
      const secsSince = (Date.now() - new Date(lastSentAt).getTime()) / 1000;
      if (secsSince < 60) {
        return NextResponse.json({ error: "Please wait before requesting a new code.", throttled: true }, { status: 429 });
      }
    }

    const code = generateOTP();
    const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    // Store a simple hash (SHA-256) of the code so we're not storing plaintext
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    await firestore.updateDoc(COLLECTIONS.users, user.uid, {
      twoFactorCode: hashHex,
      twoFactorCodeExpiry: expiry,
      twoFactorCodeSentAt: now,
    });

    await sendOTPEmail(user.email, name, code);

    return NextResponse.json({ sent: true, expiresAt: expiry });
  } catch (err) {
    console.error("2fa/send error:", err);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { firestore, COLLECTIONS } from "@/lib/db";
import { sendAutopilotNotifyEmail } from "@/lib/email";
import { getLimiters, getRateLimitKey } from "@/lib/ratelimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const { success: rateLimitOk } = await getLimiters().contact.limit(getRateLimitKey(req));
  if (!rateLimitOk) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();

    // Check for duplicate
    const existing = await firestore.query(COLLECTIONS.autopilotWaitlist, [
      { field: "email", op: "EQUAL", value: normalized },
    ]);

    if (existing.length > 0) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    await firestore.addDoc(COLLECTIONS.autopilotWaitlist, {
      email: normalized,
      signedUpAt: new Date().toISOString(),
    });

    await sendAutopilotNotifyEmail(normalized);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[autopilot/notify]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

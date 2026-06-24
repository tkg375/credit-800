import { NextRequest, NextResponse } from "next/server";
import { AwsClient } from "aws4fetch";
import { getLimiters, getRateLimitKey } from "@/lib/ratelimit";

const SUPPORT_EMAIL = "tgordo03@gmail.com";
const FROM_EMAIL = "Credit 800 <noreply@credit-800.com>";

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // fail open if not configured
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token }),
  });
  const data = await res.json() as { success: boolean };
  return data.success === true;
}

export async function POST(req: NextRequest) {
  const { success: rateLimitOk } = await getLimiters().contact.limit(getRateLimitKey(req));
  if (!rateLimitOk) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const { name, email, subject, message, turnstileToken } = await req.json();

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
  }

  if (name.length > 200 || email.length > 254 || message.length > 5000 || (subject && subject.length > 300)) {
    return NextResponse.json({ error: "Input exceeds maximum length." }, { status: 400 });
  }

  const turnstileValid = await verifyTurnstile(turnstileToken || "");
  if (!turnstileValid) {
    return NextResponse.json({ error: "Security check failed. Please try again." }, { status: 400 });
  }

  const safeSubject = subject?.trim() || "General Inquiry";
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#0d9488;margin-bottom:4px">New Support Request</h2>
      <p style="color:#64748b;font-size:13px;margin-bottom:24px">Via credit-800.com contact form</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:13px;width:80px">From</td>
          <td style="padding:8px 0;font-weight:600">${esc(name.trim())}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:13px">Email</td>
          <td style="padding:8px 0"><a href="mailto:${esc(email.trim())}" style="color:#0d9488">${esc(email.trim())}</a></td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:13px">Subject</td>
          <td style="padding:8px 0">${esc(safeSubject)}</td>
        </tr>
      </table>
      <div style="background:#f8fafc;border-radius:12px;padding:20px;color:#1e293b;line-height:1.6;white-space:pre-wrap">${esc(message.trim())}</div>
    </div>
  `;

  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const region = process.env.S3_REGION || "us-east-1";

  if (!accessKeyId || !secretAccessKey) {
    console.warn("[support/contact] AWS credentials not set");
    return NextResponse.json({ ok: true });
  }

  const aws = new AwsClient({ accessKeyId, secretAccessKey, region, service: "ses" });
  const body = JSON.stringify({
    FromEmailAddress: FROM_EMAIL,
    ReplyToAddresses: [email.trim()],
    Destination: { ToAddresses: [SUPPORT_EMAIL] },
    Content: {
      Simple: {
        Subject: { Data: `[Support] ${safeSubject} — ${name.trim()}`, Charset: "UTF-8" },
        Body: { Html: { Data: html, Charset: "UTF-8" } },
      },
    },
  });

  try {
    const res = await aws.fetch(
      `https://email.${region}.amazonaws.com/v2/email/outbound-emails`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body }
    );
    if (!res.ok) {
      const text = await res.text();
      console.error("[support/contact] SES error:", res.status, text);
      return NextResponse.json({ error: "Failed to send message. Please email us directly." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[support/contact] fetch error:", err);
    return NextResponse.json({ error: "Failed to send message. Please email us directly." }, { status: 500 });
  }
}

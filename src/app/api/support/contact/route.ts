import { NextRequest, NextResponse } from "next/server";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { getLimiters, getRateLimitKey } from "@/lib/ratelimit";

const SUPPORT_EMAIL = "tgordo03@gmail.com";
const FROM_EMAIL = "Credit 800 <noreply@credit-800.com>";

function getSesClient() {
  const region = process.env.S3_REGION || "us-east-1";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return null;
  return new SESv2Client({ region, credentials: { accessKeyId, secretAccessKey } });
}

export async function POST(req: NextRequest) {
  const { success: rateLimitOk } = await getLimiters().contact.limit(getRateLimitKey(req));
  if (!rateLimitOk) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const { name, email, subject, message } = await req.json();

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
  }

  if (name.length > 200 || email.length > 254 || message.length > 5000 || (subject && subject.length > 300)) {
    return NextResponse.json({ error: "Input exceeds maximum length." }, { status: 400 });
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

  const client = getSesClient();
  if (!client) {
    console.warn("[support/contact] AWS SES not configured — would have sent:", { name, email, safeSubject });
    return NextResponse.json({ ok: true });
  }

  try {
    await client.send(
      new SendEmailCommand({
        FromEmailAddress: FROM_EMAIL,
        ReplyToAddresses: [email.trim()],
        Destination: { ToAddresses: [SUPPORT_EMAIL] },
        Content: {
          Simple: {
            Subject: { Data: `[Support] ${safeSubject} — ${name.trim()}`, Charset: "UTF-8" },
            Body: { Html: { Data: html, Charset: "UTF-8" } },
          },
        },
      })
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[support/contact] SES error:", err);
    return NextResponse.json({ error: "Failed to send message. Please email us directly." }, { status: 500 });
  }
}

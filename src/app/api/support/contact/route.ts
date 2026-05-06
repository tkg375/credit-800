import { NextRequest, NextResponse } from "next/server";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const SUPPORT_EMAIL = "support@credit-800.com";
const FROM_EMAIL = "Credit 800 <noreply@credit-800.com>";

function getSesClient() {
  const region = process.env.S3_REGION || "us-east-1";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return null;
  return new SESv2Client({ region, credentials: { accessKeyId, secretAccessKey } });
}

async function verifyRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret || !token) return true; // skip if not configured
  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${secret}&response=${token}`,
  });
  const data = await res.json();
  return data.success && (data.score ?? 1) >= 0.5;
}

export async function POST(req: NextRequest) {
  const { name, email, subject, message, recaptchaToken } = await req.json();

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
  }

  const captchaOk = await verifyRecaptcha(recaptchaToken ?? "");
  if (!captchaOk) {
    return NextResponse.json({ error: "reCAPTCHA verification failed. Please try again." }, { status: 400 });
  }

  const safeSubject = subject?.trim() || "General Inquiry";

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#0d9488;margin-bottom:4px">New Support Request</h2>
      <p style="color:#64748b;font-size:13px;margin-bottom:24px">Via credit-800.com contact form</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:13px;width:80px">From</td>
          <td style="padding:8px 0;font-weight:600">${name.trim()}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:13px">Email</td>
          <td style="padding:8px 0"><a href="mailto:${email.trim()}" style="color:#0d9488">${email.trim()}</a></td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:13px">Subject</td>
          <td style="padding:8px 0">${safeSubject}</td>
        </tr>
      </table>
      <div style="background:#f8fafc;border-radius:12px;padding:20px;color:#1e293b;line-height:1.6;white-space:pre-wrap">${message.trim()}</div>
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

import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const FROM_EMAIL = "Credit 800 <noreply@credit-800.com>";
const REPLY_TO = "support@credit-800.com";

function getSesClient() {
  const region = process.env.S3_REGION || "us-east-1";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  return new SESv2Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const client = getSesClient();
  if (!client) {
    console.warn("[email] AWS credentials not set — skipping email:", subject);
    return;
  }

  try {
    await client.send(
      new SendEmailCommand({
        FromEmailAddress: FROM_EMAIL,
        ReplyToAddresses: [REPLY_TO],
        Destination: { ToAddresses: [to] },
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: "UTF-8" },
            Body: { Html: { Data: html, Charset: "UTF-8" } },
          },
        },
      })
    );
  } catch (err) {
    console.error("[email] SES error:", err);
  }
}

export async function sendOTPEmail(to: string, name: string, code: string) {
  await sendEmail(
    to,
    `Your Credit 800 verification code: ${code}`,
    `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b">
      <div style="background:linear-gradient(135deg,#84cc16,#14b8a6);padding:24px;border-radius:12px;margin-bottom:24px">
        <h1 style="color:white;margin:0;font-size:24px">Two-Factor Verification</h1>
        <p style="color:rgba(255,255,255,0.9);margin:8px 0 0">Your Credit 800 sign-in code</p>
      </div>
      <p>Hi ${name || "there"},</p>
      <p>Use the code below to complete your sign-in. This code expires in <strong>10 minutes</strong>.</p>
      <div style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;padding:24px;margin:24px 0;text-align:center">
        <p style="margin:0;font-size:40px;font-weight:bold;letter-spacing:12px;font-family:monospace;color:#0f172a">${code}</p>
      </div>
      <p style="color:#64748b;font-size:14px">If you didn't request this code, you can safely ignore this email. Someone may have typed your email by mistake.</p>
      <p style="color:#94a3b8;font-size:12px;margin-top:32px">Credit 800 · This code is valid for 10 minutes only.</p>
    </body></html>`
  );
}

// All other email notifications are disabled — stubs kept for call-site compatibility

export async function sendAutopilotNotifyEmail(_to: string) { return; }
export async function sendAnalysisCompleteEmail(_to: string, _name: string, _itemCount: number, _bureau: string) { return; }
export async function sendDisputeMailedEmail(_to: string, _name: string, _creditorName: string, _expectedDelivery: string) { return; }
export async function sendProUpgradeEmail(_to: string, _amount: number) { return; }
export async function sendAutopilotUpgradeEmail(_to: string, _amount: number) { return; }
export async function sendNewSubscriberNotification(_subscriberEmail: string, _amount: number, _planTier?: string) { return; }
export async function sendWelcomeEmail(_to: string, _name: string) { return; }
export async function sendCreditChangesEmail(_to: string, _name: string, _changes: unknown) { return; }
export async function sendEscalationReadyEmail(_to: string, _name: string, _creditorName: string, _bureau: string, _round: number) { return; }
export async function sendHealthReportEmail(_to: string, _name: string, _stats: unknown) { return; }
export async function sendWeeklyProgressEmail(_to: string, _name: string, _stats: unknown) { return; }
export async function sendPaymentFailedEmail(_to: string, _planLabel: string) { return; }
export async function sendPasswordResetEmail(_to: string, _resetUrl: string) { return; }
export async function sendIssueReport(_params: unknown): Promise<void> { return; }

import { getCloudflareContext } from "@opennextjs/cloudflare";

const FROM = "noreply@credit-800.com";
const FROM_NAME = "Credit 800";
const ADMIN_EMAIL = "tgordon1@icloud.com";

async function send(to: string, subject: string, html: string, text: string) {
  const ctx = await getCloudflareContext({ async: true });
  const email = (ctx.env as unknown as Record<string, { send: (msg: unknown) => Promise<{ messageId: string }> }>).EMAIL;
  if (!email) {
    throw new Error("EMAIL binding not available");
  }
  const result = await email.send({ to, from: FROM, subject, html, text });
  console.log("[email] sent to:", to, "messageId:", result.messageId);
}

// ─── Shared styles ────────────────────────────────────────────────────────────

function layout(body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Credit 800</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr><td style="background:#000000;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
          <img src="https://credit-800-dev.tgordo03.workers.dev/Logo%20for%20dark%20background.png" alt="Credit 800" width="220" style="display:block;margin:0 auto;height:auto;" />
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#fff;padding:36px 32px;border-radius:0 0 12px 12px;">
          ${body}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">© 2025 Credit 800 · <a href="https://credit-800.com/privacy" style="color:#1a3fd4;text-decoration:none;">Privacy</a> · <a href="https://credit-800.com/terms" style="color:#1a3fd4;text-decoration:none;">Terms</a></p>
          <p style="margin:6px 0 0;font-size:11px;color:#cbd5e1;">credit-800.com</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(label: string, href: string) {
  return `<a href="${href}" style="display:inline-block;padding:14px 32px;background:linear-gradient(90deg,#1a3fd4,#00d4aa);color:#fff;font-weight:700;font-size:15px;border-radius:8px;text-decoration:none;margin:8px 0;">${label}</a>`;
}

function h1(text: string) {
  return `<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;">${text}</h1>`;
}

function p(text: string) {
  return `<p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">${text}</p>`;
}

function divider() {
  return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />`;
}

function otp(code: string) {
  return `<div style="background:#f8fafc;border:2px dashed #1a3fd4;border-radius:10px;padding:20px;text-align:center;margin:20px 0;">
    <span style="font-size:36px;font-weight:900;letter-spacing:10px;color:#1a3fd4;">${code}</span>
    <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">Expires in 10 minutes</p>
  </div>`;
}

// ─── Email functions ───────────────────────────────────────────────────────────

export async function sendOTPEmail(to: string, name: string, code: string) {
  const html = layout(`
    ${h1("Your verification code")}
    ${p(`Hi ${name || "there"}, use the code below to verify your identity.`)}
    ${otp(code)}
    ${p("If you didn't request this, you can safely ignore this email.")}
  `);
  const text = `Your Credit 800 verification code: ${code}\n\nExpires in 10 minutes.`;
  await send(to, "Your Credit 800 verification code", html, text);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const html = layout(`
    ${h1("Reset your password")}
    ${p("We received a request to reset your Credit 800 password. Click the button below to choose a new one.")}
    <div style="text-align:center;margin:28px 0;">${btn("Reset Password", resetUrl)}</div>
    ${divider()}
    ${p("This link expires in 1 hour. If you didn't request a password reset, you can ignore this email — your account is safe.")}
  `);
  const text = `Reset your Credit 800 password:\n\n${resetUrl}\n\nThis link expires in 1 hour.`;
  await send(to, "Reset your Credit 800 password", html, text);
}

export async function sendWelcomeEmail(to: string, name: string) {
  const html = layout(`
    ${h1(`Welcome to Credit 800, ${name || "there"}!`)}
    ${p("Your account is ready. Here's how to get started:")}
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
      <tr>
        <td style="padding:12px 16px;background:#f8fafc;border-radius:8px;margin-bottom:8px;border-left:3px solid #1a3fd4;">
          <p style="margin:0;font-weight:700;color:#0f172a;font-size:14px;">Step 1 — Upload your credit report</p>
          <p style="margin:4px 0 0;font-size:13px;color:#64748b;">Get a free report from AnnualCreditReport.com, then upload the PDF. Our AI will scan every line.</p>
        </td>
      </tr>
      <tr><td style="height:8px;"></td></tr>
      <tr>
        <td style="padding:12px 16px;background:#f8fafc;border-radius:8px;border-left:3px solid #1a3fd4;">
          <p style="margin:0;font-weight:700;color:#0f172a;font-size:14px;">Step 2 — Review your dispute strategies</p>
          <p style="margin:4px 0 0;font-size:13px;color:#64748b;">AI identifies every disputable item and ranks removal strategies from HIGH to LOW priority — 7-year rule, FDCPA validation, pay-for-delete, and more.</p>
        </td>
      </tr>
      <tr><td style="height:8px;"></td></tr>
      <tr>
        <td style="padding:12px 16px;background:#f8fafc;border-radius:8px;border-left:3px solid #1a3fd4;">
          <p style="margin:0;font-weight:700;color:#0f172a;font-size:14px;">Step 3 — Generate and send dispute letters</p>
          <p style="margin:4px 0 0;font-size:13px;color:#64748b;">GPT-4o writes a custom, legally-cited letter for each item. Mail it yourself or use our USPS mailing for $2/letter.</p>
        </td>
      </tr>
    </table>
    ${p("<strong>What's included — all free:</strong> AI dispute letters, bureau response analyzer, debt collector letter analyzer, budget tracker, credit score simulator, debt payoff optimizer, goals tracker, CFPB complaint generator, document vault, and more.")}
    <div style="text-align:center;margin:28px 0;">${btn("Go to Dashboard →", "https://credit-800.com/dashboard")}</div>
    ${divider()}
    ${p("Questions? Visit our <a href='https://credit-800.com/faq' style='color:#1a3fd4;text-decoration:none;'>FAQ</a> or <a href='https://credit-800.com/support' style='color:#1a3fd4;text-decoration:none;'>contact support</a>.")}
  `);
  const text = `Welcome to Credit 800, ${name || "there"}!\n\nStep 1: Upload your credit report from AnnualCreditReport.com\nStep 2: Review AI-identified disputable items\nStep 3: Generate and send dispute letters\n\nGo to your dashboard: https://credit-800.com/dashboard`;
  await send(to, "Welcome to Credit 800 — here's how to get started", html, text);
}

export async function sendMonthlyCheckupEmail(to: string, name: string, stats: {
  latestScore: number | null;
  scoreChange: number | null;
  openDisputes: number;
  resolvedDisputes: number;
  disputableItems: number;
  upcomingDeadlines: Array<{ creditorName: string; daysLeft: number }>;
}) {
  const { latestScore, scoreChange, openDisputes, resolvedDisputes, disputableItems, upcomingDeadlines } = stats;

  const scoreRow = scoreChange !== null && scoreChange !== 0
    ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#64748b;">Score change</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:${scoreChange > 0 ? "#16a34a" : "#dc2626"};">${scoreChange > 0 ? "+" : ""}${scoreChange} points</td></tr>`
    : "";

  const deadlineRows = upcomingDeadlines.length > 0
    ? upcomingDeadlines.map(d => `<li style="font-size:13px;color:#475569;line-height:1.8;"><strong>${d.creditorName}</strong> — bureau response due in <strong>${d.daysLeft} day${d.daysLeft !== 1 ? "s" : ""}</strong></li>`).join("")
    : "";

  const html = layout(`
    ${h1(`Monthly checkup, ${name || "there"}`)}
    ${p("Here's a snapshot of your credit repair progress this month.")}
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
      ${scoreRow}
      <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#64748b;">Open disputes</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#0f172a;">${openDisputes}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#64748b;">Resolved disputes</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#16a34a;">${resolvedDisputes}</td></tr>
      <tr><td style="padding:10px 0;font-size:14px;color:#64748b;">Items still disputable</td><td style="padding:10px 0;text-align:right;font-weight:700;color:#d97706;">${disputableItems}</td></tr>
    </table>
    ${deadlineRows ? `<p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#0f172a;">Upcoming bureau deadlines</p><ul style="margin:0 0 20px;padding-left:18px;">${deadlineRows}</ul>` : ""}
    <div style="text-align:center;margin:28px 0;">${btn("View Dashboard →", "https://credit-800.com/dashboard")}</div>
    ${divider()}
    ${p("Have items you haven't disputed yet? <a href='https://credit-800.com/disputes' style='color:#1a3fd4;text-decoration:none;'>Generate letters now →</a>")}
  `);
  const scoreText = scoreChange !== null && scoreChange !== 0
    ? `Score change: ${scoreChange > 0 ? "+" : ""}${scoreChange} points\n`
    : "";
  const text = `Monthly checkup for ${name || "there"}.\n\n${scoreText}Open disputes: ${openDisputes}\nResolved: ${resolvedDisputes}\n\nView dashboard: https://credit-800.com/dashboard`;
  await send(to, "Your monthly Credit 800 checkup", html, text);
}

export async function sendAnalysisCompleteEmail(to: string, name: string, itemCount: number, bureau: string) {
  const html = layout(`
    ${h1("Analysis complete")}
    ${p(`Hi ${name || "there"}, we found <strong>${itemCount} disputable item${itemCount !== 1 ? "s" : ""}</strong> on your ${bureau} report.`)}
    <div style="text-align:center;margin:28px 0;">${btn("View Disputes →", "https://credit-800.com/disputes")}</div>
  `);
  await send(to, `Analysis complete — ${itemCount} items found on your ${bureau} report`, html, `We found ${itemCount} disputable items on your ${bureau} report. View: https://credit-800.com/disputes`);
}

export async function sendLetterReadyEmail(to: string, name: string, creditorName: string | null) {
  const html = layout(`
    ${h1("Your dispute letter is ready")}
    ${p(`Hi ${name || "there"}, your FCRA-compliant dispute letter${creditorName ? ` for <strong>${creditorName}</strong>` : ""} is ready to review and mail.`)}
    <div style="text-align:center;margin:28px 0;">${btn("View Letter →", "https://credit-800.com/disputes")}</div>
  `);
  await send(to, "Your dispute letter is ready", html, `Your dispute letter is ready. View: https://credit-800.com/disputes`);
}

export async function sendDisputeMailedEmail(to: string, name: string, creditorName: string, expectedDelivery: string) {
  const html = layout(`
    ${h1("Your letter has been mailed ✉️")}
    ${p(`Hi ${name || "there"}, your dispute letter for <strong>${creditorName}</strong> has been sent via USPS.`)}
    ${p(`Expected delivery: <strong>${expectedDelivery}</strong>`)}
    ${p("The bureau has 30 days to investigate and respond under the FCRA.")}
    <div style="text-align:center;margin:28px 0;">${btn("Track Disputes →", "https://credit-800.com/disputes")}</div>
  `);
  await send(to, `Letter mailed to ${creditorName} ✉️`, html, `Your dispute letter for ${creditorName} has been mailed. Expected delivery: ${expectedDelivery}`);
}

export async function sendEscalationReadyEmail(to: string, name: string, creditorName: string, bureau: string, round: number) {
  const html = layout(`
    ${h1("Escalation letter ready")}
    ${p(`Hi ${name || "there"}, it's time for round ${round} of your dispute against <strong>${creditorName}</strong> with <strong>${bureau}</strong>.`)}
    ${p("We've generated an escalation letter citing FCRA § 611 Method of Verification requirements.")}
    <div style="text-align:center;margin:28px 0;">${btn("View Escalation →", "https://credit-800.com/disputes")}</div>
  `);
  await send(to, `Escalation letter ready — ${creditorName} (Round ${round})`, html, `Escalation letter ready for ${creditorName} with ${bureau}. View: https://credit-800.com/disputes`);
}

export async function sendNewSubscriberNotification(subscriberEmail: string, amount: number, planTier?: string) {
  const html = layout(`
    ${h1("New subscriber")}
    ${p(`<strong>${subscriberEmail}</strong> just subscribed to <strong>${planTier || "Pro"}</strong> at $${(amount / 100).toFixed(2)}/month.`)}
  `);
  await send(ADMIN_EMAIL, `New subscriber: ${subscriberEmail}`, html, `New subscriber: ${subscriberEmail} — ${planTier} — $${(amount / 100).toFixed(2)}/mo`);
}

export async function sendCreditChangesEmail(to: string, name: string, changes: unknown) {
  const html = layout(`
    ${h1("Credit report changes detected")}
    ${p(`Hi ${name || "there"}, we detected changes on your credit report. Log in to review what changed.`)}
    <div style="text-align:center;margin:28px 0;">${btn("View Changes →", "https://credit-800.com/scores")}</div>
  `);
  await send(to, "Credit report changes detected", html, "Changes detected on your credit report. View: https://credit-800.com/scores");
}

export async function sendPaymentFailedEmail(to: string, planLabel: string) {
  const html = layout(`
    ${h1("Payment failed")}
    ${p(`We couldn't process your payment for <strong>${planLabel}</strong>. Please update your payment method to keep your account active.`)}
    <div style="text-align:center;margin:28px 0;">${btn("Update Payment →", "https://credit-800.com/profile")}</div>
  `);
  await send(to, "Action required: payment failed", html, `Payment failed for ${planLabel}. Update your payment method: https://credit-800.com/profile`);
}

export async function sendIssueReport(params: { userId: string; userEmail: string; fullName?: string; plan?: string; subscriptionStatus?: string; issue: string; page?: string }) {
  const html = layout(`
    ${h1("Issue report")}
    <table style="width:100%;font-size:14px;color:#475569;border-collapse:collapse;">
      <tr><td style="padding:6px 0;font-weight:600;width:140px;">User</td><td>${params.fullName || "—"} (${params.userEmail})</td></tr>
      <tr><td style="padding:6px 0;font-weight:600;">User ID</td><td>${params.userId}</td></tr>
      <tr><td style="padding:6px 0;font-weight:600;">Plan</td><td>${params.plan || "—"} · ${params.subscriptionStatus || "—"}</td></tr>
      <tr><td style="padding:6px 0;font-weight:600;">Page</td><td>${params.page || "—"}</td></tr>
      <tr><td style="padding:6px 0;font-weight:600;vertical-align:top;">Issue</td><td>${params.issue}</td></tr>
    </table>
  `);
  await send(ADMIN_EMAIL, `Issue report from ${params.userEmail}`, html, `Issue from ${params.userEmail}: ${params.issue}`);
}

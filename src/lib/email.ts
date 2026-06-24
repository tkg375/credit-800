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
    ${p(`Hi ${name || "there"}, use the code below to verify your identity. This is required for your Autopilot account.`)}
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
    ${h1(`Welcome to Credit 800, ${name || "there"}! 🎉`)}
    ${p("You're all set. Credit 800 gives you everything you need to dispute inaccuracies, track your score, and build a clear path to 800.")}
    <ul style="margin:0 0 20px;padding-left:20px;color:#475569;font-size:15px;line-height:2;">
      <li>Upload your credit report to find disputable items</li>
      <li>Generate FCRA-compliant dispute letters instantly</li>
      <li>Track your score progress over time</li>
      <li>Manage your budget, goals, and loan readiness</li>
    </ul>
    <div style="text-align:center;margin:28px 0;">${btn("Go to Dashboard →", "https://credit-800.com/dashboard")}</div>
    ${divider()}
    ${p("Questions? Reply to this email or visit our <a href='https://credit-800.com/faq' style='color:#1a3fd4;text-decoration:none;'>FAQ</a>.")}
  `);
  const text = `Welcome to Credit 800, ${name || "there"}!\n\nYou're all set. Go to your dashboard: https://credit-800.com/dashboard`;
  await send(to, "Welcome to Credit 800 🎉", html, text);
}

export async function sendAutopilotWelcomeEmail(to: string, name: string) {
  const html = layout(`
    <div style="background:linear-gradient(90deg,#1a3fd4,#00d4aa);border-radius:10px;padding:20px 24px;margin-bottom:24px;text-align:center;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.7);">Now Active</p>
      <p style="margin:6px 0 0;font-size:26px;font-weight:900;color:#fff;">Autopilot ✈️</p>
    </div>
    ${h1(`You're on Autopilot, ${name || "there"}!`)}
    ${p("From here on, Credit 800 handles the full dispute cycle for you — every single month, automatically.")}
    <ul style="margin:0 0 20px;padding-left:20px;color:#475569;font-size:15px;line-height:2;">
      <li><strong>Soft-pull credit report</strong> — no impact to your score</li>
      <li><strong>FCRA-compliant letters generated</strong> — citing specific legal sections</li>
      <li><strong>Physically mailed via USPS</strong> — with delivery confirmation</li>
      <li><strong>Automatic escalation</strong> — if a bureau doesn't respond</li>
    </ul>
    ${p("Your first run will begin within 24 hours. You'll get a notification when your letters are mailed.")}
    <div style="text-align:center;margin:28px 0;">${btn("View Autopilot Dashboard →", "https://credit-800.com/autopilot")}</div>
    ${divider()}
    ${p("You can manage or cancel Autopilot at any time from your <a href='https://credit-800.com/profile' style='color:#1a3fd4;text-decoration:none;'>profile page</a>.")}
  `);
  const text = `You're on Autopilot, ${name || "there"}!\n\nYour first run begins within 24 hours. Track progress at: https://credit-800.com/autopilot`;
  await send(to, "Autopilot is active — your credit repair runs itself now ✈️", html, text);
}

// ─── Remaining stubs (wired but not yet templated) ────────────────────────────

export async function sendAutopilotNotifyEmail(to: string) {
  const html = layout(`
    ${h1("Autopilot run complete")}
    ${p("Your monthly Autopilot cycle has finished. Dispute letters have been generated and mailed to the credit bureaus.")}
    <div style="text-align:center;margin:28px 0;">${btn("View Results →", "https://credit-800.com/autopilot")}</div>
  `);
  await send(to, "Autopilot: your dispute letters have been mailed", html, "Your Autopilot run is complete. View results: https://credit-800.com/autopilot");
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

export async function sendProUpgradeEmail(to: string, amount: number) {
  const html = layout(`
    ${h1("You're now on Pro 🚀")}
    ${p(`Thanks for upgrading! Your Credit 800 Pro plan is active at <strong>$${(amount / 100).toFixed(2)}/month</strong>.`)}
    <div style="text-align:center;margin:28px 0;">${btn("Go to Dashboard →", "https://credit-800.com/dashboard")}</div>
  `);
  await send(to, "Welcome to Credit 800 Pro 🚀", html, `Your Pro plan is active at $${(amount / 100).toFixed(2)}/month.`);
}

export async function sendAutopilotUpgradeEmail(to: string, amount: number) {
  await sendAutopilotWelcomeEmail(to, "");
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

export async function sendHealthReportEmail(to: string, name: string, stats: unknown) {
  const html = layout(`
    ${h1("Your credit health report")}
    ${p(`Hi ${name || "there"}, here's a summary of your credit health. Log in to see your full report.`)}
    <div style="text-align:center;margin:28px 0;">${btn("View Report →", "https://credit-800.com/dashboard")}</div>
  `);
  await send(to, "Your Credit 800 health report", html, "View your credit health report: https://credit-800.com/dashboard");
}

export async function sendWeeklyProgressEmail(to: string, name: string, stats: unknown) {
  const html = layout(`
    ${h1("Your weekly progress update")}
    ${p(`Hi ${name || "there"}, here's what happened with your credit this week.`)}
    <div style="text-align:center;margin:28px 0;">${btn("View Dashboard →", "https://credit-800.com/dashboard")}</div>
  `);
  await send(to, "Your weekly Credit 800 progress", html, "View your weekly progress: https://credit-800.com/dashboard");
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

import { NextResponse } from "next/server";
import {
  sendWelcomeEmail,
  sendOTPEmail,
  sendPasswordResetEmail,
  sendMonthlyCheckupEmail,
} from "@/lib/email";

// GET /api/test-email?type=welcome&to=you@example.com
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const to = searchParams.get("to");
  const type = searchParams.get("type") || "welcome";

  if (!to) return NextResponse.json({ error: "Missing ?to= param" }, { status: 400 });

  try {
    switch (type) {
      case "welcome":
        await sendWelcomeEmail(to, "Tyler");
        break;
      case "monthly":
        await sendMonthlyCheckupEmail(to, "Tyler", {
          latestScore: 672,
          scoreChange: 14,
          openDisputes: 3,
          resolvedDisputes: 2,
          disputableItems: 5,
          upcomingDeadlines: [{ creditorName: "Midland Credit", daysLeft: 4 }],
        });
        break;
      case "otp":
        await sendOTPEmail(to, "Tyler", "482917");
        break;
      case "reset":
        await sendPasswordResetEmail(to, "https://credit-800-dev.tgordo03.workers.dev/reset-password?token=test123");
        break;
      default:
        return NextResponse.json({ error: "Unknown type. Use: welcome, monthly, otp, reset" }, { status: 400 });
    }
    return NextResponse.json({ sent: true, type, to });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

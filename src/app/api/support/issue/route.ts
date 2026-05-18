import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { getUserSubscription } from "@/lib/subscription";
import { sendIssueReport } from "@/lib/email";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { issue, page } = await req.json();
  if (!issue?.trim()) return NextResponse.json({ error: "Issue description is required" }, { status: 400 });

  // Pull profile + subscription so the report has full account context
  const [profileDoc, sub] = await Promise.all([
    firestore.getDoc(COLLECTIONS.users, user.uid).catch(() => null),
    getUserSubscription(user.uid).catch(() => null),
  ]);

  try {
    await sendIssueReport({
      userId: user.uid,
      userEmail: user.email || "unknown",
      fullName: (profileDoc?.data?.fullName as string) || "",
      plan: sub?.plan || "none",
      subscriptionStatus: sub?.status || "unknown",
      issue: issue.trim(),
      page,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[issue report] failed to send email:", msg);
    return NextResponse.json({ error: "Failed to send report. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

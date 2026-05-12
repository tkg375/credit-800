import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { isAdmin } from "@/lib/is-admin";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [users, disputes, reportItems, waitlist] = await Promise.all([
      firestore.query(COLLECTIONS.users, [], "createdAt", "DESCENDING", 5000),
      firestore.query(COLLECTIONS.disputes, [], "createdAt", "DESCENDING", 200),
      firestore.query(COLLECTIONS.creditReports, [], "createdAt", "DESCENDING", 50),
      firestore.query(COLLECTIONS.autopilotWaitlist, []),
    ]);

    const totalUsers = users.length;
    const proSubscribers = users.filter((u) => u.data.subscriptionStatus === "active" && u.data.planTier === "pro").length;
    const autopilotSubscribers = users.filter((u) => u.data.subscriptionStatus === "active" && u.data.planTier === "autopilot").length;
    const notSubscribed = users.filter((u) => !u.data.subscriptionStatus || u.data.subscriptionStatus === "canceled" || u.data.subscriptionStatus === "never").length;

    const disputesLast7 = disputes.filter((d) => {
      const at = d.data.createdAt as string;
      return at && at > sevenDaysAgo;
    }).length;

    const disputesLast30 = disputes.filter((d) => {
      const at = d.data.createdAt as string;
      return at && at > thirtyDaysAgo;
    }).length;

    const reportsLast7 = reportItems.filter((r) => {
      const at = r.data.createdAt as string;
      return at && at > sevenDaysAgo;
    }).length;

    // Top 5 dispute reasons
    const reasonCounts: Record<string, number> = {};
    for (const d of disputes) {
      const reason = (d.data.reason as string) || "Unknown";
      // truncate to first 60 chars for grouping
      const key = reason.slice(0, 60);
      reasonCounts[key] = (reasonCounts[key] || 0) + 1;
    }
    const topReasons = Object.entries(reasonCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));

    // Recent 10 disputes across all users
    const recentDisputes = disputes.slice(0, 10).map((d) => ({
      id: d.id,
      creditorName: d.data.creditorName,
      bureau: d.data.bureau,
      status: d.data.status,
      createdAt: d.data.createdAt,
      userId: d.data.userId,
    }));

    const mrrCents = (proSubscribers * 500) + (autopilotSubscribers * 4900);
    const autopilotWaitlistCount = waitlist.length;

    return NextResponse.json({
      totalUsers,
      notSubscribed,
      proSubscribers,
      autopilotSubscribers,
      autopilotWaitlistCount,
      mrrCents,
      disputesLast7,
      disputesLast30,
      reportsLast7,
      topReasons,
      recentDisputes,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("admin/stats error:", err);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}

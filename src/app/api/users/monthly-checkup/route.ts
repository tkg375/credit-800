import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { sendMonthlyCheckupEmail } from "@/lib/email";

export async function POST() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userDoc = await firestore.getDoc(COLLECTIONS.users, user.uid);

    // Don't email new users until they've been on the platform for at least 30 days
    const accountCreatedAt = userDoc.data.createdAt as string | null;
    if (!accountCreatedAt) return NextResponse.json({ skipped: true });
    const accountAgeDays = (Date.now() - new Date(accountCreatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (accountAgeDays < 30) return NextResponse.json({ skipped: true });

    // Check if checkup email was sent within the last 30 days
    const lastSent = userDoc.data.lastMonthlyCheckupAt as string | null;
    if (lastSent) {
      const daysSince = (Date.now() - new Date(lastSent).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 30) return NextResponse.json({ skipped: true });
    }

    const name = (userDoc.data.fullName as string) || "";

    // Stamp timestamp before sending to prevent duplicate sends
    await firestore.updateDoc(COLLECTIONS.users, user.uid, {
      lastMonthlyCheckupAt: new Date().toISOString(),
    });

    const [scores, disputes, disputableItems] = await Promise.all([
      firestore.query(COLLECTIONS.creditScores, [
        { field: "userId", op: "EQUAL", value: user.uid },
      ]),
      firestore.query(COLLECTIONS.disputes, [
        { field: "userId", op: "EQUAL", value: user.uid },
      ]),
      firestore.query(COLLECTIONS.reportItems, [
        { field: "userId", op: "EQUAL", value: user.uid },
        { field: "isDisputable", op: "EQUAL", value: true },
      ]),
    ]);

    const sortedScores = scores.sort((a, b) => {
      const aTime = a.data.recordedAt ? new Date(a.data.recordedAt as string).getTime() : 0;
      const bTime = b.data.recordedAt ? new Date(b.data.recordedAt as string).getTime() : 0;
      return bTime - aTime;
    });
    const latestScore = sortedScores.length > 0 ? (sortedScores[0].data.score as number) : null;
    const oldestScore = sortedScores.length > 1 ? (sortedScores[sortedScores.length - 1].data.score as number) : null;
    const scoreChange = latestScore !== null && oldestScore !== null ? latestScore - oldestScore : null;

    const openDisputes = disputes.filter(d => d.data.status === "SENT" || d.data.status === "UNDER_INVESTIGATION").length;
    const resolvedDisputes = disputes.filter(d => d.data.status === "RESOLVED" || d.data.status === "won").length;

    // Upcoming bureau deadlines: SENT disputes with response due in next 10 days
    const now = Date.now();
    const upcomingDeadlines = disputes
      .filter(d => {
        if (d.data.status !== "SENT") return false;
        const ref = (d.data.mailedAt as string) || (d.data.createdAt as string);
        if (!ref) return false;
        const daysSince = (now - new Date(ref).getTime()) / (1000 * 60 * 60 * 24);
        const daysLeft = 30 - daysSince;
        return daysLeft >= 0 && daysLeft <= 10;
      })
      .map(d => {
        const ref = (d.data.mailedAt as string) || (d.data.createdAt as string);
        const daysSince = (now - new Date(ref).getTime()) / (1000 * 60 * 60 * 24);
        return {
          creditorName: d.data.creditorName as string,
          daysLeft: Math.ceil(30 - daysSince),
        };
      })
      .slice(0, 5);

    await sendMonthlyCheckupEmail(user.email, name, {
      latestScore,
      scoreChange,
      openDisputes,
      resolvedDisputes,
      disputableItems: disputableItems.length,
      upcomingDeadlines,
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("monthly-checkup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

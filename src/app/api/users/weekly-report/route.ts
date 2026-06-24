import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { sendWeeklyProgressEmail } from "@/lib/email";

export async function POST() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userDoc = await firestore.getDoc(COLLECTIONS.users, user.uid);
    // Don't email new users until they've had the app for at least 7 days
    const accountCreatedAt = userDoc.data.createdAt as string | null;
    if (!accountCreatedAt) return NextResponse.json({ skipped: true });
    const accountAgeDays = (Date.now() - new Date(accountCreatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (accountAgeDays < 7) return NextResponse.json({ skipped: true });

    const lastSent = userDoc.data.lastWeeklyEmailSentAt as string | null;
    if (lastSent) {
      const daysSince = (Date.now() - new Date(lastSent).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        return NextResponse.json({ skipped: true });
      }
    }

    const name = (userDoc.data.fullName as string) || (userDoc.data.displayName as string) || "";

    // Stamp the timestamp first to prevent duplicate sends on concurrent calls
    await firestore.updateDoc(COLLECTIONS.users, user.uid, {
      lastWeeklyEmailSentAt: new Date().toISOString(),
    });

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [scores, disputes, goals] = await Promise.all([
      firestore.query(COLLECTIONS.creditScores, [
        { field: "userId", op: "EQUAL", value: user.uid },
      ]),
      firestore.query(COLLECTIONS.disputes, [
        { field: "userId", op: "EQUAL", value: user.uid },
      ]),
      firestore.query(COLLECTIONS.goals, [
        { field: "userId", op: "EQUAL", value: user.uid },
      ]),
    ]);

    const scoresThisWeek = scores.filter((s) => {
      const at = s.data.recordedAt as string;
      return at && at > oneWeekAgo;
    }).length;

    const sortedScores = scores.sort((a, b) => {
      const aTime = a.data.recordedAt ? new Date(a.data.recordedAt as string).getTime() : 0;
      const bTime = b.data.recordedAt ? new Date(b.data.recordedAt as string).getTime() : 0;
      return bTime - aTime;
    });
    const latestScore = sortedScores.length > 0 ? (sortedScores[0].data.score as number) : null;

    const disputesSentThisWeek = disputes.filter((d) => {
      const at = (d.data.mailedAt as string) || (d.data.createdAt as string);
      return d.data.status === "SENT" && at && at > oneWeekAgo;
    }).length;

    const goalsCompletedThisWeek = goals.filter((g) => {
      const completedAt = g.data.completedAt as string | null;
      return g.data.isCompleted && completedAt && completedAt > oneWeekAgo;
    }).length;

    // Upcoming deadlines: SENT disputes with response due in next 7 days
    const now = Date.now();
    const upcomingDeadlines = disputes
      .filter((d) => {
        if (d.data.status !== "SENT") return false;
        const ref = (d.data.mailedAt as string) || (d.data.createdAt as string);
        if (!ref) return false;
        const daysSince = (now - new Date(ref).getTime()) / (1000 * 60 * 60 * 24);
        const daysLeft = 30 - daysSince;
        return daysLeft >= 0 && daysLeft <= 10;
      })
      .map((d) => {
        const ref = (d.data.mailedAt as string) || (d.data.createdAt as string);
        const daysSince = (now - new Date(ref).getTime()) / (1000 * 60 * 60 * 24);
        return {
          creditorName: d.data.creditorName as string,
          daysLeft: Math.ceil(30 - daysSince),
        };
      })
      .slice(0, 5);

    await sendWeeklyProgressEmail(user.email, name, {
      scoresThisWeek,
      latestScore,
      disputesSentThisWeek,
      goalsCompletedThisWeek,
      upcomingDeadlines,
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("weekly-report error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

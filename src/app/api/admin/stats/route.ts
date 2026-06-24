import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { isAdmin } from "@/lib/is-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const [users, reports, creditorLetters, disputes] = await Promise.all([
      firestore.query(COLLECTIONS.users, [], undefined, undefined, 1000),
      firestore.query(COLLECTIONS.creditReports, [], undefined, undefined, 1000),
      firestore.query(COLLECTIONS.creditorLetters, [], undefined, undefined, 1000),
      firestore.query(COLLECTIONS.disputes, [], undefined, undefined, 1000),
    ]);

    const totalUsers = users.length;
    const totalAnalyses = reports.filter((r) => r.data.status === "ANALYZED").length;
    const totalLettersGenerated = creditorLetters.length;
    const totalSentUSPS = disputes.filter((d) => d.data.mailJobId).length;

    const userList = users.map((u) => ({
      id: u.id,
      email: u.data.email as string,
      name: (u.data.fullName as string) || ((u.data.firstName as string) || "") + " " + ((u.data.lastName as string) || ""),
      plan: (u.data.planTier as string) || "free",
      status: (u.data.subscriptionStatus as string) || "none",
      createdAt: (u.data.createdAt as string) || "",
    })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json({
      totalUsers,
      totalAnalyses,
      totalLettersGenerated,
      totalSentUSPS,
      users: userList,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("admin/stats error:", err);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}

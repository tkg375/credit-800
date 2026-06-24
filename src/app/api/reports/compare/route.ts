import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { sendCreditChangesEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// Normalize a creditor name + account number + bureau into a stable key for matching
function itemKey(item: Record<string, unknown>): string {
  const name = String(item.creditorName ?? "").toLowerCase().trim().replace(/\s+/g, " ");
  const acct = String(item.accountNumber ?? "");
  const bureau = String(item.bureau ?? "");
  return `${name}|${acct}|${bureau}`;
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId } = await req.json();
  if (!reportId) {
    return NextResponse.json({ error: "reportId is required" }, { status: 400 });
  }

  try {
    // Load all reports for this user, sort by uploadedAt descending
    const allReports = await firestore.query(COLLECTIONS.creditReports, [
      { field: "userId", op: "EQUAL", value: user.uid },
    ]);

    const sorted = allReports
      .filter(r => r.data.status === "ANALYZED")
      .sort((a, b) => {
        const aTime = new Date(a.data.uploadedAt as string).getTime();
        const bTime = new Date(b.data.uploadedAt as string).getTime();
        return bTime - aTime; // newest first
      });

    // Find current report and previous report
    const currentIndex = sorted.findIndex(r => r.id === reportId);
    if (currentIndex === -1) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    const previousReport = sorted[currentIndex + 1];

    // If this is the first report, record it and return early
    if (!previousReport) {
      await firestore.addDoc(COLLECTIONS.reportChanges, {
        userId: user.uid,
        currentReportId: reportId,
        previousReportId: null,
        isFirstReport: true,
        newItems: [],
        removedItems: [],
        balanceChanges: [],
        statusChanges: [],
        totalBalanceDelta: 0,
        createdAt: new Date().toISOString(),
      });
      return NextResponse.json({ isFirstReport: true });
    }

    // Load items for both reports
    const [currentItems, previousItems] = await Promise.all([
      firestore.query(COLLECTIONS.reportItems, [
        { field: "userId", op: "EQUAL", value: user.uid },
        { field: "creditReportId", op: "EQUAL", value: reportId },
      ]),
      firestore.query(COLLECTIONS.reportItems, [
        { field: "userId", op: "EQUAL", value: user.uid },
        { field: "creditReportId", op: "EQUAL", value: previousReport.id },
      ]),
    ]);

    const currentMap = new Map(currentItems.map(i => [itemKey(i.data), i.data]));
    const previousMap = new Map(previousItems.map(i => [itemKey(i.data), i.data]));

    // NEW: in current but not previous
    const newItems: { creditorName: string; accountType: string; balance: number; status: string; bureau: string }[] = [];
    for (const [key, item] of currentMap.entries()) {
      if (!previousMap.has(key)) {
        newItems.push({
          creditorName: String(item.creditorName ?? ""),
          accountType: String(item.accountType ?? ""),
          balance: Number(item.balance ?? 0),
          status: String(item.status ?? ""),
          bureau: String(item.bureau ?? ""),
        });
      }
    }

    // REMOVED: in previous but not current
    const removedItems: { creditorName: string; accountType: string; balance: number; bureau: string }[] = [];
    for (const [key, item] of previousMap.entries()) {
      if (!currentMap.has(key)) {
        removedItems.push({
          creditorName: String(item.creditorName ?? ""),
          accountType: String(item.accountType ?? ""),
          balance: Number(item.balance ?? 0),
          bureau: String(item.bureau ?? ""),
        });
      }
    }

    // BALANCE_CHANGED and STATUS_CHANGED: in both, but different
    const balanceChanges: { creditorName: string; oldBalance: number; newBalance: number; delta: number }[] = [];
    const statusChanges: { creditorName: string; oldStatus: string; newStatus: string }[] = [];

    for (const [key, current] of currentMap.entries()) {
      const previous = previousMap.get(key);
      if (!previous) continue;

      const oldBalance = Number(previous.balance ?? 0);
      const newBalance = Number(current.balance ?? 0);
      if (Math.abs(newBalance - oldBalance) > 10) {
        balanceChanges.push({
          creditorName: String(current.creditorName ?? ""),
          oldBalance,
          newBalance,
          delta: newBalance - oldBalance,
        });
      }

      const oldStatus = String(previous.status ?? "");
      const newStatus = String(current.status ?? "");
      if (oldStatus !== newStatus) {
        statusChanges.push({
          creditorName: String(current.creditorName ?? ""),
          oldStatus,
          newStatus,
        });
      }
    }

    // Total balance delta across all items
    const currentTotal = currentItems.reduce((sum, i) => sum + Number(i.data.balance ?? 0), 0);
    const previousTotal = previousItems.reduce((sum, i) => sum + Number(i.data.balance ?? 0), 0);
    const totalBalanceDelta = currentTotal - previousTotal;

    const changes = {
      userId: user.uid,
      currentReportId: reportId,
      previousReportId: previousReport.id,
      isFirstReport: false,
      newItems,
      removedItems,
      balanceChanges,
      statusChanges,
      totalBalanceDelta,
      createdAt: new Date().toISOString(),
    };

    // Save reportChanges doc
    await firestore.addDoc(COLLECTIONS.reportChanges, changes);

    const hasMeaningfulChanges =
      newItems.length > 0 ||
      removedItems.length > 0 ||
      Math.abs(totalBalanceDelta) > 100;

    if (hasMeaningfulChanges) {
      // Create in-app notification
      const totalNew = newItems.length;
      const totalRemoved = removedItems.length;
      const parts = [
        totalNew > 0 ? `${totalNew} new item${totalNew !== 1 ? "s" : ""}` : "",
        totalRemoved > 0 ? `${totalRemoved} item${totalRemoved !== 1 ? "s" : ""} removed` : "",
        Math.abs(totalBalanceDelta) > 100
          ? `balance ${totalBalanceDelta > 0 ? "up" : "down"} $${Math.abs(totalBalanceDelta).toLocaleString()}`
          : "",
      ].filter(Boolean).join(", ");

      await firestore.addDoc(COLLECTIONS.notifications, {
        userId: user.uid,
        type: newItems.filter(i => i.status !== "CURRENT").length > 0 ? "warning" : "success",
        title: "Changes detected on your credit report",
        message: `Your latest report vs previous: ${parts}.`,
        read: false,
        createdAt: new Date().toISOString(),
        actionUrl: "/dashboard",
      });

      // Send email (non-blocking)
      if (user.email) {
        const profileDoc = await firestore.getDoc(COLLECTIONS.users, user.uid).catch(() => null);
        const name = (profileDoc?.data?.fullName as string) || "";
        sendCreditChangesEmail(user.email, name, { newItems, removedItems, balanceChanges, statusChanges, totalBalanceDelta }).catch((err) => console.error("[email] fire-and-forget error:", err));
      }
    }

    return NextResponse.json({ ...changes, hasMeaningfulChanges });
  } catch (err) {
    console.error("[compare] Error:", err);
    return NextResponse.json({ error: "Failed to compare reports" }, { status: 500 });
  }
}

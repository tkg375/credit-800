import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore } from "@/lib/db";
import { snapshotNetWorth } from "@/lib/portfolio-calculator";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await firestore.getDoc("portfolioAccounts", id);
  if (!existing.exists) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  if (existing.data.userId !== user.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (body.name !== undefined) updates.name = String(body.name);
  if (body.institution !== undefined) updates.institution = String(body.institution);
  if (body.isHidden !== undefined) updates.isHidden = Boolean(body.isHidden);

  // Only allow balance update on manual accounts
  if (body.balance !== undefined && existing.data.source === "manual") {
    if (typeof body.balance !== "number") {
      return NextResponse.json({ error: "balance must be a number" }, { status: 400 });
    }
    updates.balance = body.balance;
  }

  await firestore.updateDoc("portfolioAccounts", id, updates);
  await snapshotNetWorth(user.uid);

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await firestore.getDoc("portfolioAccounts", id);
  if (!existing.exists) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  if (existing.data.userId !== user.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const plaidItemId = existing.data.plaidItemId as string | undefined;

  await firestore.deleteDoc("portfolioAccounts", id);

  // If this was the last Plaid account for an item, remove the item too
  if (plaidItemId) {
    const remaining = await firestore.query("portfolioAccounts", [
      { field: "userId", op: "EQUAL", value: user.uid },
      { field: "plaidItemId", op: "EQUAL", value: plaidItemId },
    ]);
    if (remaining.length === 0) {
      await firestore.deleteDoc("plaidItems", plaidItemId);
    }
  }

  await snapshotNetWorth(user.uid);

  return NextResponse.json({ success: true });
}

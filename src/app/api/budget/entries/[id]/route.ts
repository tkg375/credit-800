import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const doc = await firestore.getDoc("budgetEntries", id);
    if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (doc.data.userId !== user.uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await firestore.deleteDoc("budgetEntries", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete budget entry:", error);
    return NextResponse.json({ error: "Failed to delete budget entry" }, { status: 500 });
  }
}

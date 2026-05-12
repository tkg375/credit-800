import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore } from "@/lib/db";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await firestore.query(
    "portfolioSnapshots",
    [{ field: "userId", op: "EQUAL", value: user.uid }],
    "date",
    "ASCENDING",
    90
  );

  const snapshots = rows.map((r) => ({ id: r.id, ...r.data }));
  return NextResponse.json({ snapshots });
}

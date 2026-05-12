import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore } from "@/lib/db";
import { snapshotNetWorth } from "@/lib/portfolio-calculator";
import type { AccountType } from "@/lib/portfolio-types";

const VALID_TYPES: AccountType[] = [
  "checking", "savings", "investment", "retirement",
  "crypto", "real_estate", "vehicle", "other_asset",
  "credit_card", "mortgage", "student_loan", "auto_loan", "other_liability",
];

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await firestore.query("portfolioAccounts", [
    { field: "userId", op: "EQUAL", value: user.uid },
  ]);

  const accounts = rows.map((r) => ({ id: r.id, ...r.data }));
  return NextResponse.json({ accounts });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, institution, type, balance, currency } = body;

  if (!name || !institution || !type || balance === undefined || balance === null) {
    return NextResponse.json(
      { error: "name, institution, type, and balance are required" },
      { status: 400 }
    );
  }

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid account type" }, { status: 400 });
  }

  if (typeof balance !== "number" || !isFinite(balance) || balance < -999_999_999 || balance > 999_999_999) {
    return NextResponse.json({ error: "balance must be a finite number between -999,999,999 and 999,999,999" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const docData = {
    userId: user.uid,
    name: String(name),
    institution: String(institution),
    type: type as AccountType,
    source: "manual",
    balance: balance,
    currency: currency ?? "USD",
    isHidden: false,
    createdAt: now,
    updatedAt: now,
  };

  const docId = await firestore.addDoc("portfolioAccounts", docData);

  await snapshotNetWorth(user.uid);

  return NextResponse.json({ account: { id: docId, ...docData } });
}

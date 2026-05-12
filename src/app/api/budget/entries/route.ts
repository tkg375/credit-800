import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore } from "@/lib/firebase-admin";

export const EXPENSE_CATEGORIES = [
  "Housing", "Food & Dining", "Transport", "Utilities",
  "Entertainment", "Healthcare", "Subscriptions", "Shopping",
  "Debt Payments", "Other",
];
export const INCOME_CATEGORIES = ["Salary", "Freelance", "Investments", "Other Income"];

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // "YYYY-MM"

    const filters: { field: string; op: string; value: unknown }[] = [
      { field: "userId", op: "EQUAL", value: user.uid },
    ];

    const entries = await firestore.query("budgetEntries", filters);

    type EntryRow = { id: string; date: string; [key: string]: unknown };
    let results = entries.map((e) => ({ id: e.id, ...e.data })) as EntryRow[];

    if (month) {
      const start = `${month}-01`;
      const [year, mon] = month.split("-").map(Number);
      const nextMonth = mon === 12 ? `${year + 1}-01` : `${year}-${String(mon + 1).padStart(2, "0")}`;
      const end = `${nextMonth}-01`;
      results = results.filter((e) => {
        const d = e.date;
        return d >= start && d < end;
      });
    }

    results.sort((a, b) => {
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });

    return NextResponse.json({ entries: results });
  } catch (error) {
    console.error("Failed to fetch budget entries:", error);
    return NextResponse.json({ error: "Failed to fetch budget entries" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { type, category, amount, date, note } = await req.json();

    if (!type || !["income", "expense"].includes(type)) {
      return NextResponse.json({ error: "type must be 'income' or 'expense'" }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: "category is required" }, { status: 400 });
    }
    if (typeof amount !== "number" || !isFinite(amount) || amount <= 0 || amount > 999_999) {
      return NextResponse.json({ error: "amount must be a positive number up to 999,999" }, { status: 400 });
    }
    const roundedAmount = Math.round(amount * 100) / 100;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
    }

    const docId = await firestore.addDoc("budgetEntries", {
      userId: user.uid,
      type,
      category,
      amount: roundedAmount,
      date,
      note: note || "",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ id: docId });
  } catch (error) {
    console.error("Failed to add budget entry:", error);
    return NextResponse.json({ error: "Failed to add budget entry" }, { status: 500 });
  }
}

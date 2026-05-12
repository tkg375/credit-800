import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore } from "@/lib/firebase-admin";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const docs = await firestore.query("goals", [
      { field: "userId", op: "EQUAL", value: user.uid },
    ]);

    type GoalRow = { id: string; createdAt: string; [key: string]: unknown };
    const goals = (docs.map((d) => ({ id: d.id, ...d.data })) as GoalRow[])
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));

    return NextResponse.json({ goals });
  } catch (error) {
    console.error("Failed to fetch goals:", error);
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { type, title, target, current, unit, deadline } = await req.json();

    const validTypes = ["credit_score", "net_worth", "debt_payoff", "savings"];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid goal type" }, { status: 400 });
    }
    if (!title || typeof title !== "string" || title.trim().length > 200) {
      return NextResponse.json({ error: "title must be 1–200 characters" }, { status: 400 });
    }
    if (typeof target !== "number" || !isFinite(target)) {
      return NextResponse.json({ error: "target must be a finite number" }, { status: 400 });
    }
    if (typeof current !== "number" || !isFinite(current)) {
      return NextResponse.json({ error: "current must be a finite number" }, { status: 400 });
    }
    if (!unit) return NextResponse.json({ error: "unit is required" }, { status: 400 });
    if (deadline && (typeof deadline !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(deadline))) {
      return NextResponse.json({ error: "deadline must be YYYY-MM-DD" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const docId = await firestore.addDoc("goals", {
      userId: user.uid,
      type,
      title,
      target,
      current,
      unit,
      deadline: deadline || null,
      isCompleted: false,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ id: docId });
  } catch (error) {
    console.error("Failed to create goal:", error);
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}

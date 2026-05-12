import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const doc = await firestore.getDoc("goals", id);
    if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (doc.data.userId !== user.uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { current, isCompleted, title, target, deadline } = body;

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (typeof current === "number") updates.current = current;
    if (typeof isCompleted === "boolean") updates.isCompleted = isCompleted;
    if (typeof title === "string") updates.title = title;
    if (typeof target === "number") updates.target = target;
    if (deadline !== undefined) updates.deadline = deadline;

    // Auto-complete if current >= target
    const effectiveCurrent = typeof current === "number" ? current : (doc.data.current as number);
    const effectiveTarget = typeof target === "number" ? target : (doc.data.target as number);
    const wasCompleted = doc.data.isCompleted as boolean;

    if (effectiveCurrent >= effectiveTarget && !wasCompleted) {
      updates.isCompleted = true;
      updates.completedAt = new Date().toISOString();

      const goalTitle = typeof title === "string" ? title : (doc.data.title as string);
      createNotification(user.uid, {
        type: "goal_achieved",
        title: "Goal Achieved!",
        message: `You reached your goal: ${goalTitle}`,
        actionUrl: "/goals",
      }).catch(() => {});
    }

    await firestore.updateDoc("goals", id, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update goal:", error);
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const doc = await firestore.getDoc("goals", id);
    if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (doc.data.userId !== user.uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await firestore.deleteDoc("goals", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete goal:", error);
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
  }
}

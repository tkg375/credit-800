import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const notifications = await firestore.query("notifications", [
      { field: "userId", op: "EQUAL", value: user.uid },
    ]);

    const sorted = notifications.sort((a, b) => {
      const aDate = a.data.createdAt ? new Date(a.data.createdAt as string).getTime() : 0;
      const bDate = b.data.createdAt ? new Date(b.data.createdAt as string).getTime() : 0;
      return bDate - aDate;
    });

    return NextResponse.json({
      notifications: sorted.slice(0, 50).map((n) => ({ id: n.id, ...n.data })),
    });
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { type, title, message, actionUrl } = await req.json();

    const VALID_TYPES = new Set(["info", "success", "warning", "error"]);
    const safeType = VALID_TYPES.has(type) ? type : "info";

    const docId = await firestore.addDoc("notifications", {
      userId: user.uid,
      type: safeType,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
      actionUrl: actionUrl || null,
    });

    return NextResponse.json({ id: docId });
  } catch (error) {
    console.error("Failed to create notification:", error);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { notificationId, read } = await req.json();

    if (!notificationId) {
      return NextResponse.json({ error: "notificationId required" }, { status: 400 });
    }

    const notif = await firestore.getDoc("notifications", notificationId);
    if (!notif || !notif.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (notif.data?.userId !== user.uid) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await firestore.updateDoc("notifications", notificationId, { read: read ?? true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update notification:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

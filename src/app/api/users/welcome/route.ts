import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || !user.email) return NextResponse.json({ ok: false });
  const { name } = await req.json().catch(() => ({ name: "" }));

  // Stamp createdAt on the user doc so we can gate time-sensitive emails
  const userDoc = await firestore.getDoc(COLLECTIONS.users, user.uid);
  if (!userDoc?.data?.createdAt) {
    await firestore.updateDoc(COLLECTIONS.users, user.uid, {
      createdAt: new Date().toISOString(),
      email: user.email,
    });
  }

  sendWelcomeEmail(user.email, name || "").catch((err) => console.error("[email] fire-and-forget error:", err));
  return NextResponse.json({ ok: true });
}

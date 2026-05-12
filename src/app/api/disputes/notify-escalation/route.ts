import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { sendEscalationReadyEmail } from "@/lib/email";
import { getLimiters } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { success: rlOk } = await getLimiters().escalationEmail.limit(user.uid);
  if (!rlOk) return NextResponse.json({ error: "Too many escalation emails today. Try again tomorrow." }, { status: 429 });

  try {
    const { disputeId } = await req.json();
    if (!disputeId) {
      return NextResponse.json({ error: "disputeId required" }, { status: 400 });
    }

    // Fetch dispute
    const dispute = await firestore.getDoc(COLLECTIONS.disputes, disputeId);
    if (!dispute.exists) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    // Verify ownership
    if (dispute.data.userId !== user.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch user doc for name
    const userDoc = await firestore.getDoc(COLLECTIONS.users, user.uid);
    const name = (userDoc.data.fullName as string) || (userDoc.data.displayName as string) || "";

    const creditorName = (dispute.data.creditorName as string) || "your creditor";
    const bureau = (dispute.data.bureau as string) || "the bureau";
    const escalationRound = (dispute.data.escalationRound as number) || null;
    const round = escalationRound === 2 ? 3 : 2;

    await sendEscalationReadyEmail(user.email, name, creditorName, bureau, round);

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("notify-escalation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { getEscalationTemplate } from "@/lib/escalation-templates";
import { getLimiters } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { success: rlOk } = await getLimiters().escalate.limit(user.uid);
  if (!rlOk) {
    return NextResponse.json({ error: "Escalation limit reached (5/day). Try again tomorrow." }, { status: 429 });
  }

  const { disputeId, round } = await req.json();
  if (!disputeId || !round) return NextResponse.json({ error: "disputeId and round are required" }, { status: 400 });

  const template = getEscalationTemplate(round);
  if (!template) return NextResponse.json({ error: "Invalid escalation round" }, { status: 400 });

  const dispute = await firestore.getDoc(COLLECTIONS.disputes, disputeId);
  if (!dispute.exists) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  if (dispute.data.userId !== user.uid) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  // Enforce 30-day minimum before escalation
  const sentDate = (dispute.data.mailedAt as string) || (dispute.data.createdAt as string);
  if (sentDate) {
    const sentMs = new Date(sentDate).getTime();
    if (isNaN(sentMs)) {
      return NextResponse.json({ error: "Dispute has an invalid date — cannot determine escalation eligibility" }, { status: 400 });
    }
    const daysSinceSent = Math.floor((Date.now() - sentMs) / (1000 * 60 * 60 * 24));
    if (daysSinceSent < 30) {
      return NextResponse.json(
        { error: `Escalation not available yet. You must wait at least 30 days after sending. ${30 - daysSinceSent} day(s) remaining.` },
        { status: 400 }
      );
    }
  }

  // Fetch user profile for address block
  let consumerAddress = "[Your Address]\n[City, State ZIP]";
  let consumerName = user.email?.split("@")[0] || "Consumer";
  try {
    const profileDoc = await firestore.getDoc(COLLECTIONS.users, user.uid);
    if (profileDoc.exists && profileDoc.data.fullName) {
      consumerName = profileDoc.data.fullName as string;
      const p = profileDoc.data;
      const line2 = p.address2 ? `\n${p.address2}` : "";
      consumerAddress = `${p.address}${line2}\n${p.city}, ${p.state} ${p.zip}`;
    }
  } catch { /* non-blocking */ }

  const originalDisputeDate = dispute.data.createdAt
    ? new Date(dispute.data.createdAt as string).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "Unknown";

  const letterContent = template.generateLetter({
    creditorName: dispute.data.creditorName as string || "Unknown Creditor",
    bureau: dispute.data.bureau as string || "Credit Bureau",
    accountNumber: (dispute.data.accountNumber as string) || "Unknown",
    originalDisputeDate,
    reason: dispute.data.reason as string || "Inaccurate information",
    consumerName,
    consumerAddress,
  });

  // Create new escalation dispute record
  const now = new Date().toISOString();
  const newDisputeId = await firestore.addDoc(COLLECTIONS.disputes, {
    userId: user.uid,
    itemId: dispute.data.itemId || null,
    creditorName: dispute.data.creditorName,
    bureau: dispute.data.bureau,
    reason: `[Round ${round}] ${template.title}`,
    status: "DRAFT",
    letterContent,
    creditorAddress: dispute.data.creditorAddress || null,
    escalationRound: round,
    originalDisputeId: disputeId,
    createdAt: now,
    updatedAt: now,
  });

  // Mark original dispute as escalated
  await firestore.updateDoc(COLLECTIONS.disputes, disputeId, {
    escalatedToId: newDisputeId,
    escalationRound: round,
    updatedAt: now,
  });

  return NextResponse.json({ disputeId: newDisputeId, letterContent });
}

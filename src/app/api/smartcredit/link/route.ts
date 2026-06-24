/**
 * POST /api/smartcredit/link
 *
 * Called after a user creates their SmartCredit account.
 * Stores the SmartCredit member ID on the user's profile and
 * optionally triggers the initial account link with SmartCredit's API.
 *
 * Body: { smartCreditUserId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit-log";
import { linkSmartCreditAccount } from "@/lib/smartcredit";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { smartCreditUserId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { smartCreditUserId } = body;
  if (!smartCreditUserId || typeof smartCreditUserId !== "string") {
    return NextResponse.json({ error: "smartCreditUserId is required" }, { status: 400 });
  }

  // Check if already linked
  const existing = await firestore.query(
    "smartCreditLinks",
    [{ field: "userId", op: "EQUAL", value: user.uid }],
    "linkedAt",
    "DESCENDING",
    1
  );

  if (existing.length > 0 && existing[0].data.status === "active") {
    return NextResponse.json(
      { error: "A SmartCredit account is already linked to this profile." },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();

  // Store the link record locally first
  const linkId = await firestore.addDoc("smartCreditLinks", {
    userId: user.uid,
    smartCreditUserId,
    status: "pending",
    linkedAt: now,
  });

  // Attempt API-side link (no-op if Enterprise API not yet configured)
  let apiLinked = false;
  try {
    await linkSmartCreditAccount({ smartCreditUserId, platformUserId: user.uid });
    apiLinked = true;
    await firestore.updateDoc("smartCreditLinks", linkId, { status: "active" });
    // Mirror onto user profile for quick access
    await firestore.updateDoc(COLLECTIONS.users, user.uid, {
      smartCreditUserId,
      smartCreditLinkedAt: now,
    });
  } catch (err) {
    // Enterprise API not yet configured — save as pending, activate when API is live
    console.warn("[smartcredit/link] API link skipped (not yet configured):", err instanceof Error ? err.message : err);
    await firestore.updateDoc("smartCreditLinks", linkId, {
      status: "pending_api",
      pendingReason: "Enterprise API not yet configured",
    });
    await firestore.updateDoc(COLLECTIONS.users, user.uid, {
      smartCreditUserId,
      smartCreditLinkedAt: now,
    });
  }

  await logAuditEvent({
    userId: user.uid,
    action: "smartcredit_account_linked",
    resourceId: linkId,
    metadata: { smartCreditUserId, apiLinked },
  });

  return NextResponse.json({ success: true, linkId, apiLinked });
}

/**
 * GET /api/smartcredit/link
 * Returns the current SmartCredit link status for the authenticated user.
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const links = await firestore.query(
    "smartCreditLinks",
    [{ field: "userId", op: "EQUAL", value: user.uid }],
    "linkedAt",
    "DESCENDING",
    1
  );

  if (links.length === 0) {
    return NextResponse.json({ linked: false });
  }

  const link = links[0];
  return NextResponse.json({
    linked: true,
    status: link.data.status,
    smartCreditUserId: link.data.smartCreditUserId,
    linkedAt: link.data.linkedAt,
  });
}

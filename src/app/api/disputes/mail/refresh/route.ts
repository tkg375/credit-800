import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { getLetter } from "@/lib/postgrid";

function deriveStatus(status: string, trackingEvents: { name: string }[]): string {
  if (status === "delivered") return "DELIVERED";
  if (status === "returned_to_sender") return "RETURNED";
  if (status === "re-routed") return "RE_ROUTED";
  if (status === "in_local_area" || status === "processed_for_delivery") return "OUT_FOR_DELIVERY";
  if (status === "in_transit" || status === "printing") return "IN_TRANSIT";
  if (trackingEvents.length > 0) {
    const latest = trackingEvents[trackingEvents.length - 1].name;
    if (latest === "Delivered") return "DELIVERED";
    if (latest === "Returned to Sender") return "RETURNED";
    if (latest === "Re-Routed") return "RE_ROUTED";
    if (latest === "Processed for Delivery" || latest === "In Local Area") return "OUT_FOR_DELIVERY";
    if (latest === "In Transit" || latest === "Mailed") return "IN_TRANSIT";
  }
  return "SUBMITTED";
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let disputeId: string;
  try {
    const body = await request.json();
    disputeId = body.disputeId;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!disputeId) return NextResponse.json({ error: "disputeId is required" }, { status: 400 });

  const dispute = await firestore.getDoc(COLLECTIONS.disputes, disputeId);
  if (!dispute.exists) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  if (dispute.data.userId !== user.uid) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const mailJobId = dispute.data.mailJobId as string | undefined;
  if (!mailJobId) return NextResponse.json({ error: "Dispute has not been mailed" }, { status: 400 });

  try {
    const letter = await getLetter(mailJobId);
    const mailStatus = deriveStatus(letter.status, letter.tracking_events);
    const latestEvent = letter.tracking_events.length > 0
      ? letter.tracking_events[letter.tracking_events.length - 1]
      : null;

    const trackingData = {
      status: latestEvent?.name || letter.status,
      lastUpdate: latestEvent?.date_created || new Date().toISOString(),
      trackingNumber: letter.tracking_number || null,
    };

    await firestore.updateDoc(COLLECTIONS.disputes, disputeId, {
      mailStatus,
      mailTracking: trackingData,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      mailStatus,
      mailTracking: trackingData,
      expectedDelivery: letter.expected_delivery_date || null,
    });
  } catch (err) {
    console.error("mail refresh error:", err);
    return NextResponse.json(
      { error: "Failed to refresh tracking" },
      { status: 500 }
    );
  }
}

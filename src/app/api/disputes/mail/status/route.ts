import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { getLetter } from "@/lib/postgrid";

/** Map PostGrid letter status to a simple status string. */
function deriveStatus(status: string, trackingEvents: { name: string }[]): string {
  if (status === "delivered") return "DELIVERED";
  if (status === "returned_to_sender") return "RETURNED";
  if (status === "re-routed") return "RE_ROUTED";
  if (status === "in_local_area" || status === "processed_for_delivery") return "OUT_FOR_DELIVERY";
  if (status === "in_transit" || status === "printing") return "IN_TRANSIT";
  if (status === "cancelled" || status === "canceled") return "CANCELLED";

  // Fallback to tracking event names
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

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const disputeId = request.nextUrl.searchParams.get("disputeId");
  if (!disputeId) {
    return NextResponse.json({ error: "disputeId query parameter is required" }, { status: 400 });
  }

  try {
    // Fetch the dispute
    const dispute = await firestore.getDoc(COLLECTIONS.disputes, disputeId);

    if (!dispute.exists) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    if (dispute.data.userId !== user.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const mailJobId = dispute.data.mailJobId as string | undefined;
    if (!mailJobId) {
      return NextResponse.json({ error: "This dispute has not been mailed" }, { status: 400 });
    }

    // Fetch letter from PostGrid
    const letter = await getLetter(mailJobId);
    const mailStatus = deriveStatus(letter.status, letter.tracking_events);

    // Get latest tracking event details
    const latestEvent = letter.tracking_events.length > 0
      ? letter.tracking_events[letter.tracking_events.length - 1]
      : null;

    // Update Firestore with latest status
    const updateData: Record<string, unknown> = {
      mailStatus,
      updatedAt: new Date().toISOString(),
    };

    if (latestEvent) {
      updateData.mailTracking = {
        status: latestEvent.name,
        lastUpdate: latestEvent.date_created,
        trackingNumber: letter.tracking_number || null,
      };
    }

    if (letter.expected_delivery_date) {
      updateData.mailExpectedDelivery = letter.expected_delivery_date;
    }

    await firestore.updateDoc(COLLECTIONS.disputes, disputeId, updateData);

    return NextResponse.json({
      mailJobId,
      mailStatus,
      expectedDelivery: letter.expected_delivery_date || null,
      trackingNumber: letter.tracking_number || null,
      trackingEvents: letter.tracking_events,
      latestEvent: latestEvent ? latestEvent.name : null,
    });
  } catch (error) {
    console.error("Mail status check failed:", error);
    return NextResponse.json(
      { error: "Failed to check mail status", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

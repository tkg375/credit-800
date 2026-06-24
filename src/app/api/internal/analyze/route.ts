import { NextRequest, NextResponse } from "next/server";
import { analyzeReport } from "@/lib/credit-analyzer";
import { firestore, COLLECTIONS } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.JWT_SECRET) {
    console.error("[internal/analyze] secret mismatch — got:", secret?.slice(0, 8));
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let reportId = "";
  try {
    const body = await req.json();
    reportId = body.reportId;
    const { userId, s3Key, bureau } = body;

    if (!reportId || !userId || !s3Key) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    console.log("[internal/analyze] starting", { reportId, userId, s3Key, bureau });

    // Mark that this route was reached
    await firestore.updateDoc(COLLECTIONS.creditReports, reportId, {
      internalRouteReachedAt: new Date().toISOString(),
    });

    await analyzeReport(reportId, userId, s3Key, bureau || "UNKNOWN");

    console.log("[internal/analyze] complete", { reportId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[internal/analyze] unhandled error:", err);
    if (reportId) {
      await firestore.updateDoc(COLLECTIONS.creditReports, reportId, {
        status: "ERROR",
        errorMessage: `Internal route error: ${err instanceof Error ? err.message : String(err)}`,
      }).catch((err) => console.error("[email] fire-and-forget error:", err));
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

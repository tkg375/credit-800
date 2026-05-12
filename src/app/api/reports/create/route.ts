import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getLastAuthError } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    const authError = getLastAuthError();
    console.error("Auth failed:", authError);
    return NextResponse.json(
      { error: "Unauthorized", reason: authError },
      { status: 401 }
    );
  }

  try {
    const { fileName, fileSize, bureau, s3Key } = await req.json();

    // Create credit report record in Firestore
    const reportId = await firestore.addDoc(COLLECTIONS.creditReports, {
      userId: user.uid,
      fileName,
      fileSize,
      s3Key,
      uploadedAt: new Date().toISOString(),
      status: "UPLOADED",
      bureau: bureau || "UNKNOWN",
    });

    return NextResponse.json({
      success: true,
      reportId,
    });
  } catch (err) {
    console.error("Create report error:", err);
    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getLastAuthError } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    console.error("Auth failed:", getLastAuthError());
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const VALID_BUREAUS = ["EQUIFAX", "EXPERIAN", "TRANSUNION", "UNKNOWN"];

  try {
    const { fileName, fileSize, bureau, s3Key } = await req.json();

    if (!s3Key || typeof s3Key !== "string" || !s3Key.startsWith(`reports/${user.uid}/`)) {
      return NextResponse.json({ error: "Invalid s3Key" }, { status: 400 });
    }

    const safeBureau = VALID_BUREAUS.includes((bureau || "").toUpperCase())
      ? (bureau as string).toUpperCase()
      : "UNKNOWN";

    // Create credit report record in Firestore
    const reportId = await firestore.addDoc(COLLECTIONS.creditReports, {
      userId: user.uid,
      fileName: typeof fileName === "string" ? fileName.slice(0, 500) : "",
      fileSize: typeof fileSize === "number" ? fileSize : 0,
      s3Key,
      uploadedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: "UPLOADED",
      bureau: safeBureau,
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

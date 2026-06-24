import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { putObject } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bureau = (formData.get("bureau") as string) || "UNKNOWN";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 413 });
    }

    // Validate PDF magic bytes (%PDF) — MIME type alone is spoofable
    const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    if (header[0] !== 0x25 || header[1] !== 0x50 || header[2] !== 0x44 || header[3] !== 0x46) {
      return NextResponse.json({ error: "File must be a valid PDF" }, { status: 400 });
    }

    // Upload to S3
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, "_").slice(0, 200);
    const s3Key = `reports/${user.uid}/${timestamp}-${safeName}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    await putObject(s3Key, bytes, "application/pdf");

    // Create credit report record
    const reportId = await firestore.addDoc(COLLECTIONS.creditReports, {
      userId: user.uid,
      fileName: file.name,
      s3Key,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      status: "UPLOADED",
      bureau,
    });

    return NextResponse.json({
      success: true,
      reportId,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}

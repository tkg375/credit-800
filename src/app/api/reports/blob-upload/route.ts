/**
 * Legacy upload token endpoint — now delegates to get-upload-url.
 * Returns a pre-signed S3 PUT URL for direct client-side upload.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getUploadUrl } from "@/lib/s3";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const rawName = typeof body.fileName === "string" ? body.fileName : "upload.pdf";
    const fileName = rawName.replace(/[^a-zA-Z0-9._\-]/g, "_").slice(0, 200);
    const timestamp = Date.now();
    const s3Key = `reports/${user.uid}/${timestamp}-${fileName}`;
    const uploadUrl = await getUploadUrl(s3Key);
    return NextResponse.json({ uploadUrl, s3Key });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}

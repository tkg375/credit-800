import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getUploadUrl } from "@/lib/s3";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

  try {
    const { fileName, mimeType } = await req.json();
    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json({ error: "fileName is required" }, { status: 400 });
    }
    const safeMime = ALLOWED_MIME_TYPES.includes(mimeType) ? mimeType : "application/pdf";
    const safeName = fileName.replace(/[^a-zA-Z0-9._\-]/g, "_").slice(0, 200);
    const timestamp = Date.now();
    const s3Key = `reports/${user.uid}/letters/${timestamp}-${safeName}`;
    const uploadUrl = await getUploadUrl(s3Key, safeMime);
    return NextResponse.json({ uploadUrl, s3Key });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore } from "@/lib/db";
import { putObject, deleteObject, getDownloadUrl } from "@/lib/s3";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const docs = await firestore.query("documents", [
      { field: "userId", op: "EQUAL", value: user.uid },
    ]);

    const sorted = docs.sort((a, b) => {
      const aDate = a.data.uploadedAt ? new Date(a.data.uploadedAt as string).getTime() : 0;
      const bDate = b.data.uploadedAt ? new Date(b.data.uploadedAt as string).getTime() : 0;
      return bDate - aDate;
    });

    // Generate pre-signed download URLs for each document
    const documents = await Promise.all(
      sorted.map(async (d) => {
        const data = { id: d.id, ...d.data };
        if (d.data.s3Key) {
          try {
            (data as Record<string, unknown>).downloadUrl = await getDownloadUrl(d.data.s3Key as string);
          } catch {
            // If URL generation fails, omit it
          }
        }
        return data;
      })
    );

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const name = (formData.get("name") as string) || file.name;
    const category = (formData.get("category") as string) || "other";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 413 });
    }

    const ALLOWED_EXTENSIONS = /\.(pdf|doc|docx|xls|xlsx|csv|txt|jpg|jpeg|png|webp|gif|heic|mp4|mov)$/i;
    if (!ALLOWED_EXTENSIONS.test(file.name)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    // Upload to S3
    const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, "_").slice(0, 200);
    const s3Key = `vault/${user.uid}/${Date.now()}-${safeName}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    await putObject(s3Key, bytes, file.type || "application/octet-stream");

    // Generate a pre-signed download URL to return immediately
    const downloadUrl = await getDownloadUrl(s3Key);

    // Save metadata to Firestore
    const docId = await firestore.addDoc("documents", {
      userId: user.uid,
      name,
      type: file.type,
      size: file.size,
      s3Key,
      category,
      uploadedAt: new Date().toISOString(),
    });

    return NextResponse.json({ id: docId, url: downloadUrl });
  } catch (error) {
    console.error("Failed to upload document:", error);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json({ error: "documentId required" }, { status: 400 });
    }

    // Get the document to find the S3 key
    const doc = await firestore.getDoc("documents", documentId);
    if (!doc?.exists || doc.data.userId !== user.uid) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Delete from S3
    if (doc.data.s3Key) {
      try {
        await deleteObject(doc.data.s3Key as string);
      } catch {
        // Object might already be deleted
      }
    }

    // Delete from Firestore
    await firestore.deleteDoc("documents", documentId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete document:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}

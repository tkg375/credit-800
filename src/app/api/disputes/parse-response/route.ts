import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

const AI_TEXT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const AI_VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
type AiBinding = { run: (model: string, inputs: Record<string, unknown>) => Promise<unknown> };

const PARSE_PROMPT = `You are a credit dispute expert. A user has uploaded a bureau response letter.
Extract the following information from the letter:

1. Outcome: what did the bureau decide? (one of: "deleted", "verified", "updated", "no_response")
   - deleted: the account/item was removed from the report
   - verified: the bureau confirmed the item is accurate
   - updated: the bureau modified the information
   - no_response: the letter indicates no investigation was done or this is unclear
2. Creditor/company name mentioned in the letter
3. Bureau name (Equifax, Experian, or TransUnion)
4. Date of the letter or response date
5. Key language: the most important 1-2 sentences from the letter (e.g., the decision statement)

Return ONLY valid JSON in this exact format:
{
  "outcome": "deleted" | "verified" | "updated" | "no_response",
  "creditorName": "string or null",
  "bureauName": "Equifax" | "Experian" | "TransUnion" | null,
  "responseDate": "YYYY-MM-DD or null",
  "keyLanguage": "string or null"
}`;

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await getCloudflareContext({ async: true });
  const ai = (ctx.env as { AI: AiBinding }).AI;
  if (!ai) return NextResponse.json({ error: "AI service not configured" }, { status: 503 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const disputeId = formData.get("disputeId") as string | null;

  if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (!disputeId) return NextResponse.json({ error: "disputeId is required" }, { status: 400 });

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 413 });
  }

  const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  const ext = file.name.toLowerCase();
  const extOk = ext.endsWith(".pdf") || ext.endsWith(".jpg") || ext.endsWith(".jpeg") || ext.endsWith(".png") || ext.endsWith(".webp");
  if (!ALLOWED_MIME_TYPES.includes(file.type) && !extOk) {
    return NextResponse.json({ error: "Only PDF and image files are accepted" }, { status: 415 });
  }

  // Verify PDF magic bytes if claimed to be a PDF
  const headerBuf = await file.slice(0, 5).arrayBuffer();
  const header = Buffer.from(headerBuf).toString("ascii");
  const claimedPdf = file.type === "application/pdf" || ext.endsWith(".pdf");
  if (claimedPdf && !header.startsWith("%PDF-")) {
    return NextResponse.json({ error: "Invalid PDF file" }, { status: 415 });
  }

  // Verify ownership
  const dispute = await firestore.getDoc(COLLECTIONS.disputes, disputeId);
  if (!dispute.exists) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  if (dispute.data.userId !== user.uid) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const mimeType = file.type || "application/pdf";
  const isPdf = mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  try {
    let aiModel: string;
    let aiInputs: Record<string, unknown>;
    if (isPdf) {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(bytes);
      const { text: extracted } = await extractText(pdf, { mergePages: true });
      const letterText = (Array.isArray(extracted) ? extracted.join("\n") : extracted).slice(0, 60_000);
      if (!letterText || letterText.trim().length < 20) {
        throw new Error("Could not extract text from PDF — it may be a scanned image");
      }
      aiModel = AI_TEXT_MODEL;
      aiInputs = {
        max_tokens: 1024,
        temperature: 0,
        messages: [{ role: "user", content: `${PARSE_PROMPT}\n\nHere is the letter text:\n${letterText}` }],
      };
    } else {
      aiModel = AI_VISION_MODEL;
      aiInputs = {
        prompt: PARSE_PROMPT,
        image: Array.from(bytes),
        max_tokens: 1024,
        temperature: 0,
      };
    }

    const result = await ai.run(aiModel, aiInputs) as { response?: unknown };
    const raw = result?.response;
    let parsed: Record<string, unknown>;
    if (raw && typeof raw === "object") {
      parsed = raw as Record<string, unknown>;
    } else {
      const text = typeof raw === "string" ? raw : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in AI response");
      parsed = JSON.parse(jsonMatch[0]);
    }
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("parse-response error:", err);
    return NextResponse.json(
      { error: "Failed to parse letter" },
      { status: 500 }
    );
  }
}

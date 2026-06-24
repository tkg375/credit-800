import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";

export const dynamic = "force-dynamic";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const PARSE_PROMPT = `You are an expert consumer credit attorney analyzing a bureau or creditor response letter to a credit dispute. Today is ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.

Carefully analyze this letter and return a comprehensive JSON object:

{
  "outcome": "deleted" | "verified" | "updated" | "no_response",
  "creditorName": "string or null",
  "bureauName": "Equifax" | "Experian" | "TransUnion" | null,
  "responseDate": "YYYY-MM-DD or null",
  "keyLanguage": "The most important 1-2 sentences from the letter — the actual decision statement",
  "legalAnalysis": "2-3 sentence expert analysis: was the bureau's response legally proper under FCRA? Did they meet the 30-day investigation requirement? Are there any procedural deficiencies in their response?",
  "nextSteps": [
    {
      "action": "Short title of next step",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "description": "Specific, actionable instruction. Cite law where relevant (FCRA § 611, § 623, FDCPA § 809, etc.)."
    }
  ],
  "draftFollowUpLetter": "Full formatted follow-up letter text the consumer can send next, using \\n for line breaks"
}

OUTCOME DEFINITIONS:
- deleted: The item was removed from the credit report
- verified: The bureau confirmed the item is accurate (consumer should escalate)
- updated: The bureau modified but did not remove the item
- no_response: No clear investigation result, boilerplate, or unclear letter

NEXT STEPS GUIDANCE based on outcome:
- If "deleted": Confirm removal by pulling updated credit report. Dispute with other bureaus if needed. Note the win for records.
- If "verified": (1) Send a Method of Verification letter (FCRA § 611(a)(6)) demanding exactly how they verified — name and address of the person at the furnisher they contacted, (2) File a complaint with the CFPB at consumerfinance.gov/complaint, (3) Consider sending a direct dispute to the original creditor under FCRA § 623, (4) If the debt is a collection, send a debt validation letter to the collector demanding original signed contract and chain of title.
- If "updated": Verify what was actually changed. If not removed, escalate using same steps as "verified."
- If "no_response": Bureau may have violated the 30-day FCRA investigation requirement. File CFPB complaint and re-dispute.

DRAFT FOLLOW-UP LETTER GUIDANCE:
- If deleted: Write a brief confirmation letter requesting written proof of deletion and confirming no further collection activity.
- If verified: Write a Method of Verification demand letter under FCRA § 611(a)(6) demanding the specific name, address, and phone number of the person who verified this information at the furnisher, plus all documents reviewed.
- If updated or no_response: Write a re-dispute letter escalating the complaint, noting the inadequate investigation, and threatening CFPB complaint and legal action under FCRA § 1681n if not resolved.

Return ONLY valid JSON. No markdown. No preamble.`;

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI service not configured" }, { status: 503 });

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

  const headerBuf = await file.slice(0, 5).arrayBuffer();
  const header = Buffer.from(headerBuf).toString("ascii");
  const claimedPdf = file.type === "application/pdf" || ext.endsWith(".pdf");
  if (claimedPdf && !header.startsWith("%PDF-")) {
    return NextResponse.json({ error: "Invalid PDF file" }, { status: 415 });
  }

  const dispute = await firestore.getDoc(COLLECTIONS.disputes, disputeId);
  if (!dispute.exists) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  if (dispute.data.userId !== user.uid) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const mimeType = file.type || "application/pdf";
  const isPdf = mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  try {
    let messages: unknown[];
    if (isPdf) {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(bytes);
      const { text: extracted } = await extractText(pdf, { mergePages: true });
      const letterText = (Array.isArray(extracted) ? extracted.join("\n") : extracted).slice(0, 60_000);
      if (!letterText || letterText.trim().length < 20) {
        throw new Error("Could not extract text from PDF — it may be a scanned image");
      }
      messages = [{ role: "user", content: `${PARSE_PROMPT}\n\nHere is the letter text:\n${letterText}` }];
    } else {
      const base64 = Buffer.from(bytes).toString("base64");
      const mediaType = mimeType.startsWith("image/") ? mimeType : "image/jpeg";
      messages = [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64}` } },
          { type: "text", text: PARSE_PROMPT },
        ],
      }];
    }

    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.2,
        max_tokens: 3000,
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`OpenAI error ${res.status}: ${JSON.stringify(err)}`);
    }

    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in OpenAI response");
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("parse-response error:", err);
    return NextResponse.json({ error: "Failed to parse letter" }, { status: 500 });
  }
}

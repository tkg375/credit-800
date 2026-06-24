import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { getObject } from "@/lib/s3";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const ANALYZE_PROMPT = `You are a consumer rights and credit law expert. A user has uploaded a letter received from a creditor, debt collector, or credit bureau.

Carefully analyze the letter and extract the following information. Return ONLY valid JSON in this exact format:

{
  "creditorName": "string or null",
  "letterDate": "YYYY-MM-DD or null",
  "letterType": "collection_notice" | "demand_letter" | "settlement_offer" | "judgment_notice" | "debt_validation_response" | "cease_and_desist_response" | "other",
  "keyClaimsAndDemands": ["claim or demand 1", "claim or demand 2"],
  "amountClaimed": number or null,
  "deadline": "YYYY-MM-DD or null",
  "yourLegalRights": [
    "Right 1 under FCRA/FDCPA/CFPB (specific and actionable)",
    "Right 2 under FCRA/FDCPA/CFPB (specific and actionable)"
  ],
  "recommendedActions": [
    {
      "action": "Short action title",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "description": "Detailed explanation of what to do and why"
    }
  ],
  "draftResponseLetter": "Full formatted letter text with real line breaks (\\n)"
}

Guidelines:
- keyClaimsAndDemands: List every specific claim, debt amount, demand, or threat in the letter
- amountClaimed: Extract the exact dollar amount if stated, otherwise null
- deadline: Extract any response deadline or due date if mentioned, otherwise null
- yourLegalRights: List 3-6 specific legal rights applicable under FCRA, FDCPA, or other consumer protection laws based on the letter type
- recommendedActions: Provide 3-5 prioritized actions the consumer should take, ordered by urgency
- draftResponseLetter: Write a professional, legally-informed response letter the consumer can customize and send. Include appropriate legal citations (FDCPA Section 809, FCRA Section 611, etc.) where relevant.

CRITICAL — the draftResponseLetter MUST be formatted as a real business letter using newline (\\n) characters, NOT one run-on paragraph. Follow this exact structure, each part separated by line breaks:

[YOUR NAME]
[YOUR ADDRESS]
[CITY, STATE ZIP]

[DATE]

[Recipient name]
[Recipient address]

Re: Account Number XXXX

Dear [Recipient],

(First body paragraph.)

(Second body paragraph.)

(Closing paragraph.)

Sincerely,

[YOUR NAME]

Use \\n\\n between paragraphs and \\n between address/header lines. Return only the raw JSON, no markdown.`;

async function callOpenAI(messages: unknown[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0,
      max_tokens: 6000,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenAI error ${res.status}: ${JSON.stringify(err)}`);
  }

  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from OpenAI");
  return text;
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ctx } = await getCloudflareContext({ async: true });

  let body: { s3Key: string; fileName: string; mimeType: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { s3Key, fileName, mimeType } = body;
  if (!s3Key || !fileName) return NextResponse.json({ error: "s3Key and fileName are required" }, { status: 400 });

  if (!s3Key.startsWith(`reports/${user.uid}/`) && !s3Key.startsWith(`vault/${user.uid}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const letterId = await firestore.addDoc(COLLECTIONS.creditorLetters, {
    userId: user.uid,
    fileName,
    s3Key,
    uploadedAt: new Date().toISOString(),
    status: "processing",
    creditorName: null,
    letterType: "other",
    keyClaimsAndDemands: [],
    amountClaimed: null,
    deadline: null,
    yourLegalRights: [],
    recommendedActions: [],
    draftResponseLetter: "",
  });

  const uid = user.uid;
  const userEmail = user.email;

  async function analyzeInBackground() {
    try {
      const bytes = await getObject(s3Key);
      const fileMime = mimeType || "application/pdf";
      const isPdf = fileMime === "application/pdf" || s3Key.toLowerCase().endsWith(".pdf");

      let messages: unknown[];
      if (isPdf) {
        const { extractText, getDocumentProxy } = await import("unpdf");
        const pdf = await getDocumentProxy(new Uint8Array(bytes));
        const { text: extracted } = await extractText(pdf, { mergePages: true });
        const letterText = (Array.isArray(extracted) ? extracted.join("\n") : extracted).slice(0, 80_000);
        if (!letterText || letterText.trim().length < 30) {
          throw new Error("Could not extract text from PDF — it may be a scanned image");
        }
        messages = [{ role: "user", content: `${ANALYZE_PROMPT}\n\nHere is the letter text:\n${letterText}` }];
      } else {
        const base64 = Buffer.from(bytes).toString("base64");
        const mediaType = fileMime.startsWith("image/") ? fileMime : "image/jpeg";
        messages = [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64}` } },
            { type: "text", text: ANALYZE_PROMPT },
          ],
        }];
      }

      const rawText = await callOpenAI(messages);
      const start = rawText.indexOf("{");
      const end = rawText.lastIndexOf("}");
      if (start === -1 || end === -1) throw new Error("No JSON in OpenAI response");
      const analysis = JSON.parse(rawText.slice(start, end + 1)) as Record<string, unknown>;

      await firestore.updateDoc(COLLECTIONS.creditorLetters, letterId, {
        status: "complete",
        creditorName: analysis.creditorName ?? null,
        letterDate: analysis.letterDate ?? null,
        letterType: analysis.letterType ?? "other",
        keyClaimsAndDemands: analysis.keyClaimsAndDemands ?? [],
        amountClaimed: analysis.amountClaimed ?? null,
        deadline: analysis.deadline ?? null,
        yourLegalRights: analysis.yourLegalRights ?? [],
        recommendedActions: analysis.recommendedActions ?? [],
        draftResponseLetter: analysis.draftResponseLetter ?? "",
      });

      const creditorName = typeof analysis.creditorName === "string" ? analysis.creditorName : null;
      await firestore.addDoc(COLLECTIONS.notifications, {
        userId: uid,
        type: "success",
        title: "Letter analysis complete",
        message: creditorName
          ? `Your analysis of the letter from ${creditorName} is ready.`
          : "Your letter analysis is ready to view.",
        read: false,
        createdAt: new Date().toISOString(),
        actionUrl: "/analyze-letter",
      });
      if (userEmail) {
        const { sendLetterReadyEmail } = await import("@/lib/email");
        const userDoc = await firestore.getDoc(COLLECTIONS.users, uid).catch(() => null);
        const name = (userDoc?.data?.fullName as string) || "";
        await sendLetterReadyEmail(userEmail, name, creditorName);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("analyze-letter error:", msg);
      await firestore.updateDoc(COLLECTIONS.creditorLetters, letterId, {
        status: "error",
        errorMessage: msg,
      }).catch((e) => console.error("[letter] update error:", e));
    }
  }

  ctx.waitUntil(analyzeInBackground());

  return NextResponse.json({ letterId, status: "processing" });
}

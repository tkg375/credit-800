import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { getObject } from "@/lib/s3";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const ANALYZE_PROMPT = `You are an expert consumer credit attorney and FDCPA/FCRA specialist. A consumer has uploaded a letter from a creditor, debt collector, or credit bureau. Today is ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.

Analyze the letter thoroughly and return ONLY valid JSON in this exact format — no markdown, no preamble:

{
  "creditorName": "string or null",
  "letterDate": "YYYY-MM-DD or null",
  "letterType": "collection_notice" | "demand_letter" | "settlement_offer" | "judgment_notice" | "debt_validation_response" | "cease_and_desist_response" | "bureau_dispute_response" | "other",
  "keyClaimsAndDemands": ["Every specific claim, amount, threat, or demand made in the letter"],
  "amountClaimed": number or null,
  "deadline": "YYYY-MM-DD or null",
  "fdcpaViolations": ["List any FDCPA violations found in this letter, e.g. 'Threatening lawsuit without intent to sue (FDCPA § 807)', 'Failing to include mini-Miranda warning (FDCPA § 807(11))', 'Contacting consumer after cease-and-desist'. Empty array if none."],
  "yourLegalRights": [
    "Specific right with law citation, e.g. 'Right to request debt validation within 30 days under FDCPA § 809(a)'"
  ],
  "recommendedActions": [
    {
      "action": "Short action title",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "description": "Specific actionable steps. Name the creditor. Cite the law. Explain the likely outcome."
    }
  ],
  "draftResponseLetter": "Full formatted response letter — ready to sign and send. Use \\n for line breaks, \\n\\n between paragraphs."
}

ANALYSIS GUIDELINES:

fdcpaViolations — check for ALL of these:
- Missing mini-Miranda warning ("This is an attempt to collect a debt") — FDCPA § 807(11)
- False or misleading statements about the debt amount, legal status, or consequences — FDCPA § 807
- Threatening legal action the collector cannot or does not intend to take — FDCPA § 807(5)
- Failing to provide the collector's name and address — FDCPA § 809
- Contacting third parties about the debt — FDCPA § 805(b)
- Attempting to collect a time-barred (statute of limitations expired) debt without disclosure — CFPB guidance
- Re-aging the debt (reporting a new date of first delinquency) — FCRA § 605

yourLegalRights — always include:
- Right to request debt validation within 30 days (FDCPA § 809)
- Right to dispute inaccuracies with credit bureaus (FCRA § 611)
- Right to request cease-and-desist (FDCPA § 805(c))
- Any additional rights specific to this letter type

recommendedActions — ordered by urgency:
- If the 30-day FDCPA validation window is open: send validation letter IMMEDIATELY (HIGH)
- If FDCPA violations found: document violations and consider CFPB complaint (HIGH)
- If settlement offer: advise on negotiation (get pay-for-delete in writing first)
- Always: dispute with credit bureaus if the item appears on the credit report

draftResponseLetter — write a complete, assertive response letter:
- If collection notice: demand full validation (FDCPA § 809) — original signed contract, chain of title, payment history, collector's state license
- If settlement offer: counter with pay-for-delete language
- If judgment notice: recommend consulting an attorney immediately but provide interim response
- If any FDCPA violations found: reference the specific violations in the letter and state consequences
- Proper business letter format with sender placeholder, date, recipient, Re: line, body, signature

Use \\n\\n between paragraphs and \\n between address/header lines.`;

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
      temperature: 0.2,
      max_tokens: 8000,
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

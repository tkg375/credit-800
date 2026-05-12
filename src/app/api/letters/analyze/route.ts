import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { getObject } from "@/lib/s3";
import { getUserSubscription } from "@/lib/subscription";
import { getLimiters } from "@/lib/ratelimit";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

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
  "draftResponseLetter": "Full formatted letter text the user can send in response, including [YOUR NAME], [YOUR ADDRESS], [DATE] placeholders"
}

Guidelines:
- keyClaimsAndDemands: List every specific claim, debt amount, demand, or threat in the letter
- amountClaimed: Extract the exact dollar amount if stated, otherwise null
- deadline: Extract any response deadline or due date if mentioned, otherwise null
- yourLegalRights: List 3-6 specific legal rights applicable under FCRA, FDCPA, or other consumer protection laws based on the letter type
- recommendedActions: Provide 3-5 prioritized actions the consumer should take, ordered by urgency
- draftResponseLetter: Write a professional, legally-informed response letter the consumer can customize and send. Include appropriate legal citations (FDCPA Section 809, FCRA Section 611, etc.) where relevant
Return only the raw JSON, no markdown.`;

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await getUserSubscription(user.uid);
  if (!sub.isPro) {
    return NextResponse.json({ error: "Active subscription required" }, { status: 403 });
  }

  const { success: rlOk } = await getLimiters().letterAnalyze.limit(user.uid);
  if (!rlOk) {
    return NextResponse.json({ error: "Daily analysis limit reached (10/day). Try again tomorrow." }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Gemini not configured" }, { status: 503 });

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

  try {
    const bytes = await getObject(s3Key);
    const base64 = Buffer.from(bytes).toString("base64");
    const fileMime = mimeType || "application/pdf";

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: fileMime, data: base64 } },
            { text: ANALYZE_PROMPT },
          ],
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 8192 },
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.error("Gemini API error:", JSON.stringify(errBody));
      throw new Error("Gemini request failed");
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      const finishReason = data.candidates?.[0]?.finishReason;
      console.error("Empty Gemini response, finishReason:", finishReason, "raw:", JSON.stringify(data).slice(0, 300));
      throw new Error("AI service returned empty response");
    }

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) {
      console.error("No JSON in Gemini response, raw text:", text.slice(0, 500));
      throw new Error("AI service returned unexpected format");
    }

    const analysis = JSON.parse(text.slice(start, end + 1));

    const letterId = await firestore.addDoc(COLLECTIONS.creditorLetters, {
      userId: user.uid,
      fileName,
      s3Key,
      uploadedAt: new Date().toISOString(),
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

    return NextResponse.json({ letterId, analysis });
  } catch (err) {
    console.error("analyze-letter error:", err);
    return NextResponse.json({ error: "Failed to analyze letter" }, { status: 500 });
  }
}

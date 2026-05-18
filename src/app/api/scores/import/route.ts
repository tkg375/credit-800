import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { getLimiters } from "@/lib/ratelimit";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { success: rlOk } = await getLimiters().scoreImport.limit(user.uid);
  if (!rlOk) {
    return NextResponse.json({ error: "Daily import limit reached (10/day). Try again tomorrow." }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Gemini not configured" }, { status: 503 });

  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const MAX_BASE64_LENGTH = 1_400_000; // ~1MB decoded

  const { imageBase64, mimeType } = await req.json();
  if (!imageBase64) return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
  if (typeof imageBase64 !== "string" || imageBase64.length > MAX_BASE64_LENGTH) {
    return NextResponse.json({ error: "Image too large" }, { status: 400 });
  }
  const safeMime = ALLOWED_MIME_TYPES.includes(mimeType) ? mimeType : "image/jpeg";

  const prompt = `Look at this credit score screenshot or document. Extract:
1. The credit score number (300-850)
2. The credit bureau name if visible (Equifax, Experian, TransUnion)
3. The source/app name if visible (Credit Karma, Experian, MyFICO, etc.)
4. The date if visible

Return ONLY a JSON object like:
{"score": 720, "bureau": "TransUnion", "source": "Credit Karma", "date": "2024-01-15"}

If you cannot find a score, return: {"score": null}
Return only the raw JSON, no markdown.`;

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: safeMime, data: imageBase64 } },
          { text: prompt },
        ],
      }],
      generationConfig: { temperature: 0, maxOutputTokens: 256 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[scores/import] Gemini error:", JSON.stringify(err));
    return NextResponse.json({ error: "Failed to analyze image" }, { status: 500 });
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  let parsed: { score: number | null; bureau?: string; source?: string; date?: string };
  try {
    const match = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match ? match[0] : text);
  } catch {
    return NextResponse.json({ error: "Could not parse score from image" }, { status: 422 });
  }

  if (!parsed.score || parsed.score < 300 || parsed.score > 850) {
    return NextResponse.json({ error: "No valid credit score found in image" }, { status: 422 });
  }

  let recordedAt = new Date().toISOString();
  if (parsed.date) {
    const d = new Date(parsed.date);
    if (!isNaN(d.getTime()) && d.getFullYear() >= 2000 && d <= new Date()) {
      recordedAt = d.toISOString();
    }
  }

  const id = await firestore.addDoc(COLLECTIONS.creditScores, {
    userId: user.uid,
    score: parsed.score,
    source: parsed.source || "Screenshot Import",
    bureau: parsed.bureau || null,
    recordedAt,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({
    id,
    score: parsed.score,
    bureau: parsed.bureau || null,
    source: parsed.source || "Screenshot Import",
    recordedAt,
  });
}

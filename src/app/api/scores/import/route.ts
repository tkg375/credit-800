import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";

export const dynamic = "force-dynamic";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const MAX_BASE64_LENGTH = 1_400_000;

  const { imageBase64 } = await req.json();
  if (!imageBase64) return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
  if (typeof imageBase64 !== "string" || imageBase64.length > MAX_BASE64_LENGTH) {
    return NextResponse.json({ error: "Image too large" }, { status: 400 });
  }

  const prompt = `Look at this credit score screenshot or document. Extract:
1. The credit score number (300-850)
2. The credit bureau name if visible (Equifax, Experian, TransUnion)
3. The source/app name if visible (Credit Karma, Experian, MyFICO, etc.)
4. The date if visible

Return ONLY a JSON object like:
{"score": 720, "bureau": "TransUnion", "source": "Credit Karma", "date": "2024-01-15"}

If you cannot find a score, return: {"score": null}
Return only the raw JSON, no markdown.`;

  let text = "";
  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0,
        max_tokens: 256,
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            { type: "text", text: prompt },
          ],
        }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`OpenAI error ${res.status}: ${JSON.stringify(err)}`);
    }

    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    text = data.choices?.[0]?.message?.content ?? "";
  } catch (err) {
    console.error("[scores/import] OpenAI error:", err);
    return NextResponse.json({ error: "Failed to analyze image" }, { status: 500 });
  }

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

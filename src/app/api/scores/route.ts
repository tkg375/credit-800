import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore } from "@/lib/firebase-admin";
import { createNotification } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const scores = await firestore.query("creditScores", [
      { field: "userId", op: "EQUAL", value: user.uid },
    ]);

    const sorted = scores.sort((a, b) => {
      const aDate = a.data.recordedAt ? new Date(a.data.recordedAt as string).getTime() : 0;
      const bDate = b.data.recordedAt ? new Date(b.data.recordedAt as string).getTime() : 0;
      return aDate - bDate;
    });

    return NextResponse.json({ scores: sorted.map((s) => ({ id: s.id, ...s.data })) });
  } catch (error) {
    console.error("Failed to fetch scores:", error);
    return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const VALID_BUREAUS = ["Equifax", "Experian", "TransUnion"];
    const { score, source, bureau, recordedAt, factors } = await req.json();

    if (!score || score < 300 || score > 850) {
      return NextResponse.json({ error: "Score must be between 300 and 850" }, { status: 400 });
    }
    if (bureau !== undefined && bureau !== null && !VALID_BUREAUS.includes(bureau)) {
      return NextResponse.json({ error: "bureau must be Equifax, Experian, or TransUnion" }, { status: 400 });
    }
    let safeRecordedAt: string;
    if (recordedAt) {
      const d = new Date(recordedAt);
      if (isNaN(d.getTime()) || d > new Date()) {
        return NextResponse.json({ error: "recordedAt must be a valid past date" }, { status: 400 });
      }
      safeRecordedAt = d.toISOString();
    } else {
      safeRecordedAt = new Date().toISOString();
    }

    // Fetch previous scores to detect significant change
    const prevScores = await firestore.query("creditScores", [
      { field: "userId", op: "EQUAL", value: user.uid },
    ]);

    const sorted = prevScores.sort((a, b) => {
      const aDate = a.data.recordedAt ? new Date(a.data.recordedAt as string).getTime() : 0;
      const bDate = b.data.recordedAt ? new Date(b.data.recordedAt as string).getTime() : 0;
      return bDate - aDate;
    });

    const docId = await firestore.addDoc("creditScores", {
      userId: user.uid,
      score,
      source: source || "Manual Entry",
      bureau: bureau || null,
      recordedAt: safeRecordedAt,
      factors: factors || null,
      createdAt: new Date().toISOString(),
    });

    // Notify on significant score change (±10 pts)
    if (sorted.length > 0) {
      const lastScore = sorted[0].data.score as number;
      const delta = score - lastScore;
      if (Math.abs(delta) >= 10) {
        createNotification(user.uid, {
          type: "score_change",
          title: "Credit Score Update",
          message: `Your score ${delta > 0 ? "increased" : "decreased"} by ${Math.abs(delta)} points (${lastScore} → ${score})`,
          actionUrl: "/scores",
        }).catch(() => {});
      }
    }

    return NextResponse.json({ id: docId, score });
  } catch (error) {
    console.error("Failed to add score:", error);
    return NextResponse.json({ error: "Failed to add score" }, { status: 500 });
  }
}

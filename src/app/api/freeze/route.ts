import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore } from "@/lib/db";

const DEFAULT_BUREAU = {
  status: "unknown",
  pin: "",
  frozenAt: null,
  notes: "",
};

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const doc = await firestore.getDoc("creditFreezes", user.uid);

    if (!doc.exists) {
      return NextResponse.json({
        freeze: {
          userId: user.uid,
          equifax: { ...DEFAULT_BUREAU },
          experian: { ...DEFAULT_BUREAU },
          transunion: { ...DEFAULT_BUREAU },
          updatedAt: null,
        },
      });
    }

    return NextResponse.json({ freeze: { ...doc.data } });
  } catch (error) {
    console.error("Failed to fetch freeze status:", error);
    return NextResponse.json({ error: "Failed to fetch freeze status" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { bureau, status, pin, notes } = await req.json();

    const validBureaus = ["equifax", "experian", "transunion"];
    if (!bureau || !validBureaus.includes(bureau)) {
      return NextResponse.json({ error: "bureau must be equifax, experian, or transunion" }, { status: 400 });
    }

    const validStatuses = ["frozen", "unfrozen", "unknown"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: "status must be frozen, unfrozen, or unknown" }, { status: 400 });
    }

    // Get existing doc to merge
    const existing = await firestore.getDoc("creditFreezes", user.uid);
    const existingData = existing.exists ? existing.data : {
      userId: user.uid,
      equifax: { ...DEFAULT_BUREAU },
      experian: { ...DEFAULT_BUREAU },
      transunion: { ...DEFAULT_BUREAU },
    };

    if (pin !== undefined && pin !== "" && !/^\d{1,10}$/.test(String(pin))) {
      return NextResponse.json({ error: "pin must be numeric and at most 10 digits" }, { status: 400 });
    }
    if (notes !== undefined && typeof notes === "string" && notes.length > 500) {
      return NextResponse.json({ error: "notes must be 500 characters or fewer" }, { status: 400 });
    }

    const bureauData = (existingData[bureau] as Record<string, unknown>) || { ...DEFAULT_BUREAU };
    const updatedBureau = {
      ...bureauData,
      status,
      pin: pin !== undefined ? String(pin) : bureauData.pin,
      notes: notes !== undefined ? String(notes).slice(0, 500) : bureauData.notes,
      frozenAt: status === "frozen" && bureauData.status !== "frozen"
        ? new Date().toISOString()
        : status !== "frozen"
        ? null
        : bureauData.frozenAt,
    };

    await firestore.setDoc("creditFreezes", user.uid, {
      ...existingData,
      userId: user.uid,
      [bureau]: updatedBureau,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update freeze status:", error);
    return NextResponse.json({ error: "Failed to update freeze status" }, { status: 500 });
  }
}

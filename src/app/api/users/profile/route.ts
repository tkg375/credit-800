import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { fullName, dateOfBirth, address, address2, city, state, zip, phone, ssnLast4 } = body;

  if (!fullName || !dateOfBirth || !address || !city || !state || !zip) {
    return NextResponse.json(
      { error: "fullName, dateOfBirth, address, city, state, and zip are required" },
      { status: 400 }
    );
  }

  // Validate SSN last 4 if provided
  if (ssnLast4 && !/^\d{4}$/.test(ssnLast4)) {
    return NextResponse.json({ error: "SSN last 4 must be exactly 4 digits" }, { status: 400 });
  }

  await firestore.updateDoc(COLLECTIONS.users, user.uid, {
    fullName,
    dateOfBirth,
    address,
    address2: address2 || "",
    city,
    state,
    zip,
    phone: phone || "",
    ssnLast4: ssnLast4 || "",
    email: user.email || "",
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const allowed = ["monthlyIncome", "fullName", "dateOfBirth", "address", "address2", "city", "state", "zip", "phone"];
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  await firestore.updateDoc(COLLECTIONS.users, user.uid, updates);
  return NextResponse.json({ success: true });
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doc = await firestore.getDoc(COLLECTIONS.users, user.uid);
  if (!doc.exists) {
    return NextResponse.json({ profile: null });
  }

  return NextResponse.json({ profile: doc.data });
}

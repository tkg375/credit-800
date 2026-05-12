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

  if (typeof fullName !== "string" || fullName.trim().length > 100) {
    return NextResponse.json({ error: "fullName must be 100 characters or fewer" }, { status: 400 });
  }
  if (typeof address !== "string" || address.trim().length > 200) {
    return NextResponse.json({ error: "address must be 200 characters or fewer" }, { status: 400 });
  }
  if (typeof city !== "string" || city.trim().length > 100) {
    return NextResponse.json({ error: "city must be 100 characters or fewer" }, { status: 400 });
  }
  if (typeof state !== "string" || !/^[A-Z]{2}$/.test(state.trim().toUpperCase())) {
    return NextResponse.json({ error: "state must be a 2-letter abbreviation" }, { status: 400 });
  }
  if (typeof zip !== "string" || !/^\d{5}(-\d{4})?$/.test(zip.trim())) {
    return NextResponse.json({ error: "zip must be a valid ZIP code" }, { status: 400 });
  }
  if (typeof dateOfBirth !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    return NextResponse.json({ error: "dateOfBirth must be YYYY-MM-DD" }, { status: 400 });
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

  // Validate monthlyIncome if provided
  if (updates.monthlyIncome !== undefined) {
    const income = Number(updates.monthlyIncome);
    if (!isFinite(income) || income < 0 || income > 9_999_999) {
      return NextResponse.json({ error: "monthlyIncome must be between 0 and 9,999,999" }, { status: 400 });
    }
    updates.monthlyIncome = Math.round(income * 100) / 100;
  }

  await firestore.updateDoc(COLLECTIONS.users, user.uid, updates);
  return NextResponse.json({ success: true });
}

// Fields safe to return to the client — never include passwordHash, resetToken,
// twoFactorCode, stripeCustomerId, tokenVersion, or any internal system fields.
const PROFILE_PUBLIC_FIELDS = new Set([
  "fullName", "dateOfBirth", "address", "address2", "city", "state", "zip",
  "phone", "ssnLast4", "email", "monthlyIncome", "createdAt", "updatedAt",
]);

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doc = await firestore.getDoc(COLLECTIONS.users, user.uid);
  if (!doc.exists) {
    return NextResponse.json({ profile: null });
  }

  const profile: Record<string, unknown> = {};
  for (const key of PROFILE_PUBLIC_FIELDS) {
    if (doc.data[key] !== undefined) profile[key] = doc.data[key];
  }

  return NextResponse.json({ profile });
}

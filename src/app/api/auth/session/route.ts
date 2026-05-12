import { NextRequest, NextResponse } from "next/server";

// Legacy session sync route — kept for backward compatibility.
// New auth uses /api/auth/login and /api/auth/register which set the cookie directly.

import { verifyIdToken } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json() as { token?: string };
    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }
    const verified = await verifyIdToken(token);
    if (!verified) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const response = NextResponse.json({ success: true });
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("auth-token", "", { maxAge: 0, path: "/" });
  response.cookies.set("firebase-token", "", { maxAge: 0, path: "/" });
  return response;
}

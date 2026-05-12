import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, signToken, firestore } from "@/lib/db";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7) :
    request.cookies.get("auth-token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await verifyIdToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Issue a fresh token if the current one is within 24 hours of expiry.
  // Always fetch tokenVersion from DB so the refreshed token stays in sync
  // with any password reset that may have incremented it.
  const parts = token.split(".");
  let newToken = token;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    const secsLeft = payload.exp - Math.floor(Date.now() / 1000);
    if (secsLeft < 60 * 60 * 24) {
      const userDoc = await firestore.getDoc("users", user.uid);
      const tokenVersion = (userDoc.data.tokenVersion as number | undefined) ?? 0;
      newToken = await signToken({ uid: user.uid, email: user.email, tokenVersion });
    }
  } catch { /* keep original token */ }

  const response = NextResponse.json({ uid: user.uid, email: user.email, token: newToken });

  if (newToken !== token) {
    response.cookies.set("auth-token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
  }

  return response;
}

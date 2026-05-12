import { cookies, headers } from "next/headers";
import { verifyToken, getLastVerifyError } from "./jwt";
import { firestore } from "./dynamodb";

// Store last auth error for debugging
let lastAuthError = "";

export function getLastAuthError(): string {
  return lastAuthError;
}

async function verifyAndCheckVersion(token: string): Promise<{ uid: string; email: string } | null> {
  const user = await verifyToken(token);
  if (!user) return null;

  // If the token carries a tokenVersion, verify it matches the DB — this
  // lets us instantly invalidate all tokens by incrementing tokenVersion
  // (e.g., on password change or suspicious activity).
  if (user.tokenVersion !== undefined) {
    try {
      const doc = await firestore.getDoc("users", user.uid);
      const dbVersion = (doc.data.tokenVersion as number | undefined) ?? 0;
      if (user.tokenVersion !== dbVersion) {
        lastAuthError = "token version mismatch — session invalidated";
        return null;
      }
    } catch (dbErr) {
      // Fail open to avoid locking users out during DB outages, but always log
      console.error("[auth] tokenVersion DB check failed — failing open:", dbErr);
    }
  }

  return { uid: user.uid, email: user.email };
}

export async function getAuthUser(): Promise<{
  uid: string;
  email: string;
} | null> {
  lastAuthError = "";

  // First check Authorization header
  const headerStore = await headers();
  const authHeader = headerStore.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const user = await verifyAndCheckVersion(token);
    if (user) return user;
    lastAuthError = lastAuthError || getLastVerifyError() || "token verification failed";
    return null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    lastAuthError = "no token in header or cookie";
    return null;
  }

  const user = await verifyAndCheckVersion(token);
  if (!user) {
    lastAuthError = lastAuthError || getLastVerifyError() || "cookie token verification failed";
  }
  return user;
}

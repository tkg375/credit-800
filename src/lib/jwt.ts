// HMAC-SHA256 JWT implementation — signs and verifies auth tokens

let lastVerifyError = "";

export function getLastVerifyError(): string {
  return lastVerifyError;
}

function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (str.length % 4)) % 4);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signToken(payload: { uid: string; email: string; tokenVersion?: number; pending2FA?: boolean }): Promise<string> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET env var is not set");

  const header = base64urlEncode(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = base64urlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
      })
    )
  );
  const signing = `${header}.${body}`;
  const key = await getHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signing));
  return `${signing}.${base64urlEncode(new Uint8Array(sig))}`;
}

export async function verifyToken(
  token: string
): Promise<{ uid: string; email: string; tokenVersion?: number; pending2FA?: boolean } | null> {
  lastVerifyError = "";
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    lastVerifyError = "JWT_SECRET not configured";
    return null;
  }

  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      lastVerifyError = "invalid token format";
      return null;
    }

    const key = await getHmacKey(secret);
    const signing = `${parts[0]}.${parts[1]}`;
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlDecode(parts[2]).buffer as ArrayBuffer,
      new TextEncoder().encode(signing)
    );

    if (!valid) {
      lastVerifyError = "signature verification failed";
      return null;
    }

    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(parts[1])));

    if (payload.exp * 1000 < Date.now()) {
      lastVerifyError = "token expired";
      return null;
    }

    return { uid: payload.uid, email: payload.email, tokenVersion: payload.tokenVersion, pending2FA: payload.pending2FA };
  } catch (err) {
    lastVerifyError = `exception: ${err instanceof Error ? err.message : String(err)}`;
    return null;
  }
}

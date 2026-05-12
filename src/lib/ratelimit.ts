import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

// ── DynamoDB client (reuses same credentials as the rest of the app) ──────────

function getClient(): DynamoDBDocumentClient {
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

  const raw = new DynamoDBClient({
    region: process.env.S3_REGION || process.env.AWS_REGION || "us-east-1",
    ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
  });
  return DynamoDBDocumentClient.from(raw);
}

let _client: DynamoDBDocumentClient | null = null;
function db() {
  if (!_client) _client = getClient();
  return _client;
}

const TABLE = `${process.env.DYNAMODB_TABLE_PREFIX || "credit800"}-ratelimits`;

// ── Fixed-window rate limiter backed by DynamoDB ──────────────────────────────
// Each window gets its own item (key = "<prefix>:<identifier>:<bucket>").
// DynamoDB TTL auto-deletes expired items — no cleanup needed.

interface LimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

function makeLimiter(prefix: string, maxRequests: number, windowMs: number) {
  return {
    async limit(identifier: string): Promise<LimitResult> {
      const bucket = Math.floor(Date.now() / windowMs);
      const id = `${prefix}:${identifier}:${bucket}`;
      const resetTs = Math.floor((bucket + 1) * windowMs / 1000); // Unix seconds
      const ttl = resetTs + 60; // keep 60s past expiry for safety

      try {
        const result = await db().send(new UpdateCommand({
          TableName: TABLE,
          Key: { id },
          UpdateExpression: "ADD #count :inc SET #ttl = if_not_exists(#ttl, :ttl)",
          ExpressionAttributeNames: { "#count": "count", "#ttl": "ttl" },
          ExpressionAttributeValues: { ":inc": 1, ":ttl": ttl },
          ReturnValues: "ALL_NEW",
        }));

        const count = (result.Attributes?.count as number) ?? 1;
        const success = count <= maxRequests;
        return { success, limit: maxRequests, remaining: Math.max(0, maxRequests - count), reset: resetTs };
      } catch {
        // Fail open — if DynamoDB is unreachable, don't block users
        return { success: true, limit: maxRequests, remaining: maxRequests, reset: resetTs };
      }
    },
  };
}

// ── Limiter definitions ───────────────────────────────────────────────────────

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function createLimiters() {
  return {
    free:            makeLimiter("rl:upload:free",  1,  DAY),
    pro:             makeLimiter("rl:upload:pro",   3,  DAY),
    forgotPassword:  makeLimiter("rl:forgot",       5,  HOUR),
    register:        makeLimiter("rl:register",     10, HOUR),
    login:           makeLimiter("rl:login",        20, 15 * MINUTE),
    contact:         makeLimiter("rl:contact",      5,  HOUR),
    twoFactorVerify: makeLimiter("rl:2fa",          5,  10 * MINUTE),
    autopilotLock:   makeLimiter("rl:autopilot",    1,  5 * MINUTE),
  };
}

let _limiters: ReturnType<typeof createLimiters> | null = null;

export function getLimiters() {
  if (!_limiters) _limiters = createLimiters();
  return _limiters;
}

/** Returns the best identifier for rate limiting (email preferred, then IP) */
export function getRateLimitKey(req: Request, email?: string): string {
  if (email) return `email:${email.toLowerCase()}`;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return `ip:${ip}`;
}

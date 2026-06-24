import { getCloudflareContext } from "@opennextjs/cloudflare";

async function getDb(): Promise<D1Database> {
  const ctx = await getCloudflareContext({ async: true });
  return (ctx.env as { DB: D1Database }).DB;
}

interface LimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

const IS_DEV = process.env.NEXT_PUBLIC_APP_URL?.includes("workers.dev") ?? false;

function makeLimiter(prefix: string, maxRequests: number, windowMs: number) {
  return {
    async limit(identifier: string): Promise<LimitResult> {
      if (IS_DEV) return { success: true, limit: maxRequests, remaining: maxRequests, reset: 0 };
      const bucket = Math.floor(Date.now() / windowMs);
      const id = `${prefix}:${identifier}:${bucket}`;
      const resetTs = Math.floor(((bucket + 1) * windowMs) / 1000);

      try {
        const db = await getDb();
        await db
          .prepare(
            `INSERT INTO ratelimits (id, count, expires_at) VALUES (?, 1, ?)
             ON CONFLICT(id) DO UPDATE SET count = count + 1`
          )
          .bind(id, resetTs + 60)
          .run();

        const row = await db
          .prepare("SELECT count FROM ratelimits WHERE id = ?")
          .bind(id)
          .first<{ count: number }>();

        const count = row?.count ?? 1;
        return {
          success: count <= maxRequests,
          limit: maxRequests,
          remaining: Math.max(0, maxRequests - count),
          reset: resetTs,
        };
      } catch (err) {
        console.error("[ratelimit] D1 unavailable — failing open:", err);
        return { success: true, limit: maxRequests, remaining: maxRequests, reset: resetTs };
      }
    },
  };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function createLimiters() {
  return {
    free:            makeLimiter("rl:upload:free",  1,  DAY),
    pro:             makeLimiter("rl:upload:pro",   3,  DAY),
    forgotPassword:  makeLimiter("rl:forgot",       5,  HOUR),
    register:        makeLimiter("rl:register",     10, HOUR),
    autopilotSignup: makeLimiter("rl:ap:signup",    10, HOUR),
    login:           makeLimiter("rl:login",        20, 15 * MINUTE),
    contact:         makeLimiter("rl:contact",      5,  HOUR),
    autopilotNotify: makeLimiter("rl:apnotify",     5,  HOUR),
    twoFactorVerify: makeLimiter("rl:2fa",          5,  10 * MINUTE),
    autopilotLock:   makeLimiter("rl:autopilot",    1,  5 * MINUTE),
    letterAnalyze:   makeLimiter("rl:letter",       10, DAY),
    scoreImport:     makeLimiter("rl:scoreimport",  10, DAY),
    reportAnalyze:   makeLimiter("rl:analyze",      5,  DAY),
    mailLetter:      makeLimiter("rl:mail",         10, DAY),
    planGenerate:    makeLimiter("rl:plan",         20, DAY),
    escalationEmail: makeLimiter("rl:escalation",   5,  DAY),
    simulateData:    makeLimiter("rl:simulate",     5,  DAY),
    escalate:        makeLimiter("rl:escalate",     5,  DAY),
    hibp:            makeLimiter("rl:hibp",         20, DAY),
  };
}

let _limiters: ReturnType<typeof createLimiters> | null = null;

export function getLimiters() {
  if (!_limiters) _limiters = createLimiters();
  return _limiters;
}

export function getRateLimitKey(req: Request, email?: string): string {
  if (email) return `email:${email.toLowerCase()}`;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return `ip:${ip}`;
}

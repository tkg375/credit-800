import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

/** A no-op limiter used when Redis is not configured — always allows. */
const noopLimiter = {
  limit: async (_key: string) => ({ success: true, limit: 0, remaining: 0, reset: 0, pending: Promise.resolve() }),
};

function createLimiters() {
  const redis = getRedis();
  if (!redis) {
    return {
      free: noopLimiter, pro: noopLimiter, forgotPassword: noopLimiter,
      register: noopLimiter, login: noopLimiter, contact: noopLimiter,
      twoFactorVerify: noopLimiter, autopilotLock: noopLimiter,
    };
  }
  return {
    // Upload quotas
    free: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, "24 h"),
      prefix: "rl:upload:free",
    }),
    pro: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "24 h"),
      prefix: "rl:upload:pro",
    }),
    // Auth endpoints — stricter limits
    forgotPassword: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 h"),
      prefix: "rl:forgot-password",
    }),
    register: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 h"),
      prefix: "rl:register",
    }),
    login: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "15 m"),
      prefix: "rl:login",
    }),
    // Contact form
    contact: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 h"),
      prefix: "rl:contact",
    }),
    // 2FA verify — lock after 5 attempts per OTP window
    twoFactorVerify: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "10 m"),
      prefix: "rl:2fa-verify",
    }),
    // Autopilot — one concurrent run per user enforced via Redis lock
    autopilotLock: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, "5 m"),
      prefix: "rl:autopilot",
    }),
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

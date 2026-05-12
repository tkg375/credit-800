import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

function createLimiters() {
  const redis = getRedis();
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

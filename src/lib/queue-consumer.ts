import { injectDb } from "./dynamodb";
import { injectBucket } from "./s3";
import { injectAi, analyzeQueuedReport } from "./credit-analyzer";

type AiBinding = { run: (model: string, inputs: Record<string, unknown>) => Promise<unknown> };

interface QueueEnv {
  DB: D1Database;
  CREDIT_REPORTS_BUCKET: R2Bucket;
  AI: AiBinding;
  [key: string]: unknown;
}

interface AnalysisMessage {
  reportId: string;
}

interface QueueBatch {
  messages: { body: AnalysisMessage; ack: () => void; retry: () => void }[];
}

/**
 * Cloudflare Queue consumer for credit-report analysis. Runs outside the Next.js
 * request context, so it wires up the bindings the analysis code expects:
 *  - copies string env vars onto process.env (JWT_SECRET, S3_*, R2_*, etc.)
 *  - injects the D1, R2 and AI bindings used by the analysis libs
 * Configured with max_concurrency = 1 so reports process one at a time, in order.
 */
export async function handleAnalysisQueue(batch: QueueBatch, env: QueueEnv): Promise<void> {
  // Make string secrets/vars available to code that reads process.env
  for (const [k, v] of Object.entries(env)) {
    if (typeof v === "string") {
      try { process.env[k] = v; } catch { /* ignore read-only */ }
    }
  }
  injectDb(env.DB);
  injectBucket(env.CREDIT_REPORTS_BUCKET);
  injectAi(env.AI);

  for (const message of batch.messages) {
    try {
      await analyzeQueuedReport(message.body.reportId);
      message.ack();
    } catch (err) {
      console.error("[queue] analysis failed, will retry:", err);
      message.retry();
    }
  }
}

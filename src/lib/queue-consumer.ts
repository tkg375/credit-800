import { injectDb } from "./dynamodb";
import { injectBucket } from "./s3";
import { analyzeQueuedReport } from "./credit-analyzer";

interface QueueEnv {
  DB: D1Database;
  CREDIT_REPORTS_BUCKET: R2Bucket;
  [key: string]: unknown;
}

interface AnalysisMessage {
  reportId: string;
}

interface QueueBatch {
  messages: { body: AnalysisMessage; ack: () => void; retry: () => void }[];
}

/**
 * Cloudflare Queue consumer for credit-report analysis.
 * Copies string env vars onto process.env (for OPENAI_API_KEY, JWT_SECRET, etc.)
 * then runs analysis one report at a time (max_concurrency = 1).
 */
export async function handleAnalysisQueue(batch: QueueBatch, env: QueueEnv): Promise<void> {
  for (const [k, v] of Object.entries(env)) {
    if (typeof v === "string") {
      try { process.env[k] = v; } catch { /* ignore read-only */ }
    }
  }
  injectDb(env.DB);
  injectBucket(env.CREDIT_REPORTS_BUCKET);

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

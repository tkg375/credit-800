// Custom worker entry: wraps the OpenNext-generated worker and adds a Cloudflare
// Queue consumer for background credit-report analysis. The fetch handler and Durable
// Objects are delegated to OpenNext unchanged.
import openNextWorker, {
  DOQueueHandler as _DOQueueHandler,
  DOShardedTagCache as _DOShardedTagCache,
  BucketCachePurge as _BucketCachePurge,
} from "./.open-next/worker.js";
import { handleAnalysisQueue } from "./src/lib/queue-consumer";

// Re-export the Durable Objects OpenNext relies on
export const DOQueueHandler = _DOQueueHandler;
export const DOShardedTagCache = _DOShardedTagCache;
export const BucketCachePurge = _BucketCachePurge;

export default {
  fetch: openNextWorker.fetch,
  async queue(batch: unknown, env: unknown) {
    await handleAnalysisQueue(batch as never, env as never);
  },
};

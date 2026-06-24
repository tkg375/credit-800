// Minimal Cloudflare Workers type declarations (avoids Response.json() type conflicts)

interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<D1Result>;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

interface R2Object {
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
  key: string;
  size: number;
}

interface R2PutOptions {
  httpMetadata?: { contentType?: string };
}

interface R2Bucket {
  get(key: string): Promise<R2Object | null>;
  put(key: string, value: ArrayBuffer | ArrayBufferView | string | ReadableStream, options?: R2PutOptions): Promise<R2Object>;
  delete(key: string): Promise<void>;
}

interface Fetcher {
  fetch(request: Request | string, init?: RequestInit): Promise<Response>;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface CloudflareEnv {
  ASSETS: Fetcher;
  DB: D1Database;
  CREDIT_REPORTS_BUCKET: R2Bucket;
  AI: Ai;
  ANALYSIS_QUEUE: Queue;
  STRIPE_SECRET_KEY: string;
  STRIPE_PRO_PRICE_ID: string;
  STRIPE_AUTOPILOT_PRICE_ID: string;
  STRIPE_WEBHOOK_SECRET: string;
  JWT_SECRET: string;
  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;
  S3_REGION: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
  POSTGRID_API_KEY: string;
  OWNER_NOTIFICATION_EMAIL: string;
  ADMIN_EMAIL: string;
  NEXT_PUBLIC_APP_URL: string;
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: string;
  LAMBDA_FUNCTION_NAME: string;
}

declare module "@opennextjs/cloudflare" {
  export function defineCloudflareConfig(config?: unknown): unknown;
  export function getCloudflareContext<T = CloudflareEnv>(options?: {
    async?: boolean;
  }): Promise<{ env: T; ctx: ExecutionContext }>;
}

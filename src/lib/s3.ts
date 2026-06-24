import { getCloudflareContext } from "@opennextjs/cloudflare";
import { AwsClient } from "aws4fetch";

let _injectedBucket: R2Bucket | null = null;
export function injectBucket(bucket: R2Bucket) { _injectedBucket = bucket; }

async function getBucket(): Promise<R2Bucket> {
  if (_injectedBucket) return _injectedBucket;
  const ctx = await getCloudflareContext({ async: true });
  return (ctx.env as { CREDIT_REPORTS_BUCKET: R2Bucket }).CREDIT_REPORTS_BUCKET;
}

// For presigned URLs we use the R2 S3-compatible API endpoint with aws4fetch
function getR2Client() {
  return new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    region: "auto",
    service: "s3",
  });
}

const ACCOUNT_ID = "3869ffbbf462deee55a7a0b1880ffb84";
// Bucket differs per environment (dev vs prod); falls back to prod.
function bucketName() {
  return process.env.R2_BUCKET_NAME || "credit-800-files";
}

function r2Url(key: string) {
  return `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${bucketName()}/${key}`;
}

/** Get a pre-signed URL for a client to PUT directly to R2 (5 min expiry) */
export async function getUploadUrl(key: string, contentType = "application/pdf"): Promise<string> {
  const client = getR2Client();
  const url = new URL(r2Url(key));
  url.searchParams.set("X-Amz-Expires", "300");
  const signed = await client.sign(
    new Request(url.toString(), { method: "PUT", headers: { "Content-Type": contentType } }),
    { aws: { signQuery: true } }
  );
  return signed.url;
}

/** Get a pre-signed URL for downloading an object (5 min expiry) */
export async function getDownloadUrl(key: string): Promise<string> {
  const client = getR2Client();
  const url = new URL(r2Url(key));
  url.searchParams.set("X-Amz-Expires", "300");
  const signed = await client.sign(
    new Request(url.toString(), { method: "GET" }),
    { aws: { signQuery: true } }
  );
  return signed.url;
}

/** Read an object's bytes from R2 server-side */
export async function getObject(key: string): Promise<Uint8Array> {
  const bucket = await getBucket();
  const obj = await bucket.get(key);
  if (!obj) throw new Error(`R2 object not found: ${key}`);
  return new Uint8Array(await obj.arrayBuffer());
}

/** Upload bytes to R2 server-side */
export async function putObject(
  key: string,
  data: Buffer | Uint8Array,
  contentType = "application/pdf"
): Promise<void> {
  const bucket = await getBucket();
  await bucket.put(key, data, { httpMetadata: { contentType } });
}

/** Delete an object from R2 */
export async function deleteObject(key: string): Promise<void> {
  const bucket = await getBucket();
  await bucket.delete(key);
}

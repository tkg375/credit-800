/**
 * Migration script: S3 → R2
 * Gets file keys from D1 (creditReports collection) and copies each to R2.
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const S3_BUCKET   = "ai-credit-repair-080772";
const R2_BUCKET   = "credit-800-files";
const ACCOUNT_ID  = "f5e2c8538c1cd871fc7dd9e29ced4303";
const D1_DB_ID    = "2cc6b991-4d82-4bb3-b0f3-543612519650";
const AWS_KEY     = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET  = process.env.AWS_SECRET_ACCESS_KEY;
const R2_KEY      = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET   = process.env.R2_SECRET_ACCESS_KEY;
const CF_TOKEN    = process.env.CLOUDFLARE_API_TOKEN;

if (!CF_TOKEN) {
  console.error("Set CLOUDFLARE_API_TOKEN env var (needs D1 read permission).");
  process.exit(1);
}

// ── Get all s3Keys from D1 ────────────────────────────────────────────────────
async function d1Query(sql) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${D1_DB_ID}/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql }),
    }
  );
  const json = await res.json();
  if (!json.success) throw new Error(JSON.stringify(json.errors));
  return json.result[0].results;
}

const rows = await d1Query(
  `SELECT json_extract(data, '$.s3Key') as key FROM documents WHERE collection = 'creditReports' AND json_extract(data, '$.s3Key') IS NOT NULL`
);

const keys = [...new Set(rows.map(r => r.key).filter(Boolean))];
console.log(`Found ${keys.length} files to migrate from S3 → R2\n`);

if (keys.length === 0) {
  console.log("Nothing to migrate.");
  process.exit(0);
}

// ── S3 and R2 clients ─────────────────────────────────────────────────────────
const s3 = new S3Client({
  region: "us-east-1",
  credentials: { accessKeyId: AWS_KEY, secretAccessKey: AWS_SECRET },
});

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_KEY, secretAccessKey: R2_SECRET },
});

let done = 0, failed = 0;
for (const key of keys) {
  try {
    const s3Res = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    const chunks = [];
    for await (const chunk of s3Res.Body) chunks.push(chunk);
    const body = Buffer.concat(chunks);

    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: s3Res.ContentType || "application/pdf",
    }));

    done++;
    console.log(`  ✓ ${key} (${(body.length / 1024).toFixed(0)} KB)`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${key}: ${err.message}`);
  }
}

console.log(`\n✅ Done — ${done} copied, ${failed} failed.`);

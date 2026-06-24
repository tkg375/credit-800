/**
 * Migration script: DynamoDB → Cloudflare D1
 * Scans all DynamoDB tables and writes a SQL file, then executes via wrangler.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { writeFileSync } from "fs";
import { execSync } from "child_process";

const AWS_REGION     = "us-east-1";
const AWS_KEY        = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET     = process.env.AWS_SECRET_ACCESS_KEY;
const TABLE_PREFIX   = "credit800";
const CF_ACCOUNT_ID  = "f5e2c8538c1cd871fc7dd9e29ced4303";
const DB_NAME        = "credit-800-db";

const COLLECTIONS = [
  "users", "creditReports", "reportItems", "disputes", "creditScores",
  "actionPlans", "reportChanges", "notifications", "portfolioAccounts",
  "portfolioSnapshots", "plaidItems", "budgetEntries", "goals",
  "creditFreezes", "creditorLetters", "autopilotRuns", "fcraConsents",
  "auditLogs", "autopilotWaitlist", "documents", "referrals",
];

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: AWS_REGION,
    credentials: { accessKeyId: AWS_KEY, secretAccessKey: AWS_SECRET },
  }),
  { marshallOptions: { removeUndefinedValues: true } }
);

async function scanAll(tableName) {
  const items = [];
  let lastKey;
  do {
    const res = await dynamo.send(new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastKey,
    }));
    items.push(...(res.Items || []));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

function escape(str) {
  if (str === null || str === undefined) return "NULL";
  return `'${String(str).replace(/'/g, "''")}'`;
}

console.log("Scanning DynamoDB tables...\n");

const sqlLines = [];
let totalRecords = 0;

for (const collection of COLLECTIONS) {
  const tableName = `${TABLE_PREFIX}-${collection}`;
  process.stdout.write(`  ${tableName}... `);

  let items;
  try {
    items = await scanAll(tableName);
  } catch (err) {
    if (err.name === "ResourceNotFoundException") {
      console.log("(not found, skipping)");
      continue;
    }
    console.error(`\nError scanning ${tableName}:`, err.message);
    continue;
  }

  console.log(`${items.length} records`);

  for (const item of items) {
    const id = item.id || crypto.randomUUID();
    const userId = item.userId || null;
    const email = item.email ? item.email.toLowerCase().trim() : null;
    const referralCode = item.referralCode || null;
    const data = JSON.stringify({ ...item, id });

    sqlLines.push(
      `INSERT OR REPLACE INTO documents (id, collection, user_id, email, referral_code, data) VALUES (${escape(id)}, ${escape(collection)}, ${escape(userId)}, ${escape(email)}, ${escape(referralCode)}, ${escape(data)});`
    );
  }

  totalRecords += items.length;
}

if (totalRecords === 0) {
  console.log("\nNo records found to migrate.");
  process.exit(0);
}

const sqlFile = "scripts/migration_data.sql";
writeFileSync(sqlFile, sqlLines.join("\n") + "\n");
console.log(`\nWrote ${totalRecords} records to ${sqlFile}`);
console.log("Uploading to D1...\n");

// Split into chunks of 500 statements to avoid wrangler upload limits
const CHUNK = 500;
let chunkNum = 0;
for (let i = 0; i < sqlLines.length; i += CHUNK) {
  chunkNum++;
  const chunkFile = `scripts/migration_chunk_${chunkNum}.sql`;
  writeFileSync(chunkFile, sqlLines.slice(i, i + CHUNK).join("\n") + "\n");
  process.stdout.write(`  Uploading chunk ${chunkNum}/${Math.ceil(sqlLines.length / CHUNK)}... `);
  try {
    execSync(
      `CLOUDFLARE_ACCOUNT_ID=${CF_ACCOUNT_ID} wrangler d1 execute ${DB_NAME} --remote --file=${chunkFile}`,
      { stdio: "pipe" }
    );
    console.log("done");
  } catch (err) {
    console.error("FAILED:", err.stderr?.toString() || err.message);
    process.exit(1);
  }
}

console.log(`\n✅ Migration complete — ${totalRecords} records migrated to D1.`);

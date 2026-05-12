import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  type ScanCommandInput,
} from "@aws-sdk/lib-dynamodb";

// ── Client ────────────────────────────────────────────────────────────────────

function getClient(): DynamoDBDocumentClient {
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

  const raw = new DynamoDBClient({
    region: process.env.S3_REGION || process.env.AWS_REGION || "us-east-1",
    // Only pass explicit credentials when both values are present.
    // On Amplify Lambda the function's IAM role is used automatically otherwise.
    ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
  });
  return DynamoDBDocumentClient.from(raw, {
    marshallOptions: { removeUndefinedValues: true },
  });
}

let _client: DynamoDBDocumentClient | null = null;
function db(): DynamoDBDocumentClient {
  if (!_client) _client = getClient();
  return _client;
}

// ── Table naming ──────────────────────────────────────────────────────────────

const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || "credit800";

function tbl(collection: string): string {
  return `${TABLE_PREFIX}-${collection}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DocResult {
  exists: boolean;
  id: string;
  data: Record<string, unknown>;
}

export interface QueryResult {
  id: string;
  data: Record<string, unknown>;
}

export interface FirestoreFilter {
  field: string;
  op: string;
  value: unknown;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip passwordHash so it's never accidentally returned to API callers */
function stripSensitive(item: Record<string, unknown>): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, passwordHash: _ph, ...rest } = item as Record<string, unknown>;
  return rest;
}

function buildFilterExpression(
  filters: FirestoreFilter[],
  nameOffset = 0
): {
  filterExpression: string | undefined;
  expressionAttributeNames: Record<string, string>;
  expressionAttributeValues: Record<string, unknown>;
} {
  if (filters.length === 0) {
    return { filterExpression: undefined, expressionAttributeNames: {}, expressionAttributeValues: {} };
  }
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  const parts: string[] = [];

  filters.forEach((f, i) => {
    const nk = `#f${nameOffset + i}`;
    const vk = `:fv${nameOffset + i}`;
    names[nk] = f.field;
    values[vk] = f.value;
    parts.push(`${nk} = ${vk}`);
  });

  return {
    filterExpression: parts.join(" AND "),
    expressionAttributeNames: names,
    expressionAttributeValues: values,
  };
}

// ── Firestore-compatible API ──────────────────────────────────────────────────

export const firestore = {
  async getDoc(collectionName: string, docId: string): Promise<DocResult> {
    const result = await db().send(
      new GetCommand({ TableName: tbl(collectionName), Key: { id: docId } })
    );
    if (!result.Item) {
      return { exists: false, id: docId, data: {} };
    }
    return { exists: true, id: docId, data: stripSensitive(result.Item) };
  },

  async addDoc(collectionName: string, data: Record<string, unknown>): Promise<string> {
    const id = crypto.randomUUID();
    const item = { ...data, id };
    await db().send(new PutCommand({ TableName: tbl(collectionName), Item: item }));
    return id;
  },

  async setDoc(collectionName: string, docId: string, data: Record<string, unknown>): Promise<void> {
    const item = { ...data, id: docId };
    await db().send(new PutCommand({ TableName: tbl(collectionName), Item: item }));
  },

  async updateDoc(
    collectionName: string,
    docId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const entries = Object.entries(data);
    if (entries.length === 0) return;

    const setEntries = entries.filter(([, v]) => v !== null && v !== undefined);
    const removeEntries = entries.filter(([, v]) => v === null);

    const names: Record<string, string> = {};
    const values: Record<string, unknown> = {};
    const setParts: string[] = [];
    const removeParts: string[] = [];

    setEntries.forEach(([k, v], i) => {
      const nk = `#u${i}`;
      const vk = `:uv${i}`;
      names[nk] = k;
      values[vk] = v;
      setParts.push(`${nk} = ${vk}`);
    });

    removeEntries.forEach(([k], i) => {
      const nk = `#r${i}`;
      names[nk] = k;
      removeParts.push(nk);
    });

    let updateExpression = "";
    if (setParts.length > 0) updateExpression += `SET ${setParts.join(", ")}`;
    if (removeParts.length > 0) {
      if (updateExpression) updateExpression += " ";
      updateExpression += `REMOVE ${removeParts.join(", ")}`;
    }

    await db().send(
      new UpdateCommand({
        TableName: tbl(collectionName),
        Key: { id: docId },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: Object.keys(names).length > 0 ? names : undefined,
        ExpressionAttributeValues: Object.keys(values).length > 0 ? values : undefined,
      })
    );
  },

  async deleteDoc(collectionName: string, docId: string): Promise<void> {
    await db().send(new DeleteCommand({ TableName: tbl(collectionName), Key: { id: docId } }));
  },

  async query(
    collectionName: string,
    filters: FirestoreFilter[],
    orderByField?: string,
    orderDirection?: "ASCENDING" | "DESCENDING",
    limitCount?: number
  ): Promise<QueryResult[]> {
    const tableName = tbl(collectionName);
    let items: Record<string, unknown>[] = [];

    // Determine primary filter for GSI lookup
    const userIdFilter = filters.find((f) => f.field === "userId" && f.op === "EQUAL");
    const referralCodeFilter =
      collectionName === "referrals"
        ? filters.find((f) => f.field === "referralCode" && f.op === "EQUAL")
        : undefined;

    if (userIdFilter) {
      // Query the by-userId GSI
      const remainingFilters = filters.filter((f) => f !== userIdFilter);
      const { filterExpression, expressionAttributeNames, expressionAttributeValues } =
        buildFilterExpression(remainingFilters);

      const result = await db().send(
        new QueryCommand({
          TableName: tableName,
          IndexName: "by-userId",
          KeyConditionExpression: "#uid = :uid",
          ExpressionAttributeNames: { "#uid": "userId", ...expressionAttributeNames },
          ExpressionAttributeValues: { ":uid": userIdFilter.value, ...expressionAttributeValues },
          FilterExpression: filterExpression,
        })
      );
      items = (result.Items || []) as Record<string, unknown>[];

      // Handle DynamoDB pagination
      let lastKey = result.LastEvaluatedKey;
      while (lastKey) {
        const next = await db().send(
          new QueryCommand({
            TableName: tableName,
            IndexName: "by-userId",
            KeyConditionExpression: "#uid = :uid",
            ExpressionAttributeNames: { "#uid": "userId", ...expressionAttributeNames },
            ExpressionAttributeValues: { ":uid": userIdFilter.value, ...expressionAttributeValues },
            FilterExpression: filterExpression,
            ExclusiveStartKey: lastKey,
          })
        );
        items = items.concat((next.Items || []) as Record<string, unknown>[]);
        lastKey = next.LastEvaluatedKey;
      }
    } else if (referralCodeFilter) {
      // Query the by-referralCode GSI
      const result = await db().send(
        new QueryCommand({
          TableName: tableName,
          IndexName: "by-referralCode",
          KeyConditionExpression: "#rc = :rc",
          ExpressionAttributeNames: { "#rc": "referralCode" },
          ExpressionAttributeValues: { ":rc": referralCodeFilter.value },
        })
      );
      items = (result.Items || []) as Record<string, unknown>[];
    } else {
      // Scan (empty filters or unrecognized filter field)
      const { filterExpression, expressionAttributeNames, expressionAttributeValues } =
        buildFilterExpression(filters);

      const scanParams: ScanCommandInput = { TableName: tableName };
      if (filterExpression) {
        scanParams.FilterExpression = filterExpression;
        scanParams.ExpressionAttributeNames = expressionAttributeNames;
        scanParams.ExpressionAttributeValues = expressionAttributeValues;
      }

      const result = await db().send(new ScanCommand(scanParams));
      items = (result.Items || []) as Record<string, unknown>[];

      // Paginate through all results
      let lastKey = result.LastEvaluatedKey;
      while (lastKey) {
        const next = await db().send(
          new ScanCommand({ ...scanParams, ExclusiveStartKey: lastKey })
        );
        items = items.concat((next.Items || []) as Record<string, unknown>[]);
        lastKey = next.LastEvaluatedKey;
      }
    }

    // Map to QueryResult, stripping sensitive fields
    let results: QueryResult[] = items.map((item) => ({
      id: item.id as string,
      data: stripSensitive(item),
    }));

    // In-memory sort
    if (orderByField) {
      results.sort((a, b) => {
        const av = a.data[orderByField] ?? "";
        const bv = b.data[orderByField] ?? "";
        if (av < bv) return orderDirection === "DESCENDING" ? 1 : -1;
        if (av > bv) return orderDirection === "DESCENDING" ? -1 : 1;
        return 0;
      });
    }

    // In-memory limit
    if (limitCount) {
      results = results.slice(0, limitCount);
    }

    return results;
  },
};

// ── Special: get user with passwordHash for auth ──────────────────────────────

export interface UserAuthRecord {
  uid: string;
  email: string;
  passwordHash: string;
}

export async function getUserForAuth(email: string): Promise<UserAuthRecord | null> {
  const result = await db().send(
    new QueryCommand({
      TableName: tbl("users"),
      IndexName: "by-email",
      KeyConditionExpression: "#em = :em",
      ExpressionAttributeNames: { "#em": "email" },
      ExpressionAttributeValues: { ":em": email.toLowerCase().trim() },
      Limit: 1,
    })
  );
  const item = result.Items?.[0] as Record<string, unknown> | undefined;
  if (!item) return null;
  return {
    uid: item.id as string,
    email: item.email as string,
    passwordHash: item.passwordHash as string,
  };
}

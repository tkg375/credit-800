import { getCloudflareContext } from "@opennextjs/cloudflare";

// ── D1 client ─────────────────────────────────────────────────────────────────

// Can be pre-set before waitUntil() to avoid re-fetching context after response
let _injectedDb: D1Database | null = null;
export function injectDb(db: D1Database) { _injectedDb = db; }

async function getDb(): Promise<D1Database> {
  if (_injectedDb) return _injectedDb;
  const ctx = await getCloudflareContext({ async: true });
  return (ctx.env as { DB: D1Database }).DB;
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

// ── Sensitive field stripping ─────────────────────────────────────────────────

const SENSITIVE_FIELDS = new Set([
  "id", "passwordHash", "lastBreachCheck",
  "resetToken", "resetTokenExpiry",
  "twoFactorCode", "twoFactorCodeExpiry", "twoFactorAttempts",
  "tokenVersion",
]);

function stripSensitive(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !SENSITIVE_FIELDS.has(k)));
}

// ── Firestore-compatible API ──────────────────────────────────────────────────

export const firestore = {
  async getDoc(collection: string, docId: string): Promise<DocResult> {
    const db = await getDb();
    const row = await db
      .prepare("SELECT data FROM documents WHERE collection = ? AND id = ?")
      .bind(collection, docId)
      .first<{ data: string }>();
    if (!row) return { exists: false, id: docId, data: {} };
    const parsed = JSON.parse(row.data) as Record<string, unknown>;
    return { exists: true, id: docId, data: stripSensitive(parsed) };
  },

  async addDoc(collection: string, data: Record<string, unknown>): Promise<string> {
    const db = await getDb();
    const id = crypto.randomUUID();
    const full: Record<string, unknown> = { ...data, id };
    await db
      .prepare(
        "INSERT INTO documents (id, collection, user_id, email, referral_code, data) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(
        id,
        collection,
        (full.userId as string) ?? null,
        (full.email as string) ?? null,
        (full.referralCode as string) ?? null,
        JSON.stringify(full)
      )
      .run();
    return id;
  },

  async setDoc(collection: string, docId: string, data: Record<string, unknown>): Promise<void> {
    const db = await getDb();
    const full: Record<string, unknown> = { ...data, id: docId };
    await db
      .prepare(
        "INSERT OR REPLACE INTO documents (id, collection, user_id, email, referral_code, data) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(
        docId,
        collection,
        (full.userId as string) ?? null,
        (full.email as string) ?? null,
        (full.referralCode as string) ?? null,
        JSON.stringify(full)
      )
      .run();
  },

  async updateDoc(
    collection: string,
    docId: string,
    updates: Record<string, unknown>
  ): Promise<void> {
    const db = await getDb();
    const row = await db
      .prepare("SELECT data FROM documents WHERE collection = ? AND id = ?")
      .bind(collection, docId)
      .first<{ data: string }>();

    const existing = row ? (JSON.parse(row.data) as Record<string, unknown>) : { id: docId };
    const merged: Record<string, unknown> = { ...existing };

    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === undefined) {
        delete merged[k];
      } else {
        merged[k] = v;
      }
    }

    await db
      .prepare(
        "INSERT OR REPLACE INTO documents (id, collection, user_id, email, referral_code, data) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(
        docId,
        collection,
        (merged.userId as string) ?? null,
        (merged.email as string) ?? null,
        (merged.referralCode as string) ?? null,
        JSON.stringify(merged)
      )
      .run();
  },

  async deleteDoc(collection: string, docId: string): Promise<void> {
    const db = await getDb();
    await db
      .prepare("DELETE FROM documents WHERE collection = ? AND id = ?")
      .bind(collection, docId)
      .run();
  },

  async query(
    collection: string,
    filters: FirestoreFilter[],
    orderByField?: string,
    orderDirection?: "ASCENDING" | "DESCENDING",
    limitCount?: number
  ): Promise<QueryResult[]> {
    const db = await getDb();

    const userIdFilter = filters.find((f) => f.field === "userId" && f.op === "EQUAL");
    const referralCodeFilter =
      collection === "referrals"
        ? filters.find((f) => f.field === "referralCode" && f.op === "EQUAL")
        : undefined;

    let rows: { id: string; data: string }[];

    if (userIdFilter) {
      const result = await db
        .prepare("SELECT id, data FROM documents WHERE collection = ? AND user_id = ?")
        .bind(collection, userIdFilter.value)
        .all<{ id: string; data: string }>();
      rows = result.results;
    } else if (referralCodeFilter) {
      const result = await db
        .prepare("SELECT id, data FROM documents WHERE collection = ? AND referral_code = ?")
        .bind(collection, referralCodeFilter.value)
        .all<{ id: string; data: string }>();
      rows = result.results;
    } else {
      const result = await db
        .prepare("SELECT id, data FROM documents WHERE collection = ?")
        .bind(collection)
        .all<{ id: string; data: string }>();
      rows = result.results;
    }

    // Parse and apply remaining in-memory filters
    const remainingFilters = filters.filter(
      (f) => f !== userIdFilter && f !== referralCodeFilter
    );

    let results: QueryResult[] = rows
      .map((r) => ({
        id: r.id,
        data: stripSensitive(JSON.parse(r.data) as Record<string, unknown>),
      }))
      .filter((r) =>
        remainingFilters.every((f) => {
          const val = r.data[f.field];
          if (f.op === "EQUAL") return val === f.value;
          if (f.op === "NOT_EQUAL") return val !== f.value;
          if (f.op === "GREATER_THAN") return (val as number) > (f.value as number);
          if (f.op === "LESS_THAN") return (val as number) < (f.value as number);
          return true;
        })
      );

    if (orderByField) {
      results.sort((a, b) => {
        const av = a.data[orderByField] ?? "";
        const bv = b.data[orderByField] ?? "";
        if (av < bv) return orderDirection === "DESCENDING" ? 1 : -1;
        if (av > bv) return orderDirection === "DESCENDING" ? -1 : 1;
        return 0;
      });
    }

    if (limitCount) results = results.slice(0, limitCount);
    return results;
  },
};

// ── Special: get user reset token (bypasses stripSensitive) ──────────────────

export interface UserResetRecord {
  uid: string;
  resetToken: string | undefined;
  resetTokenExpiry: string | undefined;
  tokenVersion: number;
}

export async function getUserResetToken(uid: string): Promise<UserResetRecord | null> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT data FROM documents WHERE collection = 'users' AND id = ?")
    .bind(uid)
    .first<{ data: string }>();
  if (!row) return null;
  const item = JSON.parse(row.data) as Record<string, unknown>;
  return {
    uid: item.id as string,
    resetToken: item.resetToken as string | undefined,
    resetTokenExpiry: item.resetTokenExpiry as string | undefined,
    tokenVersion: (item.tokenVersion as number) ?? 0,
  };
}

// ── Special: get user with passwordHash for auth ──────────────────────────────

export interface UserAuthRecord {
  uid: string;
  email: string;
  passwordHash: string;
}

export async function getUserForAuth(email: string): Promise<UserAuthRecord | null> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT data FROM documents WHERE collection = 'users' AND email = ?")
    .bind(email.toLowerCase().trim())
    .first<{ data: string }>();
  if (!row) return null;
  const item = JSON.parse(row.data) as Record<string, unknown>;
  return {
    uid: item.id as string,
    email: item.email as string,
    passwordHash: item.passwordHash as string,
  };
}

// ── Special: get user 2FA fields (bypasses stripSensitive) ───────────────────

export interface User2FARecord {
  uid: string;
  email: string;
  fullName: string;
  twoFactorCode: string | null;
  twoFactorCodeExpiry: string | null;
  twoFactorCodeSentAt: string | null;
  twoFactorAttempts: number;
}

export async function getUserFor2FA(uid: string): Promise<User2FARecord | null> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT data FROM documents WHERE collection = 'users' AND id = ?")
    .bind(uid)
    .first<{ data: string }>();
  if (!row) return null;
  const item = JSON.parse(row.data) as Record<string, unknown>;
  return {
    uid: item.id as string,
    email: item.email as string,
    fullName: (item.fullName as string) || (item.displayName as string) || "",
    twoFactorCode: (item.twoFactorCode as string) ?? null,
    twoFactorCodeExpiry: (item.twoFactorCodeExpiry as string) ?? null,
    twoFactorCodeSentAt: (item.twoFactorCodeSentAt as string) ?? null,
    twoFactorAttempts: (item.twoFactorAttempts as number) ?? 0,
  };
}

// ── Distributed lock (for serializing background work like AI analysis) ────────
// Uses an atomic conditional upsert on the documents table. Returns true if the
// caller acquired the lock. A lock auto-expires after ttlMs so a crashed holder
// never blocks the queue permanently.

export async function acquireLock(name: string, ttlMs: number): Promise<boolean> {
  const db = await getDb();
  const id = `lock:${name}`;
  const now = Date.now();
  const expires = now + ttlMs;
  const res = await db
    .prepare(
      `INSERT INTO documents (id, collection, data) VALUES (?, 'locks', ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data
       WHERE CAST(json_extract(documents.data, '$.expires') AS INTEGER) < ?`
    )
    .bind(id, JSON.stringify({ expires }), now)
    .run();
  const changes = Number((res.meta as { changes?: number } | undefined)?.changes ?? 0);
  return changes > 0;
}

export async function releaseLock(name: string): Promise<void> {
  const db = await getDb();
  await db
    .prepare("UPDATE documents SET data = ? WHERE id = ?")
    .bind(JSON.stringify({ expires: 0 }), `lock:${name}`)
    .run();
}

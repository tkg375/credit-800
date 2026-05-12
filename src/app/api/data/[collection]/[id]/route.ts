import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// Collections accessible by ID via this endpoint, and which fields may be PATCH'd.
const PATCHABLE_FIELDS: Record<string, Set<string>> = {
  disputes:          new Set(["status", "notes", "responseText", "updatedAt"]),
  goals:             new Set(["title", "targetAmount", "targetDate", "status", "progress", "updatedAt"]),
  budgetEntries:     new Set(["amount", "category", "description", "date", "updatedAt"]),
  portfolioAccounts: new Set(["nickname", "notes", "updatedAt"]),
  notifications:     new Set(["read", "updatedAt"]),
  creditFreezes:     new Set(["status", "updatedAt"]),
  documents:         new Set(["name", "category", "updatedAt"]),
};

const READABLE_COLLECTIONS = new Set([
  "disputes", "creditReports", "reportItems", "creditScores", "actionPlans",
  "reportChanges", "notifications", "portfolioAccounts", "portfolioSnapshots",
  "budgetEntries", "goals", "creditFreezes", "creditorLetters", "autopilotRuns",
  "documents", "fcraConsents",
]);

type Params = { params: Promise<{ collection: string; id: string }> };

function isOwner(user: { uid: string }, collection: string, doc: { id: string; data: Record<string, unknown> }): boolean {
  if (collection === "users") return doc.id === user.uid;
  return doc.data.userId === user.uid;
}

// GET /api/data/[collection]/[id]
export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { collection, id } = await params;
  if (!READABLE_COLLECTIONS.has(collection)) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  const doc = await firestore.getDoc(collection, id);
  if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isOwner(user, collection, doc)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ id: doc.id, ...doc.data });
}

// PATCH /api/data/[collection]/[id]
// Body: plain key-value object with fields to update (only whitelisted fields accepted)
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { collection, id } = await params;
  const allowedFields = PATCHABLE_FIELDS[collection];
  if (!allowedFields) {
    return NextResponse.json({ error: "Collection not patchable" }, { status: 404 });
  }

  const doc = await firestore.getDoc(collection, id);
  if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isOwner(user, collection, doc)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rawUpdates = await request.json() as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  for (const key of Object.keys(rawUpdates)) {
    if (allowedFields.has(key)) {
      updates[key] = rawUpdates[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No patchable fields provided" }, { status: 400 });
  }

  await firestore.updateDoc(collection, id, updates);
  return NextResponse.json({ success: true });
}

// DELETE /api/data/[collection]/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { collection, id } = await params;
  const deletableCollections = new Set(["disputes", "goals", "budgetEntries", "portfolioAccounts", "notifications", "documents", "creditFreezes"]);
  if (!deletableCollections.has(collection)) {
    return NextResponse.json({ error: "Collection not deletable" }, { status: 404 });
  }

  const doc = await firestore.getDoc(collection, id);
  if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isOwner(user, collection, doc)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await firestore.deleteDoc(collection, id);
  return NextResponse.json({ success: true });
}

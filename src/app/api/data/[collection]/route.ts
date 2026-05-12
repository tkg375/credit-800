import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore } from "@/lib/db";

export const dynamic = "force-dynamic";

// Collections and filter fields accessible through the generic data endpoint.
// Anything not listed here is rejected — this prevents arbitrary collection/field access.
const ALLOWED_COLLECTIONS: Record<string, Set<string>> = {
  disputes:          new Set(["status", "bureau", "creditorName", "createdAt", "updatedAt", "letterMailed"]),
  creditReports:     new Set(["status", "bureau", "createdAt", "fileName"]),
  reportItems:       new Set(["status", "bureau", "createdAt", "creditorName", "creditReportId", "isDisputable", "disputeStatus", "disputeId"]),
  creditScores:      new Set(["bureau", "source", "recordedAt", "createdAt"]),
  actionPlans:       new Set(["status", "createdAt"]),
  reportChanges:     new Set(["bureau", "createdAt", "changeType"]),
  notifications:     new Set(["read", "createdAt", "type"]),
  portfolioAccounts: new Set(["accountType", "createdAt", "status"]),
  portfolioSnapshots:new Set(["createdAt"]),
  budgetEntries:     new Set(["category", "month", "createdAt"]),
  goals:             new Set(["status", "createdAt"]),
  creditFreezes:     new Set(["bureau", "status", "createdAt"]),
  creditorLetters:   new Set(["letterType", "createdAt", "creditorName"]),
  autopilotRuns:     new Set(["status", "startedAt", "createdAt"]),
  documents:         new Set(["category", "createdAt", "uploadedAt"]),
  fcraConsents:      new Set(["createdAt"]),
  referrals:         new Set(["createdAt", "status"]),
};

const ALLOWED_ORDER_FIELDS = new Set([
  "createdAt", "updatedAt", "uploadedAt", "startedAt", "recordedAt", "month",
]);

// POST /api/data/[collection]
// Query a user-scoped collection. userId filter is added automatically from auth.
// Body: { extraFilters?: [{field, op, value}], orderBy?: string, orderDirection?: "ASCENDING"|"DESCENDING", limit?: number }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { collection } = await params;

  const allowedFields = ALLOWED_COLLECTIONS[collection];
  if (!allowedFields) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({})) as {
    extraFilters?: { field: string; op: string; value: unknown }[];
    orderBy?: string;
    orderDirection?: "ASCENDING" | "DESCENDING";
    limit?: number;
  };

  // Validate extra filter fields
  for (const f of body.extraFilters || []) {
    if (!allowedFields.has(f.field)) {
      return NextResponse.json({ error: `Filter field '${f.field}' is not allowed` }, { status: 400 });
    }
    if (!["EQUAL", "NOT_EQUAL", "GREATER_THAN", "LESS_THAN", "GREATER_THAN_OR_EQUAL", "LESS_THAN_OR_EQUAL"].includes(f.op)) {
      return NextResponse.json({ error: `Invalid filter operator` }, { status: 400 });
    }
  }

  // Validate orderBy
  if (body.orderBy && !ALLOWED_ORDER_FIELDS.has(body.orderBy)) {
    return NextResponse.json({ error: `orderBy field '${body.orderBy}' is not allowed` }, { status: 400 });
  }

  // Clamp limit
  const limit = Math.min(Math.max(1, body.limit ?? 100), 500);

  const filters = [
    { field: "userId", op: "EQUAL", value: user.uid },
    ...(body.extraFilters || []),
  ];

  const docs = await firestore.query(
    collection,
    filters,
    body.orderBy,
    body.orderDirection,
    limit
  );

  return NextResponse.json({ documents: docs.map((d) => ({ id: d.id, ...d.data })) });
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore } from "@/lib/firebase-admin";
import { getPlaidClient } from "@/lib/plaid";
import { snapshotNetWorth } from "@/lib/portfolio-calculator";
import type { AccountType } from "@/lib/portfolio-types";

// Map Plaid account types/subtypes to our AccountType
function mapPlaidType(type: string, subtype: string | null): AccountType {
  const t = type.toLowerCase();
  const s = (subtype ?? "").toLowerCase();
  if (t === "depository") {
    if (s === "savings") return "savings";
    return "checking";
  }
  if (t === "investment") {
    if (s === "401k" || s === "ira" || s === "roth" || s === "403b" || s === "pension") return "retirement";
    return "investment";
  }
  if (t === "credit") return "credit_card";
  if (t === "loan") {
    if (s === "mortgage") return "mortgage";
    if (s === "student") return "student_loan";
    if (s === "auto") return "auto_loan";
    return "other_liability";
  }
  return "other_asset";
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { publicToken, institutionId, institutionName, accounts } = body;

  if (!publicToken || !accounts || !Array.isArray(accounts)) {
    return NextResponse.json({ error: "publicToken and accounts are required" }, { status: 400 });
  }

  if (accounts.length > 50) {
    return NextResponse.json({ error: "Too many accounts" }, { status: 400 });
  }

  try {
    const plaid = getPlaidClient();

    // Exchange public token for access token
    const exchangeResponse = await plaid.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const { access_token: accessToken, item_id: itemId } = exchangeResponse.data;

    const now = new Date().toISOString();

    // Store the access token server-side only
    const plaidItemDocId = await firestore.addDoc("plaidItems", {
      userId: user.uid,
      accessToken,
      itemId,
      institutionId: institutionId ?? "",
      institutionName: institutionName ?? "Unknown",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // Create portfolio account docs for each Plaid account
    const createdAccounts = [];
    for (const acct of accounts) {
      const rawBalance = acct.balances?.current ?? 0;
      const balance = typeof rawBalance === "number" && isFinite(rawBalance) ? rawBalance : 0;
      const accountType = mapPlaidType(acct.type ?? "", acct.subtype ?? null);
      const docData = {
        userId: user.uid,
        name: typeof acct.name === "string" ? acct.name.slice(0, 100) : "Account",
        institution: typeof institutionName === "string" ? institutionName.slice(0, 100) : "Unknown",
        type: accountType,
        source: "plaid",
        balance, // preserve sign — negative = liability
        currency: "USD",
        plaidItemId: plaidItemDocId,
        plaidAccountId: acct.id,
        lastSyncedAt: now,
        isHidden: false,
        createdAt: now,
        updatedAt: now,
      };
      const docId = await firestore.addDoc("portfolioAccounts", docData);
      createdAccounts.push({ id: docId, ...docData });
    }

    await snapshotNetWorth(user.uid);

    return NextResponse.json({ accounts: createdAccounts });
  } catch (err) {
    console.error("Plaid exchange token error:", err);
    return NextResponse.json({ error: "Failed to exchange token" }, { status: 500 });
  }
}

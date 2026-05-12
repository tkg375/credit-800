import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore } from "@/lib/db";
import { getPlaidClient } from "@/lib/plaid";
import { snapshotNetWorth } from "@/lib/portfolio-calculator";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { plaidItemId } = body as { plaidItemId?: string };

  try {
    // Fetch the plaid items to sync
    const itemFilters = [{ field: "userId", op: "EQUAL", value: user.uid }];
    const itemRows = await firestore.query("plaidItems", itemFilters);

    const itemsToSync = plaidItemId
      ? itemRows.filter((r) => r.id === plaidItemId)
      : itemRows;

    if (itemsToSync.length === 0) {
      return NextResponse.json({ synced: 0, accounts: [] });
    }

    const plaid = getPlaidClient();
    const now = new Date().toISOString();
    let syncedCount = 0;
    const updatedAccounts: Record<string, unknown>[] = [];

    for (const item of itemsToSync) {
      const accessToken = item.data.accessToken as string;

      try {
        const balanceResponse = await plaid.accountsBalanceGet({
          access_token: accessToken,
        });

        for (const plaidAcct of balanceResponse.data.accounts) {
          // Find matching portfolioAccounts doc
          const acctRows = await firestore.query("portfolioAccounts", [
            { field: "userId", op: "EQUAL", value: user.uid },
            { field: "plaidAccountId", op: "EQUAL", value: plaidAcct.account_id },
          ]);

          for (const acctRow of acctRows) {
            const newBalance = Math.abs(plaidAcct.balances.current ?? 0);
            await firestore.updateDoc("portfolioAccounts", acctRow.id, {
              balance: newBalance,
              lastSyncedAt: now,
              updatedAt: now,
            });
            updatedAccounts.push({ id: acctRow.id, ...acctRow.data, balance: newBalance, lastSyncedAt: now });
            syncedCount++;
          }
        }

        // Update item status
        await firestore.updateDoc("plaidItems", item.id, {
          status: "active",
          updatedAt: now,
        });
      } catch (itemErr) {
        console.error(`Failed to sync Plaid item ${item.id}:`, itemErr);
        await firestore.updateDoc("plaidItems", item.id, {
          status: "error",
          updatedAt: now,
        });
      }
    }

    await snapshotNetWorth(user.uid);

    return NextResponse.json({ synced: syncedCount, accounts: updatedAccounts });
  } catch (err) {
    console.error("Plaid sync error:", err);
    return NextResponse.json({ error: "Failed to sync accounts" }, { status: 500 });
  }
}

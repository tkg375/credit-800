import { firestore } from "@/lib/db";
import type { PortfolioAccount, AccountType } from "./portfolio-types";

export const ASSET_TYPES: AccountType[] = [
  "checking",
  "savings",
  "investment",
  "retirement",
  "crypto",
  "real_estate",
  "vehicle",
  "other_asset",
];

export function isAsset(type: AccountType): boolean {
  return ASSET_TYPES.includes(type);
}

export function computeTotals(accounts: PortfolioAccount[]): {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
} {
  const visible = accounts.filter((a) => !a.isHidden);
  const totalAssets = visible
    .filter((a) => isAsset(a.type))
    .reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = visible
    .filter((a) => !isAsset(a.type))
    .reduce((s, a) => s + a.balance, 0);
  return { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities };
}

export interface AllocationSlice {
  name: string;
  value: number;
  color: string;
}

const TYPE_COLORS: Record<string, string> = {
  checking: "#14b8a6",
  savings: "#06b6d4",
  investment: "#84cc16",
  retirement: "#f59e0b",
  crypto: "#8b5cf6",
  real_estate: "#ef4444",
  vehicle: "#94a3b8",
  other_asset: "#64748b",
};

const TYPE_LABELS: Record<string, string> = {
  checking: "Checking",
  savings: "Savings",
  investment: "Investments",
  retirement: "Retirement",
  crypto: "Crypto",
  real_estate: "Real Estate",
  vehicle: "Vehicle",
  other_asset: "Other",
};

export function computeAllocation(accounts: PortfolioAccount[]): AllocationSlice[] {
  const map = new Map<string, number>();
  for (const a of accounts) {
    if (!a.isHidden && isAsset(a.type) && a.balance > 0) {
      map.set(a.type, (map.get(a.type) ?? 0) + a.balance);
    }
  }
  return Array.from(map.entries())
    .map(([t, v]) => ({
      name: TYPE_LABELS[t] ?? t,
      value: v,
      color: TYPE_COLORS[t] ?? "#94a3b8",
    }))
    .sort((a, b) => b.value - a.value);
}

export async function snapshotNetWorth(userId: string): Promise<void> {
  const rows = await firestore.query("portfolioAccounts", [
    { field: "userId", op: "EQUAL", value: userId },
    { field: "isHidden", op: "EQUAL", value: false },
  ]);
  const accounts = rows.map((r) => r.data as unknown as PortfolioAccount);
  const { totalAssets, totalLiabilities, netWorth } = computeTotals(accounts);
  const today = new Date().toISOString().split("T")[0];
  await firestore.setDoc("portfolioSnapshots", `${userId}_${today}`, {
    userId,
    date: today,
    totalAssets,
    totalLiabilities,
    netWorth,
    createdAt: new Date().toISOString(),
  });
}

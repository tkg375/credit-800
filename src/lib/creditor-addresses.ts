export interface CreditorAddress {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  department?: string;
  source: "database" | "ai";
  confidence?: "high" | "medium" | "low";
}

// Top debt collectors, debt buyers, and creditors with their dispute mailing addresses
const CREDITOR_DATABASE: Record<string, CreditorAddress> = {
  "midland credit management": {
    name: "Midland Credit Management",
    address: "P.O. Box 60578",
    city: "Los Angeles",
    state: "CA",
    zip: "90060",
    department: "Consumer Dispute Department",
    source: "database",
  },
  "portfolio recovery associates": {
    name: "Portfolio Recovery Associates",
    address: "P.O. Box 12914",
    city: "Norfolk",
    state: "VA",
    zip: "23541",
    department: "Dispute Resolution Department",
    source: "database",
  },
  "lvnv funding": {
    name: "LVNV Funding LLC",
    address: "P.O. Box 25028",
    city: "Greenville",
    state: "SC",
    zip: "29616",
    source: "database",
  },
  "encore capital group": {
    name: "Encore Capital Group",
    address: "P.O. Box 60578",
    city: "Los Angeles",
    state: "CA",
    zip: "90060",
    source: "database",
  },
  "cavalry spv": {
    name: "Cavalry SPV I LLC",
    address: "500 Summit Lake Drive, Suite 400",
    city: "Valhalla",
    state: "NY",
    zip: "10595",
    source: "database",
  },
  "convergent outsourcing": {
    name: "Convergent Outsourcing",
    address: "P.O. Box 9004",
    city: "Renton",
    state: "WA",
    zip: "98057",
    source: "database",
  },
  "ic system": {
    name: "IC System Inc.",
    address: "P.O. Box 64378",
    city: "St. Paul",
    state: "MN",
    zip: "55164",
    department: "Consumer Relations",
    source: "database",
  },
  "gc services": {
    name: "GC Services",
    address: "P.O. Box 550460",
    city: "Jacksonville",
    state: "FL",
    zip: "32255",
    source: "database",
  },
  "national enterprise systems": {
    name: "National Enterprise Systems",
    address: "P.O. Box 36475",
    city: "Cincinnati",
    state: "OH",
    zip: "45236",
    source: "database",
  },
  "enhanced recovery company": {
    name: "Enhanced Recovery Company (ERC)",
    address: "8014 Bayberry Road",
    city: "Jacksonville",
    state: "FL",
    zip: "32256",
    source: "database",
  },
  "transworld systems": {
    name: "Transworld Systems Inc.",
    address: "P.O. Box 17289",
    city: "Plantation",
    state: "FL",
    zip: "33318",
    source: "database",
  },
  "cbe group": {
    name: "CBE Group",
    address: "1309 Technology Parkway",
    city: "Cedar Falls",
    state: "IA",
    zip: "50613",
    source: "database",
  },
  "penn credit": {
    name: "Penn Credit Corporation",
    address: "P.O. Box 530700",
    city: "Atlanta",
    state: "GA",
    zip: "30353",
    source: "database",
  },
  "allied interstate": {
    name: "Allied Interstate LLC",
    address: "P.O. Box 2466",
    city: "Minneapolis",
    state: "MN",
    zip: "55402",
    source: "database",
  },
  "mrs associates": {
    name: "MRS Associates",
    address: "300 Jericho Quadrangle, Suite 130",
    city: "Jericho",
    state: "NY",
    zip: "11753",
    source: "database",
  },
  "cach": {
    name: "CACH LLC",
    address: "P.O. Box 10623",
    city: "Denver",
    state: "CO",
    zip: "80250",
    source: "database",
  },
  "crown asset management": {
    name: "Crown Asset Management LLC",
    address: "P.O. Box 25028",
    city: "Duluth",
    state: "GA",
    zip: "30096",
    source: "database",
  },
  "unifin": {
    name: "Unifin Inc.",
    address: "P.O. Box 33003",
    city: "Detroit",
    state: "MI",
    zip: "48232",
    source: "database",
  },
  "asset acceptance": {
    name: "Asset Acceptance LLC",
    address: "P.O. Box 2036",
    city: "Warren",
    state: "MI",
    zip: "48090",
    source: "database",
  },
  "weltman weinberg reis": {
    name: "Weltman, Weinberg & Reis",
    address: "323 W. Lakeside Avenue, Suite 200",
    city: "Cleveland",
    state: "OH",
    zip: "44113",
    source: "database",
  },
  "medical data systems": {
    name: "Medical Data Systems",
    address: "P.O. Box 4209",
    city: "Lisle",
    state: "IL",
    zip: "60532",
    source: "database",
  },
  "first collection": {
    name: "First Collection Inc.",
    address: "P.O. Box 420527",
    city: "Atlanta",
    state: "GA",
    zip: "30342",
    source: "database",
  },
  "nationwide credit": {
    name: "Nationwide Credit Inc.",
    address: "P.O. Box 6529",
    city: "Columbia",
    state: "SC",
    zip: "29260",
    source: "database",
  },
  "credit corp solutions": {
    name: "Credit Corp Solutions",
    address: "P.O. Box 4044",
    city: "Concord",
    state: "CA",
    zip: "94524",
    source: "database",
  },
  "jefferson capital systems": {
    name: "Jefferson Capital Systems",
    address: "P.O. Box 3043",
    city: "St. Cloud",
    state: "MN",
    zip: "56303",
    source: "database",
  },
  // Major creditors (for goodwill/direct disputes)
  "capital one": {
    name: "Capital One",
    address: "P.O. Box 30285",
    city: "Salt Lake City",
    state: "UT",
    zip: "84130",
    department: "Credit Bureau Dispute Department",
    source: "database",
  },
  "chase": {
    name: "JPMorgan Chase",
    address: "P.O. Box 15298",
    city: "Wilmington",
    state: "DE",
    zip: "19850",
    department: "Credit Bureau Disputes",
    source: "database",
  },
  "jpmorgan chase": {
    name: "JPMorgan Chase",
    address: "P.O. Box 15298",
    city: "Wilmington",
    state: "DE",
    zip: "19850",
    department: "Credit Bureau Disputes",
    source: "database",
  },
  "bank of america": {
    name: "Bank of America",
    address: "P.O. Box 982234",
    city: "El Paso",
    state: "TX",
    zip: "79998",
    department: "Credit Card Disputes",
    source: "database",
  },
  "discover": {
    name: "Discover Financial Services",
    address: "P.O. Box 30943",
    city: "Salt Lake City",
    state: "UT",
    zip: "84130",
    department: "Billing Disputes",
    source: "database",
  },
  "synchrony bank": {
    name: "Synchrony Bank",
    address: "P.O. Box 965264",
    city: "Orlando",
    state: "FL",
    zip: "32896",
    source: "database",
  },
  "wells fargo": {
    name: "Wells Fargo",
    address: "P.O. Box 14517",
    city: "Des Moines",
    state: "IA",
    zip: "50306",
    department: "Credit Bureau Dispute Resolution",
    source: "database",
  },
  "citibank": {
    name: "Citibank",
    address: "P.O. Box 6000",
    city: "Sioux Falls",
    state: "SD",
    zip: "57117",
    department: "Credit Bureau Disputes",
    source: "database",
  },
  "american express": {
    name: "American Express",
    address: "P.O. Box 981540",
    city: "El Paso",
    state: "TX",
    zip: "79998",
    department: "Credit Bureau Unit",
    source: "database",
  },
  // Credit bureaus
  "equifax": {
    name: "Equifax Information Services LLC",
    address: "P.O. Box 740256",
    city: "Atlanta",
    state: "GA",
    zip: "30374",
    department: "Consumer Dispute Center",
    source: "database",
  },
  "experian": {
    name: "Experian",
    address: "P.O. Box 4500",
    city: "Allen",
    state: "TX",
    zip: "75013",
    department: "Consumer Dispute Center",
    source: "database",
  },
  "transunion": {
    name: "TransUnion LLC",
    address: "P.O. Box 2000",
    city: "Chester",
    state: "PA",
    zip: "19016",
    department: "Consumer Dispute Center",
    source: "database",
  },
};

// Common abbreviations and aliases
const ALIASES: Record<string, string> = {
  "pra": "portfolio recovery associates",
  "mcm": "midland credit management",
  "erc": "enhanced recovery company",
  "bofa": "bank of america",
  "boa": "bank of america",
  "amex": "american express",
  "citi": "citibank",
  "jpm": "jpmorgan chase",
  "jp morgan": "jpmorgan chase",
  "cap one": "capital one",
  "tsi": "transworld systems",
  "nci": "nationwide credit",
  "jcs": "jefferson capital systems",
  "cavalry portfolio": "cavalry spv",
  "cavalry portfolio services": "cavalry spv",
  "synchrony": "synchrony bank",
  "discover card": "discover",
  "discover bank": "discover",
  "chase bank": "chase",
  "wells fargo bank": "wells fargo",
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,'"!@#$%^&*()_+=\[\]{}|\\/<>?]/g, "")
    .replace(/\b(llc|inc|corp|corporation|company|co|ltd|lp|group|associates|services|solutions|systems)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function lookupStatic(creditorName: string): CreditorAddress | null {
  const normalized = normalizeName(creditorName);

  // Exact match
  if (CREDITOR_DATABASE[normalized]) {
    return CREDITOR_DATABASE[normalized];
  }

  // Alias match
  if (ALIASES[normalized] && CREDITOR_DATABASE[ALIASES[normalized]]) {
    return CREDITOR_DATABASE[ALIASES[normalized]];
  }

  // Partial match: check if input contains or is contained by a known key
  for (const [key, address] of Object.entries(CREDITOR_DATABASE)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return address;
    }
  }

  // Check aliases with partial matching
  for (const [alias, target] of Object.entries(ALIASES)) {
    if (normalized.includes(alias) || alias.includes(normalized)) {
      return CREDITOR_DATABASE[target] || null;
    }
  }

  return null;
}

export function resolveCreditorAddress(creditorName: string): CreditorAddress | null {
  return lookupStatic(creditorName);
}

/** Async version — checks static DB first, then community-submitted addresses in Firestore */
export async function resolveCreditorAddressAsync(creditorName: string): Promise<CreditorAddress | null> {
  const staticMatch = lookupStatic(creditorName);
  if (staticMatch) return staticMatch;

  try {
    const { firestore } = await import("@/lib/db");
    const normalizedName = creditorName.toLowerCase().trim().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ");
    const doc = await firestore.getDoc("communityAddresses", normalizedName);
    if (doc.exists && doc.data.address) {
      return {
        name: doc.data.name as string || creditorName,
        address: doc.data.address as string,
        city: doc.data.city as string,
        state: doc.data.state as string,
        zip: doc.data.zip as string,
        department: (doc.data.address2 as string) || undefined,
        source: "community" as "database",
        confidence: (doc.data.confidence as "high" | "medium" | "low") || "medium",
      };
    }
  } catch {
    // Non-blocking — fall through to null
  }

  return null;
}

export function formatAddress(addr: CreditorAddress): string {
  const lines: string[] = [];
  if (addr.department) lines.push(addr.department);
  lines.push(addr.address);
  lines.push(`${addr.city}, ${addr.state} ${addr.zip}`);
  return lines.join("\n");
}

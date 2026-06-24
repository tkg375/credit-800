import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { resolveCreditorAddressAsync, formatAddress, type CreditorAddress } from "@/lib/creditor-addresses";

function isBureauDispute(reason: string): boolean {
  const r = reason.toLowerCase();
  return r.includes("credit bureau dispute") || r.includes("fcra section 611") || r.includes("fcra 611");
}

interface UserProfile {
  fullName: string;
  dateOfBirth: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  ssnLast4?: string;
}

function formatUserAddress(profile: UserProfile): string {
  const line2 = profile.address2 ? `\n${profile.address2}` : "";
  return `${profile.address}${line2}\n${profile.city}, ${profile.state} ${profile.zip}`;
}

function generateBureauDisputeLetterContent(params: {
  creditorName: string;
  bureauAddress: CreditorAddress | null;
  bureauName: string;
  accountNumber: string;
  reason: string;
  userName: string;
  balance?: number;
  profile?: UserProfile | null;
}): string {
  const { creditorName, bureauAddress, bureauName, accountNumber, reason, userName, balance, profile } = params;
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const balanceStr = balance !== undefined ? `$${balance.toLocaleString()}` : "Unknown";

  const addressBlock = bureauAddress
    ? `${bureauAddress.name}\n${formatAddress(bureauAddress)}`
    : `${bureauName}\n[Insert Bureau Address]\n[City, State ZIP]`;

  return `${today}

${addressBlock}

Re: Formal Dispute Under FCRA Section 611 — ${creditorName}, Acct #${accountNumber}, Balance: ${balanceStr}

To Whom It May Concern:

I am formally disputing the above account on my credit report pursuant to the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681i (Section 611).

REASON FOR DISPUTE:
${reason}

INVESTIGATION REQUEST:
Under FCRA § 1681i, I request that you: (1) contact ${creditorName} to verify the accuracy of every element of this account; (2) verify the balance, payment history, dates, and account status; (3) verify the account belongs to me; and (4) review any enclosed documentation.

REQUIRED ACTIONS (FCRA § 1681i):
- Complete your investigation within 30 days
- Forward all relevant information to the furnisher
- Provide written results within 5 business days of completion
- Delete or correct any information that cannot be verified
- Notify me of my right to add a consumer statement

If the furnisher cannot verify this information, it must be promptly deleted. Failure to investigate or continued reporting of inaccurate information may result in complaints to the CFPB and legal action under FCRA § 1681n/§ 1681o.

Please send investigation results to the address below.

Sincerely,

${profile?.fullName || userName}
${profile ? formatUserAddress(profile) : "[Your Address]\n[City, State ZIP]"}
${profile?.dateOfBirth ? `DOB: ${profile.dateOfBirth}` : ""}${profile?.ssnLast4 ? `\nSSN (last 4): XXX-XX-${profile.ssnLast4}` : ""}

`;
}

function generateDisputeLetterContent(params: {
  creditorName: string;
  creditorAddress?: CreditorAddress | null;
  accountNumber: string;
  bureau: string;
  reason: string;
  userName: string;
  balance?: number;
  profile?: UserProfile | null;
}): string {
  const { creditorName, creditorAddress, accountNumber, reason, userName, balance, profile } = params;
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const balanceStr = balance !== undefined ? `$${balance.toLocaleString()}` : "Unknown";

  const addressBlock = creditorAddress
    ? formatAddress(creditorAddress)
    : "[Insert Creditor/Collection Agency Address]\n[City, State ZIP]";

  return `${today}

${creditorName}
${addressBlock}

Re: Debt Validation and Dispute — Acct #${accountNumber}, Alleged Balance: ${balanceStr}

To Whom It May Concern:

I am formally disputing the above-referenced account and requesting debt validation pursuant to the Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. § 1692g.

REASON FOR DISPUTE:
${reason}

VALIDATION REQUEST:
Under the FDCPA, please provide: (1) the amount owed and how it was calculated; (2) the name and address of the original creditor; (3) proof you are licensed to collect in my state; (4) a copy of the original signed agreement; (5) complete payment history; (6) proof the statute of limitations has not expired; and (7) proof you own or are authorized to collect this debt.

LEGAL NOTICE:
Until you provide proper validation, you must cease all collection activity, including credit reporting. Under FCRA § 623, reporting information you cannot validate constitutes a violation of federal law.

You have 30 days to respond. If you cannot validate this debt, you must immediately cease collection efforts, remove all negative reporting from Equifax, Experian, and TransUnion, and notify me in writing. Failure to comply may result in complaints to the CFPB, FTC, and my state Attorney General.

Sincerely,

${profile?.fullName || userName}
${profile ? formatUserAddress(profile) : "[Your Address]\n[City, State ZIP]"}
${profile?.dateOfBirth ? `DOB: ${profile.dateOfBirth}` : ""}${profile?.ssnLast4 ? `\nSSN (last 4): XXX-XX-${profile.ssnLast4}` : ""}

`;
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const raw = await req.json();
    const { itemId } = raw;

    // Validate and sanitize user-supplied letter fields
    const creditorName = typeof raw.creditorName === "string"
      ? raw.creditorName.trim().slice(0, 256)
      : "Unknown";
    const accountNumber = typeof raw.accountNumber === "string"
      ? raw.accountNumber.replace(/[^a-zA-Z0-9\-*#\s]/g, "").slice(0, 50)
      : "****";
    const bureau: string = ["Equifax", "Experian", "TransUnion"].includes(raw.bureau)
      ? (raw.bureau as string)
      : "";
    const reason = typeof raw.reason === "string"
      ? raw.reason.trim().replace(/[\x00-\x1f\x7f]/g, " ").slice(0, 1000)
      : undefined;
    const balance =
      typeof raw.balance === "number" && isFinite(raw.balance) && raw.balance >= 0 && raw.balance <= 9_999_999
        ? raw.balance
        : undefined;

    const disputeReason = reason || "Information is inaccurate or unverifiable";
    const bureauDispute = isBureauDispute(disputeReason);

    // Fetch user profile for letter personalization
    let userProfile: UserProfile | null = null;
    try {
      const profileDoc = await firestore.getDoc(COLLECTIONS.users, user.uid);
      if (profileDoc.exists && profileDoc.data.fullName) {
        userProfile = {
          fullName: profileDoc.data.fullName as string,
          dateOfBirth: profileDoc.data.dateOfBirth as string,
          ssnLast4: (profileDoc.data.ssnLast4 as string) || "",
          address: profileDoc.data.address as string,
          address2: (profileDoc.data.address2 as string) || "",
          city: profileDoc.data.city as string,
          state: profileDoc.data.state as string,
          zip: profileDoc.data.zip as string,
        };
      }
    } catch (profileError) {
      console.error("Profile lookup failed (non-blocking):", profileError);
    }

    // Look up address: bureau address for bureau disputes, creditor address otherwise
    let creditorAddress: CreditorAddress | null = null;
    try {
      if (bureauDispute && bureau) {
        creditorAddress = await resolveCreditorAddressAsync(bureau);
      } else {
        creditorAddress = await resolveCreditorAddressAsync(creditorName);
      }
    } catch (addrError) {
      console.error("Address lookup failed (non-blocking):", addrError);
    }

    // Generate the appropriate dispute letter
    let letterContent: string;
    if (bureauDispute) {
      letterContent = generateBureauDisputeLetterContent({
        creditorName,
        bureauAddress: creditorAddress,
        bureauName: bureau || "Credit Bureau",
        accountNumber,
        reason: disputeReason,
        userName: userProfile?.fullName || user.email?.split("@")[0] || "Consumer",
        balance,
        profile: userProfile,
      });
    } else {
      letterContent = generateDisputeLetterContent({
        creditorName,
        creditorAddress,
        accountNumber,
        bureau,
        reason: disputeReason,
        userName: userProfile?.fullName || user.email?.split("@")[0] || "Consumer",
        balance,
        profile: userProfile,
      });
    }

    // Verify item ownership BEFORE creating any records
    if (itemId) {
      if (typeof itemId !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(itemId)) {
        return NextResponse.json({ error: "Invalid itemId" }, { status: 400 });
      }
      const reportItem = await firestore.getDoc(COLLECTIONS.reportItems, itemId);
      if (reportItem.exists && reportItem.data.userId !== user.uid) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Deduplicate: check for an existing active dispute for the same creditor/account/bureau
    const existingDisputes = await firestore.query(COLLECTIONS.disputes, [
      { field: "userId", op: "EQUAL", value: user.uid },
      { field: "creditorName", op: "EQUAL", value: creditorName },
    ]);
    const activeDupe = existingDisputes.find((d) => {
      if (["won", "denied"].includes(d.data.status as string)) return false; // resolved — allow re-dispute
      const sameBureau = !bureau || !d.data.bureau || d.data.bureau === bureau;
      const sameAccount = !accountNumber || accountNumber === "****" || !d.data.accountNumber || d.data.accountNumber === accountNumber;
      return sameBureau && sameAccount;
    });
    if (activeDupe) {
      return NextResponse.json({
        error: "An active dispute already exists for this account.",
        existingDisputeId: activeDupe.id,
      }, { status: 409 });
    }

    // Create dispute record with address metadata
    const disputeId = await firestore.addDoc(COLLECTIONS.disputes, {
      userId: user.uid,
      itemId,
      creditorName,
      bureau,
      reason: disputeReason,
      status: "DRAFT",
      letterContent,
      creditorAddress: creditorAddress
        ? {
            name: creditorAddress.name,
            address: creditorAddress.address,
            city: creditorAddress.city,
            state: creditorAddress.state,
            zip: creditorAddress.zip,
            department: creditorAddress.department || null,
            source: creditorAddress.source,
            confidence: creditorAddress.confidence || null,
          }
        : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Update the report item to mark it's been disputed
    if (itemId) {
      const reportItem = await firestore.getDoc(COLLECTIONS.reportItems, itemId);
      if (reportItem.exists) {
        await firestore.updateDoc(COLLECTIONS.reportItems, itemId, {
          isDisputable: false,
          disputeStatus: "DRAFT",
          disputeId,
        });
      }
    }

    return NextResponse.json({
      disputeId,
      letterContent,
      addressFound: !!creditorAddress,
      addressSource: creditorAddress?.source || null,
      addressConfidence: creditorAddress?.confidence || null,
    });
  } catch (err) {
    console.error("Generate dispute error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

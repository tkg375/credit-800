import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { resolveCreditorAddressAsync, formatAddress, type CreditorAddress } from "@/lib/creditor-addresses";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const TODAY = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

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

function isBureauDispute(reason: string): boolean {
  const r = reason.toLowerCase();
  return r.includes("credit bureau dispute") || r.includes("fcra section 611") || r.includes("fcra 611");
}

async function generateLetterWithAI(params: {
  creditorName: string;
  accountNumber: string;
  balance?: number;
  status: string;
  accountType: string;
  dateOfFirstDelinquency?: string | null;
  bureau: string;
  disputeReason: string;
  isBureauDispute: boolean;
  recipientAddress: string;
  userProfile: UserProfile | null;
  userName: string;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const {
    creditorName, accountNumber, balance, status, accountType,
    dateOfFirstDelinquency, bureau, disputeReason, isBureauDispute: isBureau,
    recipientAddress, userProfile, userName,
  } = params;

  const balanceStr = balance !== undefined ? `$${balance.toLocaleString()}` : "unknown";
  const senderBlock = userProfile
    ? `${userProfile.fullName}\n${formatUserAddress(userProfile)}${userProfile.dateOfBirth ? `\nDate of Birth: ${userProfile.dateOfBirth}` : ""}${userProfile.ssnLast4 ? `\nSSN (last 4): XXX-XX-${userProfile.ssnLast4}` : ""}`
    : `${userName}\n[YOUR ADDRESS]\n[CITY, STATE ZIP]`;

  const sevenYearNote = dateOfFirstDelinquency
    ? (() => {
        const daysOld = (Date.now() - new Date(dateOfFirstDelinquency).getTime()) / 86400000;
        if (daysOld >= 2557) return `IMPORTANT: The date of first delinquency (${dateOfFirstDelinquency}) is over 7 years ago — this item must be deleted under FCRA § 605(a)(4). Make this the primary argument.`;
        if (daysOld >= 2192) return `NOTE: The date of first delinquency (${dateOfFirstDelinquency}) is over 6 years ago — the 7-year reporting limit under FCRA § 605 is approaching. Mention this.`;
        return `Date of first delinquency: ${dateOfFirstDelinquency}`;
      })()
    : "";

  const letterContext = isBureau
    ? `This is a CREDIT BUREAU DISPUTE letter to ${bureau || "a credit bureau"} under FCRA § 611. The consumer is disputing an item reported by ${creditorName} on their ${bureau} credit report.`
    : `This is a DEBT VALIDATION / DISPUTE letter sent directly to ${creditorName} (a ${accountType} ${status.toLowerCase().includes("collection") ? "collection account" : "account"}) under FDCPA § 809 and FCRA § 623.`;

  const prompt = `You are an expert consumer credit attorney. Write a professional, assertive dispute letter for a consumer to send.

TODAY'S DATE: ${TODAY}

LETTER CONTEXT: ${letterContext}

ACCOUNT DETAILS:
- Creditor/Agency: ${creditorName}
- Account Number: ${accountNumber}
- Balance: ${balanceStr}
- Account Type: ${accountType}
- Status: ${status}
- Bureau: ${bureau || "All Bureaus"}
${sevenYearNote ? `- ${sevenYearNote}` : ""}

DISPUTE REASON: ${disputeReason}

RECIPIENT ADDRESS:
${recipientAddress}

SENDER:
${senderBlock}

INSTRUCTIONS:
1. Write the complete letter — ready to sign and mail. No placeholders except [YOUR SIGNATURE].
2. Open with a clear statement of the dispute and the specific account.
3. ${isBureau
  ? "Cite FCRA § 611 demanding a 30-day investigation. If 7-year rule applies, lead with FCRA § 605(a)(4) mandatory deletion. Request that every element of the account be verified including balance, dates, account ownership, and payment history."
  : "Cite FDCPA § 809 demanding full debt validation: original creditor name, signed contract, complete payment history, proof of ownership/chain of title, and collector's state license. Cite FCRA § 623 — inaccurate reporting is illegal."}
4. If the date of first delinquency indicates 7-year expiry or re-aging, make this argument prominently.
5. State consequences: if they cannot verify/validate, the item must be deleted and all collection activity must cease.
6. Keep a firm but professional tone. No threats of violence or inappropriate language.
7. Format as a real business letter with proper spacing. Use actual line breaks between sections.
8. End with a deadline: "Please respond within 30 days of receipt of this letter."

Return ONLY the letter text — no JSON, no markdown, no preamble. Start with the date.`;

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.3,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenAI error ${res.status}: ${JSON.stringify(err)}`);
  }

  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from OpenAI");
  return text.trim();
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const raw = await req.json();
    const { itemId } = raw;

    const creditorName = typeof raw.creditorName === "string" ? raw.creditorName.trim().slice(0, 256) : "Unknown";
    const accountNumber = typeof raw.accountNumber === "string"
      ? raw.accountNumber.replace(/[^a-zA-Z0-9\-*#\s]/g, "").slice(0, 50)
      : "****";
    const bureau: string = ["Equifax", "Experian", "TransUnion"].includes(raw.bureau) ? raw.bureau : "";
    const reason = typeof raw.reason === "string"
      ? raw.reason.trim().replace(/[\x00-\x1f\x7f]/g, " ").slice(0, 1000)
      : undefined;
    const balance = typeof raw.balance === "number" && isFinite(raw.balance) && raw.balance >= 0 && raw.balance <= 9_999_999
      ? raw.balance : undefined;
    const status = typeof raw.status === "string" ? raw.status.slice(0, 50) : "UNKNOWN";
    const accountType = typeof raw.accountType === "string" ? raw.accountType.slice(0, 100) : "Unknown";
    const dateOfFirstDelinquency = typeof raw.dateOfFirstDelinquency === "string" ? raw.dateOfFirstDelinquency : null;

    const disputeReason = reason || "Information is inaccurate or unverifiable";
    const bureauDispute = isBureauDispute(disputeReason);

    // Fetch user profile
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
    } catch (e) {
      console.error("Profile lookup failed:", e);
    }

    // Resolve recipient address
    let creditorAddress: CreditorAddress | null = null;
    try {
      creditorAddress = await resolveCreditorAddressAsync(bureauDispute && bureau ? bureau : creditorName);
    } catch (e) {
      console.error("Address lookup failed:", e);
    }

    const recipientAddress = creditorAddress
      ? `${creditorAddress.name}\n${formatAddress(creditorAddress)}`
      : bureauDispute
        ? `${bureau || "Credit Bureau"}\n[Insert Bureau Address]\n[City, State ZIP]`
        : `${creditorName}\n[Insert Address]\n[City, State ZIP]`;

    const userName = userProfile?.fullName || user.email?.split("@")[0] || "Consumer";

    // Generate letter with GPT-4o
    const letterContent = await generateLetterWithAI({
      creditorName,
      accountNumber,
      balance,
      status,
      accountType,
      dateOfFirstDelinquency,
      bureau,
      disputeReason,
      isBureauDispute: bureauDispute,
      recipientAddress,
      userProfile,
      userName,
    });

    // Verify item ownership
    if (itemId) {
      if (typeof itemId !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(itemId)) {
        return NextResponse.json({ error: "Invalid itemId" }, { status: 400 });
      }
      const reportItem = await firestore.getDoc(COLLECTIONS.reportItems, itemId);
      if (reportItem.exists && reportItem.data.userId !== user.uid) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Deduplicate
    const existingDisputes = await firestore.query(COLLECTIONS.disputes, [
      { field: "userId", op: "EQUAL", value: user.uid },
      { field: "creditorName", op: "EQUAL", value: creditorName },
    ]);
    const activeDupe = existingDisputes.find((d) => {
      if (["won", "denied"].includes(d.data.status as string)) return false;
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

    const disputeId = await firestore.addDoc(COLLECTIONS.disputes, {
      userId: user.uid,
      itemId,
      creditorName,
      bureau,
      reason: disputeReason,
      status: "DRAFT",
      letterContent,
      creditorAddress: creditorAddress ? {
        name: creditorAddress.name,
        address: creditorAddress.address,
        city: creditorAddress.city,
        state: creditorAddress.state,
        zip: creditorAddress.zip,
        department: creditorAddress.department || null,
        source: creditorAddress.source,
        confidence: creditorAddress.confidence || null,
      } : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

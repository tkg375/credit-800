import { firestore, COLLECTIONS } from "@/lib/db";
import { getObject as getR2Object } from "@/lib/s3";
import { AwsClient } from "aws4fetch";

// ── S3 fallback (for PDFs uploaded before R2 migration) ───────────────────────

async function getPdfFromS3(s3Key: string): Promise<Uint8Array> {
  const aws = new AwsClient({
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    region: process.env.S3_REGION || "us-east-1",
    service: "s3",
  });
  const bucket = "ai-credit-repair-080772";
  const res = await aws.fetch(`https://${bucket}.s3.amazonaws.com/${s3Key}`);
  if (!res.ok) throw new Error(`S3 fetch failed: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function getPdf(s3Key: string): Promise<Uint8Array> {
  try {
    return await getR2Object(s3Key);
  } catch {
    return await getPdfFromS3(s3Key);
  }
}

// ── Cloudflare Workers AI analysis ────────────────────────────────────────────

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o";

const TODAY = new Date().toISOString().split("T")[0];

const ANALYSIS_PROMPT = `You are an expert credit report analyst and consumer credit law specialist (FCRA, FDCPA, HIPAA). Today's date is ${TODAY}.

Your task: extract ALL negative/derogatory items from this credit report and generate specific, legally-grounded removal strategies for each.

STEP 1: Identify the credit bureau (Equifax, Experian, or TransUnion).
STEP 2: Find the credit score if displayed.
STEP 3: Extract EVERY account with ANY of these negative indicators:
  - Status: Collection, Charge-off, Charged off, Past due, Delinquent, Late, Written off, Sold, Transferred, Settled, Repossession, Foreclosure, Bankruptcy, Judgment, Tax lien
  - Any late payment notation (30/60/90/120+ days)
  - Derogatory, adverse, or negative remarks
  - Balance owed on collection or charged-off accounts

STEP 4: For EACH negative account, extract AND generate:
  - creditorName: The company name
  - originalCreditor: Original creditor name if this is a collection/sold debt (null if same as creditorName)
  - accountNumber: Full or partial account number
  - accountType: Collection, Credit Card, Auto Loan, Mortgage, Student Loan, Medical, Personal Loan, Utility, etc.
  - balance: Current balance owed (number, no $ or commas; 0 if paid)
  - originalBalance: Original amount if shown (number or null)
  - creditLimit: Credit limit if shown (number or null)
  - status: COLLECTION, CHARGE_OFF, LATE, DELINQUENT, PAST_DUE, SETTLED, WRITTEN_OFF, etc.
  - dateOpened: Date account opened (YYYY-MM-DD or null)
  - dateOfFirstDelinquency: Date of first missed payment / first delinquency (YYYY-MM-DD or null) — critical for 7-year rule
  - lastActivityDate: Most recent activity date (YYYY-MM-DD or null)
  - isDisputable: true if there is any legal or factual basis to dispute
  - disputeReason: Specific reason this item may be inaccurate, unverifiable, or illegal
  - removalStrategies: Array of 2–4 specific strategies (see format below)

REMOVAL STRATEGY RULES — generate strategies specific to THIS item's facts:

  Priority guidance:
  - HIGH: Strong legal basis, high success rate, time-sensitive, or low effort
  - MEDIUM: Moderate success rate or requires negotiation
  - LOW: Difficult but worth attempting; last resort

  Always consider:
  1. STATUTE OF LIMITATIONS on 7-year reporting: If dateOfFirstDelinquency is 6+ years ago, flag as near-expiry (HIGH priority). If 7+ years ago from today (${TODAY}), it must be deleted — cite FCRA § 605(a)(4) and mark as HIGH with ~95% success.
  2. DEBT VALIDATION (FDCPA § 809): For ANY collection or third-party debt buyer, this is always viable. Demand original creditor name, signed contract, chain of title proving ownership, payment history, and proof collector is licensed to collect in the consumer's state.
  3. PAY FOR DELETE: For collections under $2,500, offer 40–60% settlement in exchange for complete deletion. Above $2,500, offer 25–40%. Must be in writing before any payment.
  4. FCRA DISPUTE (§ 611): Always available. Bureau must investigate within 30 days or delete. Cite specific inaccuracies if any (wrong balance, wrong dates, wrong status, re-aged debt, duplicate entry).
  5. GOODWILL DELETION: For late payments on otherwise good accounts with long history, write to original creditor's executive/CEO office citing hardship and perfect history otherwise.
  6. HIPAA VIOLATION: For medical collections, demand proof of HIPAA-compliant authorization for release of PHI to the collection agency. Many medical debts are reportable only with proper authorization.
  7. ORIGINAL CREDITOR vs COLLECTOR: If debt was sold, the original creditor can no longer collect or report — only the current owner can. Any reporting by both is a violation.
  8. RE-AGING: If the date of first delinquency appears to have been reset to a more recent date, this is illegal re-aging under FCRA § 605. Dispute immediately.
  9. IDENTITY/MIXED FILE: If the account does not match the consumer's known accounts, may be identity theft or a mixed credit file — dispute with FTC identity theft affidavit.
  10. ZOMBIE DEBT: If the debt is past the state statute of limitations for collections, any collection attempt (including credit reporting beyond 7 years) may violate FDCPA.

Each strategy object:
{
  "method": "Short strategy name (e.g. 'Debt Validation Letter — FDCPA § 809')",
  "description": "Specific actionable steps for THIS account. Reference the actual creditor name, balance, dates. Explain exactly what to demand or offer and what the likely outcome is.",
  "priority": "HIGH" | "MEDIUM" | "LOW",
  "successRate": "Estimated range, e.g. '65–80%'"
}

Return ONLY this JSON object — no markdown fences, no explanations:
{
  "bureau": "Equifax",
  "score": 650,
  "items": [
    {
      "creditorName": "LVNV Funding LLC",
      "originalCreditor": "Capital One",
      "accountNumber": "****1234",
      "accountType": "Collection",
      "balance": 1847,
      "originalBalance": 2100,
      "creditLimit": null,
      "status": "COLLECTION",
      "dateOpened": "2019-03-01",
      "dateOfFirstDelinquency": "2018-11-15",
      "lastActivityDate": "2021-06-01",
      "isDisputable": true,
      "disputeReason": "Third-party debt buyer must validate ownership with signed contract and chain of title",
      "removalStrategies": [
        {
          "method": "Debt Validation Letter — FDCPA § 809",
          "description": "Send a certified debt validation letter to LVNV Funding LLC demanding: (1) proof they legally own or are authorized to collect this Capital One debt, (2) a copy of the original signed contract, (3) complete payment history from Capital One, (4) proof LVNV is licensed to collect in your state, (5) the exact amount owed and how it was calculated. LVNV is a known debt buyer — if they cannot produce the original contract, they must cease reporting.",
          "priority": "HIGH",
          "successRate": "60–75%"
        },
        {
          "method": "Pay for Delete — Offer 40% Settlement",
          "description": "Contact LVNV Funding LLC and offer $739 (40% of $1,847) as a lump-sum settlement in exchange for complete deletion from all three bureaus. LVNV purchased this debt at pennies on the dollar so any payment above their acquisition cost is profitable. Get the deletion agreement in writing before sending any payment. Use a cashier's check.",
          "priority": "HIGH",
          "successRate": "45–65%"
        },
        {
          "method": "FCRA § 611 Credit Bureau Dispute",
          "description": "File disputes with Equifax, Experian, and TransUnion disputing this collection as unverifiable. Request that LVNV Funding prove ownership and accuracy of the $1,847 balance. Each bureau has 30 days to complete its investigation. If LVNV does not respond to the bureau's verification request in time, the item must be deleted.",
          "priority": "MEDIUM",
          "successRate": "30–45%"
        }
      ]
    }
  ]
}

Here is the credit report text to analyze:
`;

function itemFingerprint(item: Record<string, unknown>): string {
  const name = String(item.creditorName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const acct = String(item.accountNumber || "").replace(/[^a-z0-9]/g, "").slice(-4);
  return `${name}|${acct}`;
}

function parseAnalysisJson(text: string, fallbackBureau: string) {
  let jsonStr = text;
  const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (mdMatch) jsonStr = mdMatch[1];
  const objMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objMatch) jsonStr = objMatch[0];
  const parsed = JSON.parse(jsonStr.trim());

  const detectedBureau = parsed.bureau || fallbackBureau;
  const bureau = detectedBureau.toLowerCase().includes("equifax") ? "Equifax"
    : detectedBureau.toLowerCase().includes("experian") ? "Experian"
    : detectedBureau.toLowerCase().includes("transunion") ? "TransUnion"
    : detectedBureau;

  const ALLOWED_STATUSES = new Set([
    "COLLECTION", "CHARGE_OFF", "LATE", "DELINQUENT", "CURRENT",
    "CLOSED", "PAID", "SETTLED", "WRITTEN_OFF", "PAST_DUE",
    "OPEN", "IN_REPAYMENT", "TRANSFERRED", "DISPUTE",
  ]);
  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  function safeStr(val: unknown, maxLen: number, fallback = ""): string {
    if (typeof val !== "string") return fallback;
    return val.trim().slice(0, maxLen) || fallback;
  }
  function safeMoney(val: unknown): number {
    const n = Number(val);
    if (!isFinite(n) || n < 0 || n > 9_999_999) return 0;
    return Math.round(n * 100) / 100;
  }
  function safeDate(val: unknown): string | null {
    if (!val) return null;
    const s = String(val).trim();
    return ISO_DATE_RE.test(s) ? s : null;
  }

  const items = (Array.isArray(parsed.items) ? parsed.items : []).map((item: Record<string, unknown>) => {
    const rawStatus = String(item.status || "").toUpperCase().replace(/\s+/g, "_");
    const status = ALLOWED_STATUSES.has(rawStatus) ? rawStatus : "UNKNOWN";
    const balance = safeMoney(item.balance);
    const accountType = safeStr(item.accountType, 100, "Unknown");
    return {
      creditorName: safeStr(item.creditorName, 256, "Unknown"),
      originalCreditor: item.originalCreditor ? safeStr(item.originalCreditor, 256) : null,
      accountNumber: safeStr(item.accountNumber, 50, "****").replace(/[^a-zA-Z0-9\-*#\s]/g, ""),
      accountType,
      balance,
      originalBalance: item.originalBalance != null ? safeMoney(item.originalBalance) : null,
      creditLimit: item.creditLimit != null ? safeMoney(item.creditLimit) : null,
      status,
      dateOpened: safeDate(item.dateOpened),
      dateOfFirstDelinquency: safeDate(item.dateOfFirstDelinquency),
      lastActivityDate: safeDate(item.lastActivityDate),
      latePayments: Array.isArray(item.latePayments) ? item.latePayments.slice(0, 24) : [],
      isDisputable: item.isDisputable !== undefined ? Boolean(item.isDisputable) : true,
      disputeReason: safeStr(item.disputeReason, 500, "Request validation of debt"),
      removalStrategies: item.removalStrategies || generateRemovalStrategies(status, accountType, balance, safeDate(item.dateOfFirstDelinquency), safeStr(item.creditorName, 256)),
      bureau: item.bureau || bureau,
    };
  });

  return {
    items,
    creditScore: parsed.score || parsed.creditScore || null,
  };
}

function generateRemovalStrategies(
  status: string,
  accountType: string,
  balance: number,
  dateOfFirstDelinquency?: string | null,
  creditorName?: string,
) {
  const strategies = [];
  const type = accountType.toLowerCase();
  const isCollection = status.includes("COLLECTION") || type.includes("collection");
  const isChargeOff = status.includes("CHARGE") || status.includes("WRITTEN");
  const isMedical = type.includes("medical") || type.includes("hospital") || type.includes("health");
  const isLate = status.includes("LATE") || status.includes("DELINQUENT") || status.includes("PAST");
  const isStudentLoan = type.includes("student");
  const isMortgage = type.includes("mortgage") || type.includes("home");
  const name = creditorName || "the creditor";

  // 7-year rule check
  if (dateOfFirstDelinquency) {
    const daysOld = (Date.now() - new Date(dateOfFirstDelinquency).getTime()) / 86400000;
    if (daysOld >= 2557) { // 7 years
      strategies.push({
        method: "Mandatory Deletion — FCRA § 605(a)(4)",
        description: `This account's date of first delinquency (${dateOfFirstDelinquency}) is over 7 years ago. Under FCRA § 605(a)(4), it must be deleted from your credit report immediately. File disputes with all three bureaus citing the exact delinquency date and demanding deletion. Success rate is near-certain if date is accurate.`,
        priority: "HIGH",
        successRate: "90–98%",
      });
    } else if (daysOld >= 2192) { // 6 years
      strategies.push({
        method: "Near 7-Year Expiration — Monitor for Deletion",
        description: `This account from ${name} first went delinquent on ${dateOfFirstDelinquency} — it will reach the 7-year mandatory deletion date in less than a year. Dispute now citing that the reporting period is nearly expired. Also verify the date of first delinquency hasn't been illegally re-aged.`,
        priority: "HIGH",
        successRate: "60–75%",
      });
    }
  }

  if (isMedical) {
    strategies.push({
      method: "HIPAA Authorization Dispute",
      description: `Demand proof from ${name} that a valid HIPAA authorization was signed allowing the medical provider to release your protected health information (PHI) to the collection agency. If no authorization exists, the collection violates HIPAA and must be removed. Send the dispute to the collection agency and the original medical provider.`,
      priority: "HIGH",
      successRate: "50–70%",
    });
  }

  if (isCollection) {
    strategies.push({
      method: "Debt Validation Letter — FDCPA § 809",
      description: `Send a certified debt validation letter to ${name} demanding: (1) proof they legally own or are authorized to collect this debt, (2) the original signed contract bearing your signature, (3) complete payment history showing how the balance was calculated, (4) proof they are licensed to collect in your state, and (5) the name and address of the original creditor. If ${name} cannot produce these documents, they must cease all collection activity and remove the tradeline.`,
      priority: "HIGH",
      successRate: "60–75%",
    });
  }

  if (isCollection || isChargeOff) {
    const offerPct = balance < 500 ? "100%" : balance < 2500 ? "40–60%" : "25–40%";
    const offerAmt = balance > 0 ? ` ($${Math.round(balance * (balance < 500 ? 1 : balance < 2500 ? 0.5 : 0.33)).toLocaleString()} estimated)` : "";
    strategies.push({
      method: "Pay for Delete Negotiation",
      description: `Offer ${name} ${offerPct} of the $${balance.toLocaleString()} balance${offerAmt} as a lump-sum settlement in exchange for complete deletion from all three credit bureaus. Debt buyers typically purchased this account for 3–10 cents on the dollar, so any settlement is profitable for them. Always get the deletion agreement in writing on company letterhead before sending any payment. Never pay by personal check — use a cashier's check or money order.`,
      priority: balance < 2500 ? "HIGH" : "MEDIUM",
      successRate: "40–60%",
    });
  }

  strategies.push({
    method: "FCRA § 611 Credit Bureau Dispute",
    description: `File formal disputes with Equifax, Experian, and TransUnion disputing this ${name} account. Cite specific inaccuracies if any (incorrect balance, wrong status, re-aged date, duplicate entry, wrong account number). Each bureau must complete its investigation within 30 days and notify ${name}. If ${name} does not respond to the bureau's verification request in time, the item must be deleted.`,
    priority: "HIGH",
    successRate: "30–45%",
  });

  if (isLate && !isCollection && !isChargeOff) {
    strategies.push({
      method: "Goodwill Deletion Letter",
      description: `Write a goodwill letter directly to ${name}'s executive or CEO office (not customer service). Explain any hardship that caused the late payment, emphasize your otherwise positive payment history with them, and request a one-time goodwill deletion as a courtesy. Be specific: name the date and amount of the late payment. This works best with long-standing accounts and a single late payment.`,
      priority: "MEDIUM",
      successRate: "15–30%",
    });
  }

  if (isStudentLoan) {
    strategies.push({
      method: "Loan Rehabilitation / Income-Driven Repayment",
      description: `Federal student loan delinquencies can be removed via loan rehabilitation — make 9 on-time payments in 10 months and the default notation is removed from your credit report. Contact your loan servicer to enroll. For private student loans, negotiate directly with the lender for settlement or payment plan with derogatory mark removal.`,
      priority: "MEDIUM",
      successRate: "70–85% for federal loans",
    });
  }

  if (isMortgage && isLate) {
    strategies.push({
      method: "Mortgage Servicer Goodwill / Loss Mitigation",
      description: `Contact ${name}'s loss mitigation department and request a goodwill deletion for the late payment(s). Mortgage servicers are bound by CFPB mortgage servicing rules and often respond better to formal written requests citing hardship. You can also file a CFPB complaint to escalate — servicers are highly motivated to resolve CFPB complaints quickly.`,
      priority: "MEDIUM",
      successRate: "20–35%",
    });
  }

  return strategies;
}

async function extractPdfText(pdfBytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(pdfBytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

// Credit reports are full of boilerplate (legal disclaimers, inquiry lists, payment
// grids). Groq's free tier caps at ~12k tokens/minute, so we pre-filter the text down
// to lines that are likely to describe accounts and negative items before sending.
const NEGATIVE_KEYWORDS = /\b(collection|charge[\s-]?off|charged off|past due|delinquen|late|written off|write[\s-]?off|repossess|foreclos|bankrupt|judgment|judgement|lien|settled|derogatory|adverse|default|30 days|60 days|90 days|120 days|balance|account|creditor|opened|status)\b/i;

function prefilterReportText(text: string): string {
  const lines = text.split(/\r?\n/);
  const kept: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (NEGATIVE_KEYWORDS.test(line) || /\$\s?\d/.test(line) || /\d{4,}/.test(line)) {
      // include one line of surrounding context on each side for account grouping
      const prev = lines[i - 1]?.trim();
      if (prev && kept[kept.length - 1] !== prev) kept.push(prev);
      kept.push(line);
    }
  }
  const filtered = kept.join("\n");
  // If filtering removed almost everything, fall back to the raw text (truncated)
  return filtered.length > 200 ? filtered : text;
}

async function analyzeWithOpenAI(reportText: string, bureau: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const filtered = prefilterReportText(reportText);
  // GPT-4o supports ~128k context; keep well under to leave room for completion
  const truncated = filtered.slice(0, 80_000);

  let lastErr: unknown;
  for (let attempt = 0; attempt <= 3; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(2000 * Math.pow(2, attempt - 1) + Math.random() * 1000, 30000);
      await new Promise((r) => setTimeout(r, delay));
    }
    try {
      const res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          temperature: 0,
          max_tokens: 8000,
          messages: [{ role: "user", content: ANALYSIS_PROMPT + truncated }],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as Record<string, unknown>;
        if ([429, 500, 502, 503].includes(res.status) && attempt < 3) {
          lastErr = new Error(`OpenAI ${res.status}: ${JSON.stringify(err)}`);
          continue;
        }
        throw new Error(`OpenAI API error ${res.status}: ${JSON.stringify(err)}`);
      }

      const data = await res.json() as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error("No response from OpenAI");
      return parseAnalysisJson(text, bureau);
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`OpenAI failed: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
}

// ── Action plan generation ────────────────────────────────────────────────────

async function generateActionPlan(userId: string, reportId: string) {
  const allItems = await firestore.query(COLLECTIONS.reportItems, [
    { field: "userId", op: "EQUAL", value: userId },
  ]);

  const items = allItems.map((r) => r.data);
  const collections = items.filter((i) => String(i.status).includes("COLLECTION") || String(i.accountType).toLowerCase().includes("collection"));
  const chargeOffs = items.filter((i) => String(i.status).includes("CHARGE") || String(i.status).includes("WRITTEN"));
  const latePayments = items.filter((i) => String(i.status).includes("LATE") || String(i.status).includes("DELINQUENT") || (Array.isArray(i.latePayments) && (i.latePayments as unknown[]).length > 0));
  const medicalCollections = collections.filter((i) => String(i.accountType).toLowerCase().includes("medical"));
  const highUtilization = items.filter((i) => { const bal = Number(i.balance) || 0, lim = Number(i.creditLimit) || 0; return lim > 0 && bal / lim > 0.3; });
  const collectionDebt = collections.reduce((s, i) => s + (Number(i.balance) || 0), 0);

  const scoreItems = await firestore.query(COLLECTIONS.creditScores, [
    { field: "userId", op: "EQUAL", value: userId },
  ]);
  const currentScore = scoreItems.length > 0 ? Number(scoreItems[0].data.score) : null;

  const steps = [];
  let order = 1;

  if (collections.length > 0) {
    const names = collections.slice(0, 3).map((c) => String(c.creditorName)).join(", ");
    steps.push({ order: order++, title: "Dispute Collection Accounts", description: `You have ${collections.length} collection account${collections.length > 1 ? "s" : ""} totaling $${collectionDebt.toLocaleString()} from ${names}${collections.length > 3 ? " and others" : ""}. Send debt validation letters. Collections removal can boost your score 20-40 points.`, category: "DISPUTE", impact: "HIGH", timeframe: "1-2 weeks to send, 30 days for response", completed: false });
  }
  if (medicalCollections.length > 0) {
    const medTotal = medicalCollections.reduce((s, i) => s + (Number(i.balance) || 0), 0);
    steps.push({ order: order++, title: "Challenge Medical Collections via HIPAA", description: `You have ${medicalCollections.length} medical collection${medicalCollections.length > 1 ? "s" : ""} totaling $${medTotal.toLocaleString()}. Request proof of HIPAA authorization.`, category: "DISPUTE", impact: "HIGH", timeframe: "2-4 weeks", completed: false });
  }
  if (chargeOffs.length > 0) {
    const names = chargeOffs.slice(0, 3).map((c) => String(c.creditorName)).join(", ");
    steps.push({ order: order++, title: "Negotiate Charge-Off Removal", description: `You have ${chargeOffs.length} charge-off${chargeOffs.length > 1 ? "s" : ""} from ${names}. Negotiate pay-for-delete.`, category: "DISPUTE", impact: "HIGH", timeframe: "2-6 weeks", completed: false });
  }
  if (highUtilization.length > 0) {
    const details = highUtilization.map((i) => `${i.creditorName} (${Math.round((Number(i.balance) / Number(i.creditLimit)) * 100)}% used)`).join("; ");
    steps.push({ order: order++, title: "Pay Down High Credit Card Balances", description: `Cards with high utilization: ${details}. Pay down to below 30% for an immediate 20-50 point boost.`, category: "UTILIZATION", impact: "HIGH", timeframe: "1-3 months", completed: false });
  }
  if (latePayments.length > 0) {
    const names = latePayments.slice(0, 3).map((c) => String(c.creditorName)).join(", ");
    steps.push({ order: order++, title: "Send Goodwill Letters for Late Payments", description: `You have late payment records on ${latePayments.length} account${latePayments.length > 1 ? "s" : ""} including ${names}.`, category: "DISPUTE", impact: "MEDIUM", timeframe: "2-4 weeks", completed: false });
  }
  steps.push({ order: order++, title: "Set Up Automatic Payments on All Accounts", description: "Enroll every open account in automatic payments. Payment history is 35% of your credit score.", category: "PAYMENT", impact: "HIGH", timeframe: "1 week", completed: false });
  steps.push({ order: order++, title: "File Disputes with All Three Credit Bureaus", description: "File formal disputes with Equifax, Experian, and TransUnion for each inaccurate item.", category: "DISPUTE", impact: "HIGH", timeframe: "30-45 days", completed: false });
  steps.push({ order: order++, title: "Monitor Your Credit Monthly", description: "Pull and upload your credit reports monthly to track progress and catch new errors early.", category: "GENERAL", impact: "LOW", timeframe: "Ongoing", completed: false });

  const summaryParts = [];
  if (currentScore) summaryParts.push(`Your current score is ${currentScore}.`);
  if (collections.length > 0) summaryParts.push(`You have ${collections.length} collection${collections.length > 1 ? "s" : ""} totaling $${collectionDebt.toLocaleString()} that should be disputed immediately.`);
  if (highUtilization.length > 0) summaryParts.push(`${highUtilization.length} card${highUtilization.length > 1 ? "s are" : " is"} above 30% utilization.`);
  summaryParts.push(`Follow these ${steps.length} steps in order for maximum impact.`);

  const title = currentScore ? `Your Path from ${currentScore} to 800` : "Your Path to 800";
  await firestore.addDoc(COLLECTIONS.actionPlans, {
    userId, reportId, title, summary: summaryParts.join(" "), steps, createdAt: new Date().toISOString(),
  });
}

// ── Main analysis function ────────────────────────────────────────────────────

async function notifyAnalysisError(userId: string, reportId: string, message: string) {
  try {
    await firestore.addDoc(COLLECTIONS.notifications, {
      userId,
      type: "warning",
      title: "Credit report analysis failed",
      message,
      read: false,
      createdAt: new Date().toISOString(),
      actionUrl: "/dashboard",
    });
  } catch { /* best-effort */ }
}

export async function analyzeReport(reportId: string, userId: string, s3Key: string, bureau: string) {
  console.log("[analyzer] starting", { reportId, userId, s3Key, bureau });

  try {
    // 1. Fetch PDF (R2 first, S3 fallback)
    const pdfBytes = await getPdf(s3Key);
    const fileSizeMB = pdfBytes.length / (1024 * 1024);
    if (fileSizeMB > 20) {
      const msg = `PDF too large (${fileSizeMB.toFixed(1)}MB). Max 20MB.`;
      await firestore.updateDoc(COLLECTIONS.creditReports, reportId, { status: "ERROR", errorMessage: msg });
      await notifyAnalysisError(userId, reportId, msg);
      return;
    }

    // 2. Extract text from the PDF
    const reportText = await extractPdfText(pdfBytes);
    if (!reportText || reportText.trim().length < 50) {
      const msg = "Could not extract text from PDF. It may be a scanned image — please upload a text-based PDF.";
      await firestore.updateDoc(COLLECTIONS.creditReports, reportId, { status: "ERROR", errorMessage: msg });
      await notifyAnalysisError(userId, reportId, msg);
      return;
    }

    // 3. Run OpenAI analysis
    const analysis = await analyzeWithOpenAI(reportText, bureau);
    console.log(`[analyzer] found ${analysis.items.length} items`);

    // 4. Upsert report items (deduplicate by fingerprint within same bureau)
    const allUserItems = await firestore.query(COLLECTIONS.reportItems, [
      { field: "userId", op: "EQUAL", value: userId },
    ]);
    const bureauNorm = bureau.toLowerCase();
    const sameBureauItems = allUserItems.filter((r) => {
      const b = String(r.data.bureau || "").toLowerCase();
      return b === bureauNorm || bureauNorm === "unknown";
    });

    const newItems = analysis.items.slice(0, 30);
    const newFpSet = new Set(newItems.map((i: Record<string, unknown>) => itemFingerprint(i)));
    const staleItems = sameBureauItems.filter((r) => !newFpSet.has(itemFingerprint(r.data)));
    for (const item of staleItems) await firestore.deleteDoc(COLLECTIONS.reportItems, item.id);

    const existingByFp: Record<string, string> = {};
    for (const r of sameBureauItems) existingByFp[itemFingerprint(r.data)] = r.id;

    for (const item of newItems) {
      const fp = itemFingerprint(item as Record<string, unknown>);
      const existingId = existingByFp[fp];
      if (existingId) {
        await firestore.updateDoc(COLLECTIONS.reportItems, existingId, {
          balance: item.balance, status: item.status, lastActivityDate: item.lastActivityDate,
          latePayments: item.latePayments, isDisputable: item.isDisputable,
          disputeReason: item.disputeReason, removalStrategies: item.removalStrategies,
          creditReportId: reportId, updatedAt: new Date().toISOString(),
        });
      } else {
        await firestore.addDoc(COLLECTIONS.reportItems, {
          userId, creditReportId: reportId, ...item, createdAt: new Date().toISOString(),
        });
      }
    }

    // 5. Save credit score
    if (analysis.creditScore) {
      await firestore.addDoc(COLLECTIONS.creditScores, {
        userId, score: analysis.creditScore, bureau, source: "Credit Report", recordedAt: new Date().toISOString(),
      });
    }

    // 6. Mark report analyzed
    const freshItems = await firestore.query(COLLECTIONS.reportItems, [
      { field: "userId", op: "EQUAL", value: userId },
    ]);
    await firestore.updateDoc(COLLECTIONS.creditReports, reportId, {
      status: "ANALYZED",
      analyzedAt: new Date().toISOString(),
      summary: {
        totalAccounts: freshItems.length,
        negativeItems: freshItems.filter((r) => r.data.isDisputable).length,
        collections: freshItems.filter((r) => String(r.data.status).includes("COLLECTION")).length,
        latePayments: freshItems.filter((r) => String(r.data.status).includes("LATE")).length,
        totalDebt: freshItems.reduce((s, r) => s + (Number(r.data.balance) || 0), 0),
        itemsRemoved: staleItems.length,
      },
    });

    // 7. Regenerate action plan
    await generateActionPlan(userId, reportId);
    const oldPlans = await firestore.query(COLLECTIONS.actionPlans, [
      { field: "userId", op: "EQUAL", value: userId },
    ]);
    for (const plan of oldPlans) {
      if (plan.data.reportId !== reportId) await firestore.deleteDoc(COLLECTIONS.actionPlans, plan.id);
    }

    // 8. Notify the user — in-app notification + email
    const negativeCount = freshItems.filter((r) => r.data.isDisputable).length;
    try {
      await firestore.addDoc(COLLECTIONS.notifications, {
        userId,
        type: "success",
        title: "Credit report analysis complete",
        message: negativeCount > 0
          ? `We found ${negativeCount} disputable item${negativeCount === 1 ? "" : "s"} on your ${bureau} report. Your dispute letters are ready.`
          : `We finished analyzing your ${bureau} report. View your results.`,
        read: false,
        createdAt: new Date().toISOString(),
        actionUrl: "/disputes",
      });
    } catch (notifyErr) {
      console.error("[analyzer] notification failed", notifyErr);
    }

    try {
      const freshReport = await firestore.getDoc(COLLECTIONS.creditReports, reportId);
      if (!freshReport.data.analysisEmailSent) {
        const userDoc = await firestore.getDoc(COLLECTIONS.users, userId);
        const email = userDoc.data.email as string | undefined;
        const name = (userDoc.data.fullName as string) || "";
        if (email) {
          await firestore.updateDoc(COLLECTIONS.creditReports, reportId, { analysisEmailSent: true });
          const { sendAnalysisCompleteEmail } = await import("@/lib/email");
          await sendAnalysisCompleteEmail(email, name, negativeCount, bureau);
        }
      }
    } catch (emailErr) {
      console.error("[analyzer] completion email failed", emailErr);
    }

    console.log("[analyzer] complete", { reportId, itemsFound: analysis.items.length });
  } catch (err) {
    console.error("[analyzer] error", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    await firestore.updateDoc(COLLECTIONS.creditReports, reportId, {
      status: "ERROR",
      errorMessage: errMsg,
    });
    await notifyAnalysisError(userId, reportId, `Analysis failed: ${errMsg.slice(0, 200)}. Please try uploading your report again.`);
  }
}

// ── FCFS analysis queue ───────────────────────────────────────────────────────
// Reports are marked QUEUED on upload and a message is sent to a Cloudflare Queue.
// The queue consumer (configured with max_concurrency = 1) processes one report at a
// time, in order, with a full async budget — no waitUntil time limit. Called from the
// worker's queue() handler after the AI/DB/bucket bindings are injected.

export async function analyzeQueuedReport(reportId: string): Promise<void> {
  const report = await firestore.getDoc(COLLECTIONS.creditReports, reportId);
  if (!report.exists) {
    console.warn("[queue] report not found:", reportId);
    return;
  }
  // Skip if already finished or email already sent (guards against queue retries)
  const status = String(report.data.status);
  if (status === "ANALYZED" || report.data.analysisEmailSent) return;

  const s3Key = String(report.data.s3Key || report.data.blobUrl || "");
  if (!s3Key) {
    await firestore.updateDoc(COLLECTIONS.creditReports, reportId, { status: "ERROR", errorMessage: "PDF file not found for this report" });
    return;
  }

  await firestore.updateDoc(COLLECTIONS.creditReports, reportId, {
    status: "ANALYZING",
    analysisStartedAt: new Date().toISOString(),
  });

  await analyzeReport(
    reportId,
    String(report.data.userId),
    s3Key,
    String(report.data.bureau || "UNKNOWN"),
  );
}

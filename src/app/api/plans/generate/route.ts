import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { reportId } = await request.json();

    const allItems = await firestore.query(COLLECTIONS.reportItems, [
      { field: "userId", op: "EQUAL", value: user.uid },
    ]);
    const items = allItems.map((d) => d.data);

    const collections = items.filter((i) => String(i.status).includes("COLLECTION") || String(i.accountType).toLowerCase().includes("collection"));
    const chargeOffs = items.filter((i) => String(i.status).includes("CHARGE") || String(i.status).includes("WRITTEN"));
    const latePayments = items.filter((i) => String(i.status).includes("LATE") || String(i.status).includes("DELINQUENT") || (Array.isArray(i.latePayments) && (i.latePayments as unknown[]).length > 0));
    const medicalCollections = collections.filter((i) => String(i.accountType).toLowerCase().includes("medical"));
    const highUtilization = items.filter((i) => {
      const bal = Number(i.balance) || 0, lim = Number(i.creditLimit) || 0;
      return lim > 0 && bal / lim > 0.3;
    });
    const collectionDebt = collections.reduce((s, i) => s + (Number(i.balance) || 0), 0);

    const scoreResults = await firestore.query(COLLECTIONS.creditScores, [
      { field: "userId", op: "EQUAL", value: user.uid },
    ], "recordedAt", "DESCENDING", 1);
    const currentScore = scoreResults.length > 0 ? Number(scoreResults[0].data.score) : null;

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
      steps.push({ order: order++, title: "Negotiate Charge-Off Removal", description: `You have ${chargeOffs.length} charge-off${chargeOffs.length > 1 ? "s" : ""} from ${names}. Negotiate pay-for-delete with the original creditor's executive office.`, category: "DISPUTE", impact: "HIGH", timeframe: "2-6 weeks", completed: false });
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
    if (items.filter((i) => i.isDisputable).length > 0) {
      steps.push({ order: order++, title: "File Disputes with All Three Credit Bureaus", description: "File formal disputes with Equifax, Experian, and TransUnion for each inaccurate item. Bureaus have 30 days to investigate or must delete.", category: "DISPUTE", impact: "HIGH", timeframe: "30-45 days", completed: false });
    }
    steps.push({ order: order++, title: "Become an Authorized User on a Strong Account", description: "Ask a family member to add you as an authorized user on their oldest card with perfect history. Can add 20-50 points.", category: "CREDIT_MIX", impact: "MEDIUM", timeframe: "1-2 weeks", completed: false });
    steps.push({ order: order++, title: "Monitor Your Credit Monthly", description: "Pull and upload your credit reports monthly to track progress and catch new errors early.", category: "GENERAL", impact: "LOW", timeframe: "Ongoing", completed: false });

    const summaryParts = [];
    if (currentScore) summaryParts.push(`Your current score is ${currentScore}.`);
    if (collections.length > 0) summaryParts.push(`You have ${collections.length} collection${collections.length > 1 ? "s" : ""} totaling $${collectionDebt.toLocaleString()} that should be disputed immediately.`);
    if (highUtilization.length > 0) summaryParts.push(`${highUtilization.length} card${highUtilization.length > 1 ? "s are" : " is"} above 30% utilization — paying these down will give you the fastest score boost.`);
    summaryParts.push(`Follow these ${steps.length} steps in order for maximum impact.`);

    const title = currentScore ? `Your Path from ${currentScore} to 800` : "Your Path to 800";
    const summary = summaryParts.join(" ");

    const planId = await firestore.addDoc(COLLECTIONS.actionPlans, {
      userId: user.uid,
      reportId: reportId || null,
      title,
      summary,
      steps,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ planId, title, summary, steps });
  } catch (err) {
    console.error("[plans/generate]", err);
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { getUserSubscription } from "@/lib/subscription";
import { getLimiters } from "@/lib/ratelimit";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await getAuthUser();
  } catch (authErr) {
    console.error("Auth error:", authErr);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { reportId, simulateData } = await req.json();

    const sub = await getUserSubscription(user.uid);

    if (simulateData && !sub.isPro) {
      return NextResponse.json({ error: "Active subscription required" }, { status: 403 });
    }

    // Rate limit real PDF analysis to 5/day per user
    if (!simulateData) {
      const rl = await getLimiters().reportAnalyze.limit(`uid:${user.uid}`);
      if (!rl.success) {
        return NextResponse.json(
          { error: "Daily analysis limit reached. You can analyze up to 5 reports per day." },
          { status: 429, headers: { "Retry-After": String(rl.reset) } }
        );
      }
    }

    // Verify reportId ownership — 404 if missing, 403 if owned by another user
    if (reportId) {
      const reportDoc = await firestore.getDoc(COLLECTIONS.creditReports, reportId);
      if (!reportDoc.exists) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      if (reportDoc.data.userId !== user.uid) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // If simulating, create sample report items with full removal analysis
    if (simulateData) {
      const sampleItems = [
        {
          userId: user.uid,
          creditReportId: reportId,
          creditorName: "Midland Credit Management",
          originalCreditor: "Chase Bank",
          accountNumber: "****7832",
          accountType: "Collection",
          balance: 1250,
          originalBalance: 980,
          creditLimit: null,
          status: "COLLECTION",
          dateOpened: "2019-03-15",
          dateOfFirstDelinquency: "2019-08-01",
          lastActivityDate: "2020-02-15",
          isDisputable: true,
          removalStrategies: [
            {
              method: "Statute of Limitations",
              description: "Debt may be past the statute of limitations in your state. Collectors cannot sue to collect time-barred debt.",
              priority: "HIGH",
              successRate: "85%",
            },
            {
              method: "Debt Validation",
              description: "Request validation under FDCPA. Collection agencies often lack original documentation.",
              priority: "HIGH",
              successRate: "70%",
            },
            {
              method: "Pay-for-Delete",
              description: "Negotiate to pay 40-50% of balance in exchange for complete removal from credit reports.",
              priority: "MEDIUM",
              successRate: "60%",
            },
          ],
          disputeReason: "Collection account from debt buyer - demand validation of original signed agreement and chain of assignment",
          bureau: "EQUIFAX",
        },
        {
          userId: user.uid,
          creditReportId: reportId,
          creditorName: "Portfolio Recovery Associates",
          originalCreditor: "Synchrony Bank",
          accountNumber: "****5566",
          accountType: "Collection",
          balance: 890,
          originalBalance: 650,
          creditLimit: null,
          status: "COLLECTION",
          dateOpened: "2018-06-20",
          dateOfFirstDelinquency: "2018-11-01",
          lastActivityDate: "2019-04-10",
          isDisputable: true,
          removalStrategies: [
            {
              method: "Credit Report Age-Off",
              description: "Account is approaching 7-year removal date. First delinquency was over 6 years ago.",
              priority: "HIGH",
              successRate: "100%",
            },
            {
              method: "Statute of Limitations Expired",
              description: "Debt is past SOL in most states. Send cease & desist and dispute with bureaus.",
              priority: "HIGH",
              successRate: "90%",
            },
            {
              method: "Debt Validation",
              description: "Debt has been sold multiple times. Original documentation likely unavailable.",
              priority: "HIGH",
              successRate: "75%",
            },
          ],
          disputeReason: "Debt is time-barred and approaching 7-year credit report removal - dispute for early deletion",
          bureau: "EQUIFAX",
        },
        {
          userId: user.uid,
          creditReportId: reportId,
          creditorName: "LVNV Funding LLC",
          originalCreditor: "Capital One",
          accountNumber: "****2211",
          accountType: "Collection",
          balance: 3200,
          originalBalance: 2100,
          creditLimit: null,
          status: "COLLECTION",
          dateOpened: "2021-01-15",
          dateOfFirstDelinquency: "2020-09-01",
          lastActivityDate: "2021-06-20",
          isDisputable: true,
          removalStrategies: [
            {
              method: "Debt Validation",
              description: "LVNV is a debt buyer. Demand original signed contract - they rarely have it.",
              priority: "HIGH",
              successRate: "70%",
            },
            {
              method: "Balance Discrepancy",
              description: "Current balance ($3,200) is 52% higher than original ($2,100). Dispute inflated fees/interest.",
              priority: "MEDIUM",
              successRate: "55%",
            },
            {
              method: "Pay-for-Delete",
              description: "Offer 35-45% settlement with deletion agreement before payment.",
              priority: "MEDIUM",
              successRate: "60%",
            },
          ],
          disputeReason: "Debt buyer account with inflated balance - demand validation and itemized statement of all fees",
          bureau: "TRANSUNION",
        },
        {
          userId: user.uid,
          creditReportId: reportId,
          creditorName: "Discover",
          originalCreditor: null,
          accountNumber: "****3344",
          accountType: "Credit Card",
          balance: 4800,
          originalBalance: null,
          creditLimit: 5000,
          status: "DELINQUENT",
          dateOpened: "2017-05-10",
          dateOfFirstDelinquency: null,
          lastActivityDate: "2024-01-15",
          latePayments: ["2023-06", "2023-07"],
          isDisputable: true,
          removalStrategies: [
            {
              method: "Goodwill Letter",
              description: "Request removal of late payments due to circumstances. Account is otherwise in good standing.",
              priority: "HIGH",
              successRate: "50%",
            },
            {
              method: "Re-age Account",
              description: "After bringing current, request creditor re-age the account to remove late payment history.",
              priority: "MEDIUM",
              successRate: "40%",
            },
            {
              method: "Pay Down Utilization",
              description: "Account at 96% utilization. Pay down to 30% for 50+ point score increase.",
              priority: "HIGH",
              successRate: "100%",
            },
          ],
          disputeReason: "Late payments reported incorrectly - payment was processed on time but credited late by creditor",
          bureau: "TRANSUNION",
        },
        {
          userId: user.uid,
          creditReportId: reportId,
          creditorName: "Medical Data Systems",
          originalCreditor: "Valley Hospital",
          accountNumber: "****8899",
          accountType: "Medical Collection",
          balance: 450,
          originalBalance: 450,
          creditLimit: null,
          status: "COLLECTION",
          dateOpened: "2022-08-10",
          dateOfFirstDelinquency: "2022-03-01",
          lastActivityDate: "2022-09-15",
          isDisputable: true,
          removalStrategies: [
            {
              method: "HIPAA Violation Check",
              description: "Medical collectors often violate HIPAA. Request proof of authorization to collect.",
              priority: "HIGH",
              successRate: "65%",
            },
            {
              method: "Insurance Verification",
              description: "Verify insurance didn't cover this. Many medical collections are billing errors.",
              priority: "HIGH",
              successRate: "70%",
            },
            {
              method: "Pay-for-Delete",
              description: "Medical collectors often accept 50% or less with deletion. Small balance = easy win.",
              priority: "MEDIUM",
              successRate: "75%",
            },
            {
              method: "Paid Medical Removal",
              description: "Under newer FCRA rules, paid medical collections under $500 must be removed.",
              priority: "HIGH",
              successRate: "100%",
            },
          ],
          disputeReason: "Medical collection - verify HIPAA compliance and insurance coverage before paying",
          bureau: "EXPERIAN",
        },
        {
          userId: user.uid,
          creditReportId: reportId,
          creditorName: "Capital One",
          originalCreditor: null,
          accountNumber: "****4521",
          accountType: "Credit Card",
          balance: 2500,
          originalBalance: null,
          creditLimit: 5000,
          status: "CURRENT",
          dateOpened: "2019-02-15",
          dateOfFirstDelinquency: null,
          lastActivityDate: "2024-12-01",
          isDisputable: true,
          removalStrategies: [
            {
              method: "Credit Limit Increase",
              description: "Request CLI to lower utilization (currently 50%). Lower util = higher score.",
              priority: "MEDIUM",
              successRate: "65%",
            },
          ],
          disputeReason: null,
          bureau: "EQUIFAX",
        },
        {
          userId: user.uid,
          creditReportId: reportId,
          creditorName: "Bank of America",
          originalCreditor: null,
          accountNumber: "****9012",
          accountType: "Auto Loan",
          balance: 15000,
          originalBalance: 22000,
          creditLimit: null,
          status: "CURRENT",
          dateOpened: "2022-04-10",
          dateOfFirstDelinquency: null,
          lastActivityDate: "2024-12-15",
          isDisputable: false,
          removalStrategies: [],
          disputeReason: null,
          bureau: "EXPERIAN",
        },
      ];

      // Check if items already exist for this specific report to avoid duplicates
      const existingItems = await firestore.query(COLLECTIONS.reportItems, [
        { field: "userId", op: "EQUAL", value: user.uid },
        { field: "creditReportId", op: "EQUAL", value: reportId },
      ]);

      if (existingItems.length > 0) {
        const existingDisputable = existingItems.filter(i => i.data.isDisputable).length;
        // Items already exist, just update report status and return
        await firestore.updateDoc(COLLECTIONS.creditReports, reportId, {
          status: "ANALYZED",
          analyzedAt: new Date().toISOString(),
          summary: { negativeItems: existingDisputable },
        });

        return NextResponse.json({
          success: true,
          itemsCreated: 0,
          disputableItems: existingDisputable,
          message: "Report already analyzed. Existing items preserved.",
        });
      }

      // Add sample items to Firestore (only if none exist)
      for (const item of sampleItems) {
        await firestore.addDoc(COLLECTIONS.reportItems, item);
      }

      // Add a sample credit score
      await firestore.addDoc(COLLECTIONS.creditScores, {
        userId: user.uid,
        score: 673,
        bureau: "EQUIFAX",
        source: "Credit Report",
        recordedAt: new Date().toISOString(),
      });

      // Update report status
      const disputableCount = sampleItems.filter(i => i.isDisputable).length;
      await firestore.updateDoc(COLLECTIONS.creditReports, reportId, {
        status: "ANALYZED",
        analyzedAt: new Date().toISOString(),
        summary: { negativeItems: disputableCount },
      });

      return NextResponse.json({
        success: true,
        itemsCreated: sampleItems.length,
        disputableItems: disputableCount,
      });
    }

    // Real PDF analysis — run in background via ctx.waitUntil (no timeout for the client)
    const report = await firestore.getDoc(COLLECTIONS.creditReports, reportId);
    if (!report.exists) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const s3Key = (report.data.s3Key || report.data.blobUrl) as string;
    if (!s3Key) {
      return NextResponse.json({ error: "PDF file not found for this report" }, { status: 404 });
    }

    // Add to the analysis queue. The Cloudflare Queue consumer (max_concurrency = 1)
    // processes reports one at a time, in order, with a full async budget — so a
    // 3-bureau burst runs sequentially and reliably. The user is notified (in-app +
    // email) when each completes.
    await firestore.updateDoc(COLLECTIONS.creditReports, reportId, {
      status: "QUEUED",
      queuedAt: new Date().toISOString(),
    });

    const { env } = await getCloudflareContext({ async: true });
    const queue = (env as { ANALYSIS_QUEUE?: { send: (m: unknown) => Promise<void> } }).ANALYSIS_QUEUE;
    if (!queue) {
      return NextResponse.json({ error: "Analysis queue not configured" }, { status: 503 });
    }
    await queue.send({ reportId });

    return NextResponse.json({ status: "queued", reportId });
  } catch (err) {
    console.error("Analyze error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

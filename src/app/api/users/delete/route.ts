import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function DELETE() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = user.uid;

  try {
    // Cancel Stripe subscription so the user isn't charged after account deletion
    const userDoc = await firestore.getDoc(COLLECTIONS.users, uid);
    const stripeSubscriptionId = userDoc.data.stripeSubscriptionId as string | undefined;
    if (stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(stripeSubscriptionId);
      } catch (stripeErr) {
        console.error("Failed to cancel Stripe subscription on delete:", stripeErr);
      }
    }

    // Delete all user documents from every collection
    const collections = [
      COLLECTIONS.creditReports,
      COLLECTIONS.reportItems,
      COLLECTIONS.disputes,
      COLLECTIONS.creditScores,
      COLLECTIONS.actionPlans,
      COLLECTIONS.reportChanges,
      COLLECTIONS.notifications,
      COLLECTIONS.portfolioAccounts,
      COLLECTIONS.portfolioSnapshots,
      COLLECTIONS.plaidItems,
      COLLECTIONS.budgetEntries,
      COLLECTIONS.goals,
      COLLECTIONS.creditFreezes,
      COLLECTIONS.creditorLetters,
      COLLECTIONS.autopilotRuns,
      COLLECTIONS.fcraConsents,
      COLLECTIONS.auditLogs,
    ];

    for (const col of collections) {
      const docs = await firestore.query(col, [{ field: "userId", op: "EQUAL", value: uid }]);
      await Promise.all(docs.map((doc) => firestore.deleteDoc(col, doc.id)));
    }

    // Delete the user profile document
    await firestore.deleteDoc(COLLECTIONS.users, uid);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete account error:", err);
    return NextResponse.json({ error: "Failed to delete account data" }, { status: 500 });
  }
}

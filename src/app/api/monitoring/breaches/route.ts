import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { firestore, COLLECTIONS } from "@/lib/db";

interface HibpBreach {
  Name: string;
  Title: string;
  BreachDate: string;
  DataClasses: string[];
  Description: string;
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hibpKey = process.env.HIBP_API_KEY;
  if (!hibpKey) {
    return NextResponse.json({ available: false, message: "Identity monitoring not yet configured." });
  }

  try {
    const encodedEmail = encodeURIComponent(user.email);
    const res = await fetch(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodedEmail}?truncateResponse=false`,
      {
        headers: {
          "hibp-api-key": hibpKey,
          "User-Agent": "Credit800App",
        },
      }
    );

    let breaches: HibpBreach[] = [];

    if (res.status === 404) {
      breaches = [];
    } else if (!res.ok) {
      throw new Error(`HIBP API error: ${res.status}`);
    } else {
      breaches = await res.json();
    }

    const now = new Date().toISOString();

    // Cache in Firestore
    await firestore.updateDoc(COLLECTIONS.users, user.uid, {
      lastBreachCheck: breaches,
      lastBreachCheckAt: now,
    });

    return NextResponse.json({
      available: true,
      email: user.email,
      breachCount: breaches.length,
      breaches: breaches.map((b) => ({
        name: b.Name,
        title: b.Title,
        breachDate: b.BreachDate,
        dataClasses: b.DataClasses,
        description: b.Description,
      })),
      checkedAt: now,
    });
  } catch (err) {
    console.error("breaches check error:", err);
    return NextResponse.json(
      { error: "Failed to check breaches" },
      { status: 500 }
    );
  }
}

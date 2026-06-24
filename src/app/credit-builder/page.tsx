"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";

interface CreditBuilderProduct {
  name: string;
  type: "secured_card" | "credit_builder_loan" | "store_card";
  issuer: string;
  minScore: number;
  maxScore: number;
  apr?: string;
  annualFee: number;
  depositRequired?: number;
  loanAmount?: string;
  creditLimit?: string;
  benefits: string[];
  link: string;
  recommended: boolean;
}

const PRODUCTS: CreditBuilderProduct[] = [
  {
    name: "Discover it Secured Credit Card",
    type: "secured_card",
    issuer: "Discover",
    minScore: 300,
    maxScore: 639,
    apr: "28.24%",
    annualFee: 0,
    depositRequired: 200,
    creditLimit: "= deposit amount",
    benefits: [
      "No annual fee",
      "2% cash back at gas & restaurants",
      "Automatic review for upgrade after 7 months",
      "Cash back match at end of first year",
    ],
    link: "https://www.discover.com/credit-cards/secured/",
    recommended: true,
  },
  {
    name: "Capital One Platinum Secured",
    type: "secured_card",
    issuer: "Capital One",
    minScore: 300,
    maxScore: 639,
    apr: "29.99%",
    annualFee: 0,
    depositRequired: 49,
    creditLimit: "$200",
    benefits: [
      "Low minimum deposit ($49)",
      "No annual fee",
      "Automatic credit line review after 6 months",
      "Reports to all 3 bureaus",
    ],
    link: "https://www.capitalone.com/credit-cards/platinum/",
    recommended: true,
  },
  {
    name: "OpenSky Secured Visa",
    type: "secured_card",
    issuer: "Capital Bank",
    minScore: 300,
    maxScore: 579,
    apr: "25.14%",
    annualFee: 35,
    depositRequired: 200,
    creditLimit: "$200–$3,000",
    benefits: [
      "No credit check required",
      "Reports to all 3 bureaus monthly",
      "Flexible deposit up to $3,000",
      "Good for rebuilding after bankruptcy",
    ],
    link: "https://www.openskycc.com/",
    recommended: false,
  },
  {
    name: "Chime Credit Builder Secured Visa",
    type: "secured_card",
    issuer: "Chime / Stride Bank",
    minScore: 300,
    maxScore: 649,
    apr: "0%",
    annualFee: 0,
    depositRequired: 0,
    creditLimit: "Flexible (based on transfer)",
    benefits: [
      "No interest, no annual fee, no minimum deposit",
      "Reports to all 3 bureaus",
      "No hard credit pull",
      "Spending limit = amount transferred to account",
    ],
    link: "https://www.chime.com/credit/chime-card/",
    recommended: true,
  },
  {
    name: "Self Credit Builder Account",
    type: "credit_builder_loan",
    issuer: "Self Financial",
    minScore: 300,
    maxScore: 669,
    annualFee: 0,
    loanAmount: "$600–$1,800",
    benefits: [
      "Build credit and savings simultaneously",
      "Reports to all 3 bureaus",
      "No credit check required",
      "Get money back (minus fees) when loan is complete",
    ],
    link: "https://www.self.inc/",
    recommended: true,
  },
  {
    name: "Credit Strong Accelerate",
    type: "credit_builder_loan",
    issuer: "Austin Capital Bank",
    minScore: 300,
    maxScore: 669,
    annualFee: 0,
    loanAmount: "$1,000–$10,000",
    benefits: [
      "Build credit & emergency savings",
      "Reports to all 3 bureaus",
      "Higher loan amounts than competitors",
      "Cancel anytime with no penalty",
    ],
    link: "https://www.creditstrong.com/",
    recommended: false,
  },
  {
    name: "Capital One Quicksilver Secured",
    type: "secured_card",
    issuer: "Capital One",
    minScore: 580,
    maxScore: 669,
    apr: "29.99%",
    annualFee: 0,
    depositRequired: 200,
    creditLimit: "$200+",
    benefits: [
      "1.5% unlimited cash back on every purchase",
      "No annual fee",
      "Automatic credit line review",
      "Reports to all 3 bureaus",
    ],
    link: "https://www.capitalone.com/credit-cards/quicksilver-secured/",
    recommended: true,
  },
  {
    name: "Amazon Secured Card",
    type: "store_card",
    issuer: "Synchrony Bank",
    minScore: 580,
    maxScore: 669,
    apr: "28.99%",
    annualFee: 0,
    depositRequired: 100,
    creditLimit: "= deposit",
    benefits: [
      "5% back on Amazon purchases",
      "No annual fee",
      "Good for Amazon shoppers",
      "Upgrade path available",
    ],
    link: "https://www.amazon.com/Synchrony-Bank-Amazon-com-Secured-Store/dp/B084KP3NG6",
    recommended: false,
  },
  {
    name: "Tilt Credit Card (formerly Petal 1)",
    type: "secured_card",
    issuer: "WebBank",
    minScore: 600,
    maxScore: 699,
    apr: "25.24%–34.74%",
    annualFee: 0,
    benefits: [
      "No security deposit required",
      "Cash flow underwriting — banking history counts",
      "Up to 1.5% cash back",
      "Reports to all 3 bureaus",
    ],
    link: "https://apply.tilt.com/credit-card?redirect=registration.petalcard.com&utm_source=petal_organic&redirectVariant=5s",
    recommended: false,
  },
  {
    name: "Upgrade Visa with Cash Rewards",
    type: "secured_card",
    issuer: "Upgrade",
    minScore: 620,
    maxScore: 720,
    apr: "14.99%–29.99%",
    annualFee: 0,
    benefits: [
      "1.5% unlimited cash back",
      "Combines credit card and personal loan",
      "Fixed monthly payments",
      "Reports to all 3 bureaus",
    ],
    link: "https://www.upgrade.com/",
    recommended: false,
  },
];

const TYPE_LABELS: Record<string, string> = {
  secured_card: "Secured Card",
  credit_builder_loan: "Credit Builder Loan",
  store_card: "Store Card",
};

const TYPE_COLORS: Record<string, string> = {
  secured_card: "bg-blue-100 text-blue-700",
  credit_builder_loan: "bg-purple-100 text-purple-700",
  store_card: "bg-amber-100 text-amber-700",
};

export default function CreditBuilderPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [latestScore, setLatestScore] = useState<number | null>(null);
  const [loadingScore, setLoadingScore] = useState(true);
  const [filter, setFilter] = useState<"all" | "secured_card" | "credit_builder_loan" | "store_card">("all");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!user) return;

    fetch("/api/scores", {
      headers: { Authorization: `Bearer ${user.idToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const scores = data.scores || [];
        if (scores.length > 0) {
          const sorted = [...scores].sort(
            (a: { recordedAt: string }, b: { recordedAt: string }) =>
              new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
          );
          setLatestScore(sorted[0].score);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingScore(false));
  }, [user, authLoading, router]);

  const score = latestScore ?? 580;

  const filtered = PRODUCTS.filter((p) => {
    if (filter !== "all" && p.type !== filter) return false;
    return true;
  });

  const eligible = filtered.filter((p) => score >= p.minScore && score <= p.maxScore + 50);
  const other = filtered.filter((p) => !(score >= p.minScore && score <= p.maxScore + 50));

  if (authLoading || loadingScore) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1a3fd4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthenticatedLayout activeNav="credit-builder">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Credit Builder Products</h1>
          <p className="text-slate-600 text-sm sm:text-base">
            Curated secured cards and credit-builder loans matched to your credit profile.
          </p>
        </div>

        {/* Score Banner */}
        <div className="bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] rounded-2xl p-6 text-white mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-cyan-100 mb-1">Your Current Score</p>
              <p className="text-4xl font-bold">
                {latestScore ? latestScore : "—"}
              </p>
              {!latestScore && (
                <p className="text-xs text-cyan-100 mt-1">Add a score in Score Tracking to get personalized matches</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-cyan-100 mb-1">Products matched to you</p>
              <p className="text-3xl font-bold">{eligible.length}</p>
            </div>
          </div>
        </div>

        {/* All Products */}
        <div className="grid gap-4 sm:grid-cols-2">
          {[...filtered].sort((a, b) => {
            const order = { secured_card: 0, credit_builder_loan: 1, store_card: 2 };
            return (order[a.type as keyof typeof order] ?? 3) - (order[b.type as keyof typeof order] ?? 3);
          }).map((product) => (
            <ProductCard key={product.name} product={product} highlight={score ? score >= product.minScore && score <= product.maxScore + 50 : false} />
          ))}
        </div>

        {/* Disclaimer */}
        <p className="mt-10 text-xs text-slate-400 text-center">
          Credit 800 may receive compensation for referrals. Always review terms before applying. Not financial advice.
        </p>
      </main>
    </AuthenticatedLayout>
  );
}

function ProductCard({ product, highlight }: { product: CreditBuilderProduct; highlight: boolean }) {
  return (
    <div className={`bg-white border rounded-xl p-5 hover:shadow-md transition flex flex-col ${highlight ? "border-teal-200" : "border-slate-200"}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold text-base">{product.name}</h3>
            {product.recommended && highlight && (
              <span className="text-xs px-2 py-0.5 bg-blue-50 text-[#1a3fd4] rounded-full font-medium">Best Match</span>
            )}
          </div>
          <p className="text-sm text-slate-500">{product.issuer}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${TYPE_COLORS[product.type]}`}>
          {TYPE_LABELS[product.type]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
        <div className="bg-slate-50 rounded-lg p-2">
          <p className="text-xs text-slate-400 mb-0.5">Annual Fee</p>
          <p className="font-semibold">{product.annualFee === 0 ? "None" : `$${product.annualFee}`}</p>
        </div>
        {product.depositRequired !== undefined && (
          <div className="bg-slate-50 rounded-lg p-2">
            <p className="text-xs text-slate-400 mb-0.5">Min Deposit</p>
            <p className="font-semibold">${product.depositRequired}</p>
          </div>
        )}
        {product.loanAmount && (
          <div className="bg-slate-50 rounded-lg p-2">
            <p className="text-xs text-slate-400 mb-0.5">Loan Amount</p>
            <p className="font-semibold">{product.loanAmount}</p>
          </div>
        )}
        {product.apr && (
          <div className="bg-slate-50 rounded-lg p-2">
            <p className="text-xs text-slate-400 mb-0.5">APR</p>
            <p className="font-semibold">{product.apr}</p>
          </div>
        )}
        {product.creditLimit && (
          <div className="bg-slate-50 rounded-lg p-2">
            <p className="text-xs text-slate-400 mb-0.5">Credit Limit</p>
            <p className="font-semibold text-xs">{product.creditLimit}</p>
          </div>
        )}
        <div className="bg-slate-50 rounded-lg p-2">
          <p className="text-xs text-slate-400 mb-0.5">Score Range</p>
          <p className="font-semibold text-xs">{product.minScore}–{product.maxScore}</p>
        </div>
      </div>

      <ul className="mb-4 space-y-1 flex-1">
        {product.benefits.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
            <svg className="w-3.5 h-3.5 text-teal-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            {b}
          </li>
        ))}
      </ul>

      <a
        href={product.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center py-2.5 rounded-xl text-sm font-medium transition bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white hover:opacity-90 mt-auto"
      >
        View & Apply →
      </a>
    </div>
  );
}

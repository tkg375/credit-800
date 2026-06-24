import Link from "next/link";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MarketingNav } from "@/components/MarketingNav";
import { GetStartedButton } from "@/components/AuthModalButtons";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Free Credit Repair Toolkit",
  description: "Credit 800 Self Service is free. Get unlimited dispute letters, budget tracking, loan readiness, and more. Mail disputes via USPS for $2/letter.",
  openGraph: {
    title: "Credit 800 Pricing — Free Credit Repair Toolkit",
    description: "Credit 800 Self Service is free. Unlimited dispute letters, budget tracker, loan readiness, and more. Mail via USPS for $2/letter.",
    url: "https://credit-800.com/plans",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Credit 800 Pricing Plans" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Credit 800 Pricing — Free Credit Repair Toolkit",
    description: "Credit 800 Self Service is free. Mail disputes via USPS for $2/letter. No contracts.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://credit-800.com/plans",
  },
};

const proFeatures = [
  "Unlimited dispute letters",
  "Budget tracker & spending charts",
  "Goals tracker with notifications",
  "Loan readiness calculator",
  "Letter templates library",
  "Credit freeze manager",
  "Debt payoff optimizer",
  "Credit score simulator",
  "Document vault (unlimited)",
  "CFPB complaint generator",
  "Analyze letters from collectors",
  "Score tracking & charts",
];

const autopilotFeatures = [
  "Everything in Self Service",
  "Monthly soft-pull credit report",
  "Auto-generated dispute letters",
  "Automatic USPS mailing (up to 10/mo)",
  "VantageScore tracking — hands-free",
  "FCRA-compliant full automation",
  "Priority support",
  "Compliance audit trail",
];

const plansJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Credit 800 — Self Service Plan",
  description:
    "Credit repair toolkit. Unlimited dispute letters, budget tracker, loan readiness calculator, debt payoff optimizer, and more.",
  url: "https://credit-800.com/plans",
  image: "https://credit-800.com/og-image.png",
  brand: {
    "@type": "Brand",
    name: "Credit 800",
  },
  offers: {
    "@type": "Offer",
    price: "0.00",
    priceCurrency: "USD",
    priceValidUntil: "2026-12-31",
    availability: "https://schema.org/InStock",
    url: "https://credit-800.com/register",
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingRate: {
        "@type": "MonetaryAmount",
        value: "0.00",
        currency: "USD",
      },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: {
          "@type": "QuantitativeValue",
          minValue: 0,
          maxValue: 0,
          unitCode: "DAY",
        },
        transitTime: {
          "@type": "QuantitativeValue",
          minValue: 0,
          maxValue: 0,
          unitCode: "DAY",
        },
      },
      shippingDestination: {
        "@type": "DefinedRegion",
        addressCountry: "US",
      },
    },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "US",
      returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
    },
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "312",
    bestRating: "5",
    worstRating: "1",
  },
};

export default function PlansPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(plansJsonLd) }}
      />
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <MarketingNav />
      </header>
      <div className="bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-14 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 border border-white/30 rounded-full text-white text-xs font-semibold mb-4">
            <span className="w-2 h-2 bg-lime-300 rounded-full animate-pulse" />
            Autopilot is Now Live
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3">Simple, Honest Pricing</h1>
          <p className="text-lime-100 max-w-2xl mx-auto text-sm sm:text-base">
            Start free. Upgrade to Autopilot when you're ready to let us handle everything.
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="grid gap-6 sm:grid-cols-2">

          {/* Self Service */}
          <div className="bg-white border-2 border-teal-500 rounded-2xl p-6 flex flex-col">
            <h3 className="font-semibold text-slate-900 mb-1">Self Service</h3>
            <p className="text-3xl font-bold mb-1 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] bg-clip-text text-transparent">Free</p>
            <p className="text-xs text-slate-500 mb-5">Full DIY credit repair toolkit</p>
            <ul className="space-y-2 flex-1 mb-6">
              {proFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                  <svg className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <GetStartedButton className="block w-full text-center px-4 py-2.5 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] hover:opacity-90 text-white rounded-xl font-medium transition text-sm">
              Get Started — Free
            </GetStartedButton>
          </div>

          {/* Autopilot */}
          <div className="bg-gradient-to-br from-[#1a3fd4] to-[#00d4aa] border-2 border-lime-400 rounded-2xl p-6 flex flex-col relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 bg-lime-400 text-slate-900 rounded-full">Live Now</span>
            </div>
            <h3 className="font-semibold text-white mb-1">Autopilot</h3>
            <p className="text-3xl font-bold mb-1 text-white">
              $49 <span className="text-sm font-normal text-teal-200">/ month</span>
            </p>
            <p className="text-xs text-teal-200 mb-1">We handle everything — fully automated</p>
            <p className="text-xs text-lime-300 mb-5">Cancel anytime · No contracts</p>
            <ul className="space-y-2 flex-1 mb-6">
              {autopilotFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-white/90">
                  <svg className="w-3.5 h-3.5 text-lime-300 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <GetStartedButton className="block w-full text-center px-4 py-2.5 bg-white text-[#1a3fd4] hover:bg-blue-50 rounded-xl font-semibold transition text-sm">
              Start Now →
            </GetStartedButton>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Self Service is free
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            No hidden fees
          </span>
        </div>

        <div className="max-w-2xl mx-auto mt-10 grid sm:grid-cols-3 gap-4">
          {[
            {
              label: "FCRA Compliant",
              detail: "Fair Credit Reporting Act",
              desc: "Your right to dispute inaccurate information is protected under the FCRA. Bureaus must investigate within 30 days.",
            },
            {
              label: "FDCPA Protected",
              detail: "Fair Debt Collection Practices Act",
              desc: "The FDCPA protects you from abusive debt collectors. You have the right to request debt validation and stop contact.",
            },
            {
              label: "Secure & Private",
              detail: "256-bit encryption",
              desc: "Your documents and personal information are encrypted and never shared with third parties.",
            },
          ].map((t) => (
            <div key={t.label} className="border border-slate-200 rounded-xl p-4 text-center">
              <p className="font-semibold text-sm text-slate-800">{t.label}</p>
              <p className="text-xs text-teal-600 font-medium mt-0.5 mb-2">{t.detail}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-500 text-sm mb-4">Have questions about which plan is right for you?</p>
          <Link href="/faq" className="text-teal-600 hover:text-teal-700 font-medium text-sm transition">
            Read our FAQ →
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}

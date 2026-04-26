import Link from "next/link";
import HeroDemoAnimation from "@/components/HeroDemoAnimation";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { GetStartedButton } from "@/components/AuthModalButtons";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://credit-800.com/#organization",
      name: "Credit 800",
      url: "https://credit-800.com",
      logo: {
        "@type": "ImageObject",
        url: "https://credit-800.com/og-image.png",
      },
      sameAs: [
        "https://twitter.com/credit800",
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://credit-800.com/#website",
      url: "https://credit-800.com",
      name: "Credit 800",
      description:
        "Dispute letters, score analysis, and a personalized plan to reach an 800 credit score.",
      publisher: { "@id": "https://credit-800.com/#organization" },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://credit-800.com/faq?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://credit-800.com/#app",
      name: "Credit 800",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      url: "https://credit-800.com",
      offers: {
        "@type": "Offer",
        price: "5.00",
        priceCurrency: "USD",
        billingIncrement: "P1M",
        availability: "https://schema.org/InStock",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        ratingCount: "312",
        bestRating: "5",
        worstRating: "1",
      },
      description:
        "Credit 800 analyzes your credit report, automatically generates FCRA-compliant dispute letters, and builds a personalized action plan to reach an 800 credit score.",
    },
    {
      "@type": "HowTo",
      "@id": "https://credit-800.com/#howto",
      name: "How to Repair Your Credit with Credit 800",
      description:
        "Fix your credit, manage your finances, and get loan ready — all in one platform.",
      totalTime: "PT30M",
      estimatedCost: {
        "@type": "MonetaryAmount",
        currency: "USD",
        value: "5",
      },
      step: [
        {
          "@type": "HowToStep",
          name: "Fix Your Credit",
          text: "Upload your credit report. Credit 800 finds disputable inaccuracies, generates FCRA-compliant letters citing specific legal sections, and builds a personalized action plan to raise your score.",
          url: "https://credit-800.com/#how-it-works",
          position: 1,
        },
        {
          "@type": "HowToStep",
          name: "Manage Your Finances",
          text: "Track your monthly budget, set financial goals, monitor your net worth, and plan your debt payoff — all from one dashboard.",
          url: "https://credit-800.com/#how-it-works",
          position: 2,
        },
        {
          "@type": "HowToStep",
          name: "Get Loan Ready",
          text: "See exactly how ready you are for a mortgage, auto loan, or credit card. Know your DTI, what's holding you back, and what to fix first.",
          url: "https://credit-800.com/#how-it-works",
          position: 3,
        },
      ],
    },
  ],
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Nav + Hero with gradient background */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <MarketingNav />
      </header>

      <div className="bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-16 pb-12 sm:pb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
<h1 className="text-4xl sm:text-5xl lg:text-6xl leading-tight text-white">
                Your Credit &amp; Finances.
                <br />
                <span className="text-slate-900">One Platform.</span>
                <br />
                <span className="hero-glisten">Free.</span>
              </h1>

              <div className="mt-6 sm:mt-10 flex flex-row flex-wrap gap-3 sm:gap-4">
                <GetStartedButton className="px-6 py-3 bg-white text-teal-600 hover:bg-lime-50 rounded-lg font-medium transition">
                  Get Started
                </GetStartedButton>
                <Link
                  href="/faq"
                  className="px-6 py-3 border border-white/50 hover:border-white text-white rounded-lg font-medium transition"
                >
                  FAQs
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                {["Credit Disputes", "Budget Tracker", "Loan Readiness", "Goals", "Debt Payoff", "Letter Templates"].map((t) => (
                  <span key={t} className="text-xs text-lime-200 flex items-center gap-1.5">
                    <svg className="w-3 h-3 text-lime-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="hidden lg:block">
              <HeroDemoAnimation />
            </div>
          </div>
        </section>
      </div>

      <MarketingFooter />
    </div>
  );
}

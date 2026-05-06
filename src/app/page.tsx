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
            </div>
            <div className="hidden lg:block">
              <HeroDemoAnimation />
            </div>
          </div>
        </section>
      </div>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 text-teal-700 bg-teal-50">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              From report to results in minutes
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              No credit counselor needed. Just upload, analyze, and act.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: (
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4 4 4M6 20h12"/>
                  </svg>
                ),
                title: "Upload Your Credit Report",
                desc: "Import your credit report from any bureau. Our AI scans every account, inquiry, and derogatory mark in seconds.",
              },
              {
                step: "02",
                icon: (
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                  </svg>
                ),
                title: "Get Your Action Plan",
                desc: "Receive FCRA-compliant dispute letters, a personalized score roadmap, and specific steps ranked by impact.",
              },
              {
                step: "03",
                icon: (
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                ),
                title: "Watch Your Score Climb",
                desc: "Track disputes, monitor progress, and use our financial tools to stay on course to 800.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-2xl p-8 border border-slate-100 bg-slate-50"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-teal-600 bg-teal-50">
                  {item.icon}
                </div>
                <span className="text-xs font-bold tracking-widest text-slate-400">{item.step}</span>
                <h3 className="text-xl font-bold text-slate-900 mt-1 mb-3">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <GetStartedButton className="px-8 py-4 rounded-lg font-semibold text-white bg-gradient-to-r from-lime-500 to-teal-600 hover:opacity-90 transition">
              Start for Free →
            </GetStartedButton>
            <p className="mt-3 text-sm text-slate-400">No credit card required</p>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

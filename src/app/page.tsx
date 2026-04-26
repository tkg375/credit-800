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
<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-white">
                Your Credit &amp; Finances.
                <br />
                <span className="text-slate-900">One Platform.</span>
                <br />
                <span className="text-slate-900">Start for Free.</span>
              </h1>

              <div className="mt-6 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <GetStartedButton className="px-6 py-3 bg-white text-teal-600 hover:bg-lime-50 rounded-lg font-medium transition text-center">
                  Get Started
                </GetStartedButton>
                <Link
                  href="/plans"
                  className="px-6 py-3 border border-white/50 hover:border-white text-white rounded-lg font-medium transition text-center"
                >
                  Our Plans
                </Link>
                <Link
                  href="/faq"
                  className="px-6 py-3 border border-white/50 hover:border-white text-white rounded-lg font-medium transition text-center"
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

      {/* Features */}
      <section id="how-it-works" className="py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 text-slate-900">
            A Full Financial Toolkit
          </h2>
          <p className="text-slate-500 text-center mb-4 max-w-2xl mx-auto text-sm sm:text-base">
            Every tool you need to improve your credit, manage your money, and build toward your goals.
          </p>
          <p className="text-slate-500 text-center mb-8 sm:mb-16 max-w-2xl mx-auto text-sm sm:text-base">
            From fixing your credit to tracking your budget to preparing for a loan — Credit 800 handles your full financial picture.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Credit Dispute Engine",
                description: "Upload your report and get FCRA-compliant dispute letters citing specific legal sections, tailored to each inaccuracy.",
              },
              {
                title: "Budget Tracker",
                description: "Log income and expenses by category, visualize monthly spending with charts, and stay on top of your finances.",
              },
              {
                title: "Loan Readiness Score",
                description: "See how ready you are for a mortgage, auto loan, or credit card based on your credit score and debt-to-income ratio.",
              },
              {
                title: "Goals Tracker",
                description: "Set credit score, savings, net worth, and debt payoff goals. Track progress with visual bars and get notified when you hit them.",
              },
              {
                title: "Letter Templates Library",
                description: "7 professional dispute and debt letter templates — goodwill, pay-for-delete, cease & desist, debt validation, and more.",
              },
              {
                title: "Credit Freeze Manager",
                description: "Track your freeze status across all 3 bureaus, store your PINs securely, and get direct links to freeze or unfreeze instantly.",
              },
              {
                title: "Debt Payoff Optimizer",
                description: "Choose avalanche or snowball method. See exact payoff timelines and interest savings for every account.",
              },
              {
                title: "Score Simulator",
                description: "Simulate what happens to your score when you pay off a card, open a new account, or resolve a collection.",
              },
              {
                title: "Smart Notifications",
                description: "Get alerted when your score changes, a goal is reached, or a dispute deadline is approaching.",
              },
              {
                title: "Education Hub",
                description: "Searchable, categorized credit education modules with progress tracking to help you understand every aspect of your credit.",
              },
              {
                title: "CFPB Complaint Generator",
                description: "Generate and mail FCRA-compliant CFPB complaints against bureaus and creditors when disputes aren't resolved.",
              },
              {
                title: "Dispute Calendar",
                description: "Track all dispute timelines, deadlines, and round-2 readiness in one place so nothing slips through the cracks.",
              },
              {
                title: "Credit Builder",
                description: "Browse recommended secured cards, credit-builder loans, and store cards filtered to your current credit score range.",
              },
              {
                title: "Credit Monitoring",
                description: "Stay on top of changes to your credit profile with real-time monitoring and instant alerts.",
              },
              {
                title: "Investment Tools",
                description: "Explore investment funds, strategies, and asset allocation calculators to start building wealth alongside your credit.",
              },
              {
                title: "Portfolio Tracker",
                description: "Track your net worth and asset allocation across bank and investment accounts via Plaid integration.",
              },
              {
                title: "Secure Document Vault",
                description: "Upload and organize credit reports, dispute letters, bureau responses, and identity documents by category.",
              },
              {
                title: "Legal Letter Analyzer",
                description: "Paste any demand or collection letter and get an instant breakdown of claims, deadlines, your rights, and a response draft.",
              },
              {
                title: "Autopilot Disputes",
                description: "Fully automate your dispute workflow — scheduled dispute rounds run automatically and bulk-generate mailing-ready letters for you.",
              },
              {
                title: "Bureau Report Viewer",
                description: "See all accounts across all three bureaus with balances, statuses, and one-click dispute flagging.",
              },
              {
                title: "Credit Score Tracker",
                description: "Log and visualize your score trends over time from multiple sources and bureaus, with CSV export.",
              },
              {
                title: "Sample Letter Library",
                description: "Browse FCRA-compliant example letters for collections, charge-offs, late payments, and a dozen other dispute strategies.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-lg transition"
              >
                <h3 className="font-semibold mb-2 text-slate-900">{feature.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-white">
            Take Control of Your Entire Financial Life
          </h2>
          <p className="text-lime-100 mb-2 max-w-xl mx-auto text-sm sm:text-base">
            Credit repair, budgeting, goals, loan readiness — one platform, one login. Get started in minutes.
          </p>
          <p className="text-lime-100 mb-6 sm:mb-8 max-w-2xl mx-auto text-sm sm:text-base">
            Debt validation letters, pay-for-delete templates, statute of limitations calculator, goodwill letters, and more — all included with your subscription.
          </p>
          <GetStartedButton className="inline-block px-6 sm:px-8 py-3 bg-white text-teal-600 hover:bg-slate-100 rounded-lg font-medium transition">
            Get Started
          </GetStartedButton>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

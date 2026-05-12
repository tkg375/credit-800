import type { Metadata } from "next";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { GetStartedButton } from "@/components/AuthModalButtons";

export const metadata: Metadata = {
  title: "How It Works — Credit 800",
  description: "See how Credit 800 works — from signing up free to disputing inaccuracies, managing your finances, and reaching an 800 credit score.",
  alternates: { canonical: "https://credit-800.com/how-it-works" },
  openGraph: {
    title: "How It Works — Credit 800",
    description: "See how Credit 800 works — from signing up free to disputing inaccuracies, managing your finances, and reaching an 800 credit score.",
    url: "https://credit-800.com/how-it-works",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "How Credit 800 Works" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "How It Works — Credit 800",
    description: "See how Credit 800 works — upload your report, get dispute letters, and reach an 800 credit score.",
  },
};

const steps = [
  {
    number: "1",
    title: "Create Your Free Account",
    description: "Sign up in under a minute — no credit card required. You get instant access to the full platform with a free tier that includes dispute letter generation, budget tracking, and your credit dashboard.",
    details: ["No credit card required", "Instant access to all tools", "Free tier included"],
  },
  {
    number: "2",
    title: "Upload Your Credit Report",
    description: "Upload your credit report from Equifax, Experian, or TransUnion (or all three). Credit 800's AI scans every account, identifies disputable inaccuracies, and builds a personalized action plan ranked by score impact.",
    details: ["Supports all 3 bureaus", "AI finds every disputable item", "Ranked action plan by score impact"],
  },
  {
    number: "3",
    title: "Dispute, Improve & Build",
    description: "Generate FCRA-compliant dispute letters with one click — each citing the exact legal sections relevant to your case. Track deadlines with the dispute calendar, automate follow-up rounds, and watch your score climb.",
    details: ["FCRA-compliant letters generated instantly", "Dispute calendar tracks every deadline", "Round 2/3 escalation letters included"],
  },
];

const features = [
  { title: "Credit Dispute Engine", description: "Upload your report and get FCRA-compliant dispute letters citing specific legal sections, tailored to each inaccuracy." },
  { title: "Budget Tracker", description: "Log income and expenses by category, visualize monthly spending with charts, and stay on top of your finances." },
  { title: "Loan Readiness Score", description: "See how ready you are for a mortgage, auto loan, or credit card based on your credit score and debt-to-income ratio." },
  { title: "Goals Tracker", description: "Set credit score, savings, net worth, and debt payoff goals. Track progress with visual bars and get notified when you hit them." },
  { title: "Letter Templates Library", description: "7 professional dispute and debt letter templates — goodwill, pay-for-delete, cease & desist, debt validation, and more." },
  { title: "Credit Freeze Manager", description: "Track your freeze status across all 3 bureaus, store your PINs securely, and get direct links to freeze or unfreeze instantly." },
  { title: "Debt Payoff Optimizer", description: "Choose avalanche or snowball method. See exact payoff timelines and interest savings for every account." },
  { title: "Score Simulator", description: "Simulate what happens to your score when you pay off a card, open a new account, or resolve a collection." },
  { title: "Smart Notifications", description: "Get alerted when your score changes, a goal is reached, or a dispute deadline is approaching." },
  { title: "Education Hub", description: "Searchable, categorized credit education modules with progress tracking to help you understand every aspect of your credit." },
  { title: "CFPB Complaint Generator", description: "Generate and mail FCRA-compliant CFPB complaints against bureaus and creditors when disputes aren't resolved." },
  { title: "Dispute Calendar", description: "Track all dispute timelines, deadlines, and round-2 readiness in one place so nothing slips through the cracks." },
  { title: "Credit Builder", description: "Browse recommended secured cards, credit-builder loans, and store cards filtered to your current credit score range." },
  { title: "Secure Document Vault", description: "Upload and organize credit reports, dispute letters, bureau responses, and identity documents by category." },
  { title: "Legal Letter Analyzer", description: "Paste any demand or collection letter and get an instant breakdown of claims, deadlines, your rights, and a response draft." },
{ title: "Bureau Report Viewer", description: "See all accounts across all three bureaus with balances, statuses, and one-click dispute flagging." },
  { title: "Credit Score Tracker", description: "Log and visualize your score trends over time from multiple sources and bureaus, with CSV export." },
  { title: "Sample Letter Library", description: "Browse FCRA-compliant example letters for collections, charge-offs, late payments, and a dozen other dispute strategies." },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <MarketingNav />
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-14 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3">How Credit 800 Works</h1>
          <p className="text-lime-100 max-w-2xl mx-auto text-sm sm:text-base">
            Fix your credit, manage your finances, and build toward your goals — one platform, three simple steps.
          </p>
        </div>
      </div>

      {/* 3-Step process */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-10">
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-extrabold text-white mb-5 shrink-0"
                  style={{ background: "linear-gradient(135deg, #65A30D, #0F766E)", boxShadow: "0 0 24px rgba(15,118,110,0.30)" }}
                >
                  {step.number}
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-3">{step.title}</h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">{step.description}</p>
                <ul className="space-y-1.5 mt-auto">
                  {step.details.map((d) => (
                    <li key={d} className="flex items-center gap-2 text-xs text-slate-500">
                      <svg className="w-3.5 h-3.5 text-teal-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Connector: everything works together */}
      <section className="py-12 px-4 sm:px-6" style={{ background: "#F8FFF8" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
            Everything Works Together
          </h2>
          <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            Credit 800 is not just a dispute tool — it&apos;s a complete financial platform. Your disputes feed your score tracker. Your score tracker feeds your loan readiness. Your budget feeds your goals. Every tool shares context so you always know exactly where you stand and what to do next.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {["Credit Repair", "Budget Tracking", "Loan Readiness", "Debt Payoff", "Goals", "Score Tracking"].map((tag) => (
              <span
                key={tag}
                className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: "rgba(15,118,110,0.08)", color: "#0F766E", border: "1px solid rgba(15,118,110,0.18)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Full toolkit */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
              A Full Financial Toolkit
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-sm sm:text-base">
              Every tool you need to improve your credit, manage your money, and build toward your goals — from fixing your credit to tracking your budget to preparing for a loan.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="border border-slate-200 rounded-xl p-5 hover:border-teal-300 hover:shadow-md transition"
              >
                <h3 className="font-semibold mb-2 text-slate-900">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600 py-14 sm:py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Ready to Get Started?
          </h2>
          <p className="text-lime-100 mb-8 text-sm sm:text-base leading-relaxed">
            Create your free account and start disputing inaccuracies, tracking your budget, and building toward your goals today.
          </p>
          <GetStartedButton className="px-8 py-3 bg-white text-teal-600 hover:bg-lime-50 rounded-lg font-semibold transition">
            Get Started
          </GetStartedButton>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

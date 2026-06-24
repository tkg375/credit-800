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
    description: "Sign up in under a minute — no credit card required. Start with the full DIY toolkit, or activate Autopilot and let us handle the entire dispute process for you.",
    details: ["No credit card required", "Instant access to all tools", "Autopilot available immediately"],
  },
  {
    number: "2",
    title: "Autopilot Pulls Your Report & Gets to Work",
    description: "With one FCRA authorization, Autopilot pulls your credit report, identifies every disputable inaccuracy, generates FCRA-compliant letters citing specific legal sections, and physically mails them to the bureaus — no uploads needed.",
    details: ["Automatic soft-pull credit report", "AI finds every disputable item", "Letters physically mailed via USPS"],
  },
  {
    number: "3",
    title: "Watch Your Score Climb — Hands Free",
    description: "Autopilot repeats the cycle every 30 days. Track disputes, monitor your score progress, and use the full financial toolkit alongside Autopilot — all while we do the heavy lifting.",
    details: ["Monthly automated dispute cycles", "Full score tracking & timeline", "Round 2/3 escalation included"],
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
      <div className="bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-14 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 border border-white/30 rounded-full text-white text-xs font-semibold mb-4">
            <span className="w-2 h-2 bg-[#00d4aa] rounded-full animate-pulse" />
            Autopilot is Now Live
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3">How Credit 800 Works</h1>
          <p className="text-white/80 max-w-2xl mx-auto text-sm sm:text-base">
            Start free and dispute manually, or activate Autopilot and let us handle everything — report pulls, letters, and mailing — every month.
          </p>
        </div>
      </div>

      {/* 3-Step process */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-10">
            {steps.map((step, i) => {
              const bgs = [
                { background: "linear-gradient(135deg, #1a3fd4, #1a3fd4)", boxShadow: "0 0 24px rgba(26,63,212,0.35)" },
                { background: "linear-gradient(135deg, #1a3fd4, #00a8cc)", boxShadow: "0 0 24px rgba(26,63,212,0.25)" },
                { background: "linear-gradient(135deg, #00a8cc, #00d4aa)", boxShadow: "0 0 24px rgba(0,212,170,0.35)" },
              ];
              return (
              <div key={step.number} className="flex flex-col">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-extrabold text-white mb-5 shrink-0"
                  style={bgs[i]}
                >
                  {step.number}
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-3">{step.title}</h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">{step.description}</p>
                <ul className="space-y-1.5 mt-auto">
                  {step.details.map((d) => (
                    <li key={d} className="flex items-center gap-2 text-xs text-slate-500">
                      <svg className="w-3.5 h-3.5 text-[#1a3fd4] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Connector: everything works together */}
      <section className="py-12 px-4 sm:px-6" style={{ background: "#F0F4FF" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
            Autopilot + Self Service, Together
          </h2>
          <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            Autopilot handles the heavy lifting — pulling your report, generating letters, and mailing them every month. The full Self Service toolkit is still available so you can track your score, monitor disputes, and plan your financial goals alongside the automation.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {["Autopilot Disputes", "Score Tracking", "Loan Readiness", "Debt Payoff", "Goals"].map((tag) => (
              <span
                key={tag}
                className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: "rgba(26,63,212,0.08)", color: "#1a3fd4", border: "1px solid rgba(26,63,212,0.18)" }}
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
              Everything Included with Your Plan
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-sm sm:text-base">
              Autopilot handles the dispute cycle automatically. Self Service users get the full toolkit to manage their own credit repair journey.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="border border-slate-200 rounded-xl p-5 hover:border-[#1a3fd4] hover:shadow-md transition"
              >
                <h3 className="font-semibold mb-2 text-slate-900">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] py-14 sm:py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Ready to Put Your Credit on Autopilot?
          </h2>
          <p className="text-white/80 mb-8 text-sm sm:text-base leading-relaxed">
            Start free or activate Autopilot and let us handle the entire dispute process — report pulls, letters, and USPS mailing — every month.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <GetStartedButton className="px-8 py-3 bg-white text-[#1a3fd4] hover:bg-blue-50 rounded-lg font-semibold transition">
              Start Now →
            </GetStartedButton>
            <a href="/plans" className="px-8 py-3 border border-white/50 hover:border-white text-white rounded-lg font-semibold transition">
              See Pricing →
            </a>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

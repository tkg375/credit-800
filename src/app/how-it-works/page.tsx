import type { Metadata } from "next";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { GetStartedButton } from "@/components/AuthModalButtons";

export const metadata: Metadata = {
  title: "How It Works — Credit 800",
  description: "See how Credit 800 works — upload your report, get AI-written dispute letters, and reach an 800 credit score. 100% free.",
  alternates: { canonical: "https://credit-800.com/how-it-works" },
  openGraph: {
    title: "How It Works — Credit 800",
    description: "See how Credit 800 works — upload your report, get AI-written dispute letters, and reach an 800 credit score. 100% free.",
    url: "https://credit-800.com/how-it-works",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "How Credit 800 Works" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "How It Works — Credit 800",
    description: "Upload your report, get AI-written dispute letters, and reach an 800 credit score. Free.",
  },
};

const steps = [
  {
    number: "1",
    title: "Create Your Free Account",
    description: "Sign up in under a minute — no credit card required. Get instant access to every tool in the platform, completely free.",
    details: ["No credit card required", "Instant access to all tools", "No subscription needed"],
  },
  {
    number: "2",
    title: "Upload Your Credit Report & Get AI Analysis",
    description: "Upload your PDF credit report from Equifax, Experian, or TransUnion. Our AI reads every line, identifies every disputable inaccuracy, and generates custom FCRA-compliant dispute letters — citing specific legal sections for each item.",
    details: ["AI finds every disputable item", "Letters cite FCRA § 611, FDCPA § 809", "Personalized to your account details"],
  },
  {
    number: "3",
    title: "Send Letters & Watch Your Score Climb",
    description: "Review and edit your AI-written letters, then mail them yourself or use our one-click USPS mailing for $2/letter. Track bureau responses, upload replies for AI analysis, and escalate if needed.",
    details: ["Mail yourself or send via USPS for $2", "Track dispute status and deadlines", "AI analyzes every bureau response"],
  },
];

const features = [
  { title: "AI Dispute Letter Writer", description: "GPT-4o writes personalized, legally-cited dispute letters for each negative item — citing FCRA § 611, FDCPA § 809, and the specific facts of your account." },
  { title: "Credit Report Analyzer", description: "Upload your PDF report and get a full breakdown of every disputable item with removal strategies ranked by success rate." },
  { title: "Debt Collector Letter Analyzer", description: "Upload any collection letter and get an instant breakdown of your rights, FDCPA violations, and a ready-to-send response letter." },
  { title: "Bureau Response Analyzer", description: "Upload bureau responses and get AI analysis of whether the investigation was legally proper, plus a follow-up letter if needed." },
  { title: "USPS Letter Mailing", description: "Send your dispute letters via USPS certified mail directly from the app for $2/letter — no stamps, no post office." },
  { title: "Budget Tracker", description: "Log income and expenses by category, visualize monthly spending with charts, and stay on top of your finances." },
  { title: "Loan Readiness Score", description: "See how ready you are for a mortgage, auto loan, or credit card based on your credit score and debt-to-income ratio." },
  { title: "Goals Tracker", description: "Set credit score, savings, net worth, and debt payoff goals. Track progress with visual bars and get notified when you hit them." },
  { title: "Letter Templates Library", description: "Professional dispute and debt letter templates — goodwill, pay-for-delete, cease & desist, debt validation, and more." },
  { title: "Credit Freeze Manager", description: "Track your freeze status across all 3 bureaus, store your PINs securely, and get direct links to freeze or unfreeze instantly." },
  { title: "Debt Payoff Optimizer", description: "Choose avalanche or snowball method. See exact payoff timelines and interest savings for every account." },
  { title: "Score Simulator", description: "Simulate what happens to your score when you pay off a card, open a new account, or resolve a collection." },
  { title: "Smart Notifications", description: "Get alerted when your score changes, a goal is reached, or a dispute deadline is approaching." },
  { title: "Education Hub", description: "Searchable, categorized credit education modules to help you understand every aspect of your credit." },
  { title: "CFPB Complaint Generator", description: "Generate and mail FCRA-compliant CFPB complaints against bureaus and creditors when disputes aren't resolved." },
  { title: "Dispute Calendar", description: "Track all dispute timelines, deadlines, and escalation dates in one place so nothing slips through the cracks." },
  { title: "Secure Document Vault", description: "Upload and organize credit reports, dispute letters, bureau responses, and identity documents by category." },
  { title: "Credit Score Tracker", description: "Log and visualize your score trends over time from multiple sources and bureaus, with CSV export." },
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
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            100% Free — No Subscription
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3">How Credit 800 Works</h1>
          <p className="text-white/80 max-w-2xl mx-auto text-sm sm:text-base">
            Upload your credit report, get AI-written dispute letters citing real credit law, and send them directly to the bureaus — all free.
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

      {/* Value prop banner */}
      <section className="py-12 px-4 sm:px-6" style={{ background: "#F0F4FF" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
            AI That Knows Credit Law
          </h2>
          <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            Every letter is written by GPT-4o with full knowledge of FCRA, FDCPA, and HIPAA — citing the specific statute, the exact account details, and the right legal argument for each negative item. Not templates. Real letters.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {["FCRA § 611 Disputes", "FDCPA § 809 Validation", "7-Year Rule", "Pay for Delete", "HIPAA Medical", "Bureau Escalation"].map((tag) => (
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
              Everything Included — Always Free
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-sm sm:text-base">
              Every tool in Credit 800 is free to use. No tiers, no paywalls, no subscription required.
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
            Start Fixing Your Credit Today
          </h2>
          <p className="text-white/80 mb-8 text-sm sm:text-base leading-relaxed">
            Upload your report, get AI-written dispute letters, and start your path to 800 — completely free.
          </p>
          <GetStartedButton className="px-8 py-3 bg-white text-[#1a3fd4] hover:bg-blue-50 rounded-lg font-semibold transition">
            Get Started Free →
          </GetStartedButton>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

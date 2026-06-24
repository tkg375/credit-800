import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { GetStartedButton } from "@/components/AuthModalButtons";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Credit 800 — Credit Repair Platform",
  description:
    "Credit 800 was built to give every American the same credit repair tools that financial professionals use — grounded in FCRA law and designed to be affordable.",
  openGraph: {
    title: "About Credit 800 — Credit Repair Platform",
    description:
      "Learn the story behind Credit 800: why we built it, what makes it different, and our mission to make credit repair accessible to everyone.",
    url: "https://credit-800.com/about",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "About Credit 800" }],
  },
  alternates: {
    canonical: "https://credit-800.com/about",
  },
};

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About Credit 800",
  description:
    "Credit 800 analyzes credit reports, generates FCRA-compliant dispute letters, and builds personalized action plans to help people reach an 800 credit score.",
  url: "https://credit-800.com/about",
  publisher: {
    "@type": "Organization",
    name: "Credit 800",
    url: "https://credit-800.com",
    logo: { "@type": "ImageObject", url: "https://credit-800.com/og-image.png" },
  },
};

const features = [
  {
    title: "Built Around Credit Law",
    description:
      "Credit 800 analyzes your credit report against FCRA requirements and generates dispute letters that cite the specific legal sections relevant to each item — not boilerplate templates.",
  },
  {
    title: "Autopilot — Fully Automated",
    description:
      "Our Autopilot plan pulls your credit report, generates FCRA-compliant dispute letters, and mails them to the bureaus every month — automatically. No uploads, no manual steps.",
  },
  {
    title: "Free to Start",
    description:
      "The Self Service plan is free for everyone — no subscription, no credit card required. Upgrade to Autopilot at $49/month when you want us to handle everything for you.",
  },
  {
    title: "Your Data, Your Control",
    description:
      "We don't sell your data. We don't use your credit report information to train models. You can export, delete, or revoke access at any time.",
  },
];

const stats = [
  { value: "22+", label: "Tools included" },
  { value: "Autopilot", label: "Now live" },
  { value: "FCRA", label: "Legally grounded" },
  { value: "Free", label: "To get started" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <MarketingNav />
      </header>

      <div className="bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-14 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3">About Credit 800</h1>
          <p className="text-lime-100 max-w-2xl mx-auto text-sm sm:text-base">
            We built the credit repair tools we wish existed — affordable, automated, and grounded in actual law.
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">

        {/* Mission */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-5">Our Mission</h2>
          <div className="space-y-4 text-slate-600 text-sm sm:text-base leading-relaxed">
            <p>
              Credit scores determine the interest rate on your mortgage, whether your apartment application is approved, and sometimes even whether you get a job. A 100-point difference in your score can cost or save you tens of thousands of dollars over a lifetime of borrowing.
            </p>
            <p>
              For years, the only options for fixing your credit were: pay a credit repair company $100/month or more, navigate the bureaucracy alone with generic dispute letter templates, or simply hope your score improved on its own. None of these options worked well.
            </p>
            <p>
              Credit 800 was built to change that. We do what professional credit counselors do — analyze your report, identify every disputable inaccuracy, generate legally-grounded letters citing the exact FCRA and FDCPA sections that apply to your situation, and build a personalized action plan. All at a price that makes sense for everyone, not just people who can afford $100/month in fees.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="mb-16">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="border border-slate-200 rounded-xl p-5 text-center">
                <div className={`font-bold bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] bg-clip-text text-transparent mb-1 ${s.value.length > 6 ? "text-lg sm:text-xl" : "text-2xl sm:text-3xl"}`}>
                  {s.value}
                </div>
                <div className="text-xs sm:text-sm text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* How it's different */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-8">What Makes Credit 800 Different</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((f) => (
              <div key={f.title} className="border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition">
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What we are and aren't */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-5">What Credit 800 Is — and Isn't</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-5">
            <h3 className="font-semibold text-amber-800 mb-2">Educational Tool, Not a Credit Repair Organization</h3>
            <p className="text-sm text-amber-700 leading-relaxed">
              Credit 800 is an educational platform that gives you the information, letters, and tools to repair your own credit — exercising rights that already belong to you under federal law. We are not a credit repair organization as defined by the Credit Repair Organizations Act (CROA) and do not make guarantees about credit score improvements. No one can legally guarantee credit score improvements, and anyone who does is misleading you.
            </p>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
              <span>We generate legally-grounded dispute letters based on your specific credit report</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
              <span>We help you understand every aspect of your credit and what's affecting your score</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
              <span>Autopilot acts on your behalf under written FCRA authorization — pulling your report, generating letters, and mailing them automatically</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5 flex-shrink-0">✗</span>
              <span>We don't promise specific score increases or guarantee item removals</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5 flex-shrink-0">✗</span>
              <span>We don't provide legal advice — we provide legal information based on publicly available law</span>
            </div>
          </div>
        </section>

        {/* Tech */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-5">The Technology</h2>
          <div className="space-y-4 text-slate-600 text-sm sm:text-base leading-relaxed">
            <p>
              Credit 800 is built on a modern, secure tech stack. Credit report analysis and dispute letter generation runs on advanced automated processing technology. Your data is stored securely with encryption at rest and in transit. We use Stripe for payment processing — we never see or store your full card number.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Ready to Put Your Credit on Autopilot?</h2>
          <p className="text-lime-100 text-sm mb-6 max-w-md mx-auto">
            Start free or activate Autopilot and let us handle the entire dispute process every month.
          </p>
          <GetStartedButton className="px-8 py-3 bg-white text-[#1a3fd4] hover:bg-blue-50 rounded-lg font-medium transition">
            Start Now →
          </GetStartedButton>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

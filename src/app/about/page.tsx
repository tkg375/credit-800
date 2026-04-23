import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
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
    title: "Everything in One Place",
    description:
      "Credit disputes, budget tracking, debt payoff planning, loan readiness scores, score simulation, and more — tools that used to require separate subscriptions, in a single platform.",
  },
  {
    title: "Transparent Pricing",
    description:
      "A single flat subscription with no hidden fees, no per-letter charges beyond optional USPS mailing, and no upsells. You know exactly what you're paying and what you're getting.",
  },
  {
    title: "Your Data, Your Control",
    description:
      "We don't sell your data. We don't use your credit report information to train models. You can export, delete, or revoke access at any time.",
  },
];

const stats = [
  { value: "22+", label: "Tools included" },
  { value: "7", label: "Letter types" },
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

      <div className="bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600">
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
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-lime-500 to-teal-600 bg-clip-text text-transparent mb-1">
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
              <span>Our Autopilot plan automates dispute submissions with your explicit written consent</span>
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
            <p>
              Our Autopilot feature performs monthly soft credit pulls (which do not affect your score) with your explicit written consent under FCRA § 604(a)(2). Every automated action is logged in an immutable audit trail that you can access at any time.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Ready to Get Started?</h2>
          <p className="text-lime-100 text-sm mb-6 max-w-md mx-auto">
            Upload your credit report, get your personalized dispute letters and action plan, and take control of your credit.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="px-8 py-3 bg-white text-teal-600 hover:bg-lime-50 rounded-lg font-medium transition">
              Get Started Free
            </Link>
            <Link href="/plans" className="px-8 py-3 border border-white/60 hover:border-white text-white rounded-lg font-medium transition">
              View Plans
            </Link>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

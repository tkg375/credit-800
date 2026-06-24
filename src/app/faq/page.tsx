import Link from "next/link";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MarketingNav } from "@/components/MarketingNav";
import { GetStartedButton } from "@/components/AuthModalButtons";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ — Frequently Asked Questions",
  description: "Get answers to common questions about Credit 800, FCRA dispute letters, credit repair, and how our platform works.",
  openGraph: {
    title: "FAQ — Credit 800 Frequently Asked Questions",
    description: "Get answers to common questions about Credit 800, FCRA dispute letters, credit repair, and how our platform works.",
    url: "https://credit-800.com/faq",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Credit 800 FAQ" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FAQ — Credit 800 Frequently Asked Questions",
    description: "Get answers to common questions about Credit 800, FCRA dispute letters, credit repair, and how our platform works.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://credit-800.com/faq",
  },
};

const sections = [
  {
    title: "Getting Started",
    faqs: [
      {
        q: "Is Credit 800 really free?",
        a: "The Self Service plan is completely free — no credit card required. You get unlimited dispute letters, the full financial toolkit, and optional USPS mailing for $2/letter. We also offer Autopilot at $49/month, which pulls your credit report and handles the entire dispute process for you automatically every month.",
      },
      {
        q: "What's included in Credit 800?",
        a: "Self Service (free): unlimited dispute letters, budget tracker, debt payoff optimizer, credit score simulator, loan readiness calculator, goals tracker, document vault, CFPB complaint generator, letter templates library, creditor letter analyzer, and smart notifications. Autopilot ($49/mo): everything in Self Service plus automatic monthly credit pulls, auto-generated dispute letters, and USPS mailing of up to 10 letters per month — hands-free.",
      },
      {
        q: "How is Credit 800 different from hiring a credit repair company?",
        a: "Traditional credit repair companies charge $79–$149/month and do the same thing you can do yourself — disputing items under the FCRA. Credit 800's Self Service plan gives you the same tools for free. Our Autopilot plan at $49/month fully automates the process — pulling your report, generating letters, and mailing them — at a fraction of what other companies charge.",
      },
    ],
  },
  {
    title: "Autopilot",
    faqs: [
      {
        q: "What is Autopilot?",
        a: "Autopilot is our fully automated credit repair plan. Once you activate it, we pull your credit report each month, identify every disputable item, generate FCRA-compliant dispute letters, and physically mail them to the credit bureaus — all without you lifting a finger. It runs every 30 days until your credit is clean.",
      },
      {
        q: "How does Autopilot pull my credit report?",
        a: "Autopilot uses a soft inquiry (which does not affect your credit score) to pull your TransUnion report each cycle. You provide one-time written FCRA authorization during setup — this is your legal permission for us to act on your behalf under FCRA § 604(a)(2).",
      },
      {
        q: "Can I cancel Autopilot?",
        a: "Yes, anytime. Cancel from your profile page or by contacting support. There are no contracts and no cancellation fees. Your remaining access continues through the end of your current billing period.",
      },
      {
        q: "What happens after Autopilot mails my letters?",
        a: "You can track every dispute, letter, and mailing status from your dashboard. When bureaus respond, you'll be notified and can view the response. If items aren't removed, Autopilot can generate escalation letters in the next cycle.",
      },
    ],
  },
  {
    title: "Credit Repair & Disputes",
    faqs: [
      {
        q: "Is this legit? I've been burned by credit repair scams before.",
        a: "We understand the skepticism — the credit repair industry is full of companies that charge hundreds of dollars and deliver nothing. Credit 800 is different. On Self Service, you're in full control. On Autopilot, we act on your behalf under a written FCRA authorization you can revoke at any time. No shady contracts, no hidden fees, and no promises we can't keep.",
      },
      {
        q: "How fast will I see results?",
        a: "Credit bureaus are required to respond to disputes within 30 days (sometimes 45 days if additional documentation is submitted). Many users see their first removals within 30–60 days. Results depend on your specific situation — inaccurate items, outdated accounts, and unverifiable collections are typically the fastest to remove.",
      },
      {
        q: "Do I need to send letters myself?",
        a: "On Self Service, you submit letters yourself — either directly on the bureau's website, via certified mail, or using our $2/letter USPS service. On Autopilot, we handle all mailing automatically — nothing for you to do.",
      },
      {
        q: "What if the bureau doesn't respond or denies my dispute?",
        a: "If a bureau denies your dispute, the next step is a Method of Verification letter demanding they explain exactly how they verified the item. If they still fail to respond within 30 days, the item must be removed by law. Credit 800 includes escalation letter templates for Self Service users, and Autopilot handles escalation automatically.",
      },
      {
        q: "Does disputing items hurt my credit score?",
        a: "No. Filing a dispute does not trigger a hard inquiry and will not lower your score. In fact, successfully removing negative items almost always results in a score increase.",
      },
    ],
  },
  {
    title: "Your Legal Rights",
    faqs: [
      {
        q: "What is the FCRA and how does it protect me?",
        a: "The Fair Credit Reporting Act (FCRA) is a federal law that gives you the right to dispute any inaccurate, incomplete, or unverifiable information on your credit report. Credit bureaus are required by law to investigate your disputes within 30 days and remove anything they cannot verify. Credit 800 generates dispute letters that cite specific FCRA sections so your disputes carry legal weight.",
      },
      {
        q: "What is the FDCPA and what rights do I have with debt collectors?",
        a: "The Fair Debt Collection Practices Act (FDCPA) protects you from abusive, deceptive, or unfair debt collection practices. Under the FDCPA, you have the right to request debt validation (proof the debt is yours and the amount is correct), dispute the debt in writing, and demand collectors stop contacting you. Our letter templates include FDCPA-compliant cease & desist and debt validation letters.",
      },
    ],
  },
  {
    title: "Privacy & Security",
    faqs: [
      {
        q: "Is my personal information safe?",
        a: "Yes. All data is encrypted in transit and at rest using 256-bit encryption. We never sell your data or share it with third parties. Your uploaded documents are stored securely and only accessible by you.",
      },
      {
        q: "Do I need my SSN to use Credit 800?",
        a: "It depends on your plan. Self Service users upload their own credit report — no SSN required. Autopilot users provide identity verification (including SSN) so we can pull your credit report on your behalf each month under FCRA authorization. Your SSN is used solely for the credit pull and is never stored in plain text or shared with third parties.",
      },

    ],
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: sections.flatMap((section) =>
    section.faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    }))
  ),
};

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <MarketingNav />
      </header>
      <div className="bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-14 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3">Frequently Asked Questions</h1>
          <p className="text-lime-100 max-w-2xl mx-auto text-sm sm:text-base">
            Everything you need to know before getting started with Credit 800.
          </p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="space-y-12">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#1a3fd4] mb-4">{section.title}</h2>
              <div className="space-y-3">
                {section.faqs.map((item, i) => (
                  <details key={i} className="group border border-slate-200 rounded-xl overflow-hidden">
                    <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer font-medium text-sm text-slate-800 hover:bg-slate-50 transition list-none">
                      {item.q}
                      <svg className="w-4 h-4 text-slate-400 shrink-0 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="px-5 pb-5 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Still have questions?</h2>
          <p className="text-slate-300 text-sm mb-5">Our support team is happy to help.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/support" className="px-6 py-2.5 border border-white/30 text-white hover:border-white rounded-lg font-medium transition text-sm">
              Contact Support
            </Link>
            <GetStartedButton className="px-6 py-2.5 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-lg font-medium hover:opacity-90 transition text-sm">
              Get Started
            </GetStartedButton>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}

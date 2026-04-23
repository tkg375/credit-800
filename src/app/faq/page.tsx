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
    title: "Plans & Pricing",
    faqs: [
      {
        q: "Why is Self Service free?",
        a: "We believe everyone deserves access to the tools that credit repair companies charge $100/month for. Self Service is completely free — create an account and start generating FCRA-compliant dispute letters instantly. The only charge on Self Service is if you choose to mail a dispute via USPS ($2/letter) — and that's entirely optional. For those who want us to handle everything automatically, our Autopilot plan is $49/month — comparable to a traditional credit repair service but with full transparency and no long-term contracts.",
      },
      {
        q: "What's included in the Self Service plan?",
        a: "Everything you need to run your own credit repair — completely free. Unlimited dispute letters, budget tracker, debt payoff optimizer, credit score simulator, loan readiness calculator, goals tracker, document vault, CFPB complaint generator, letter templates library (goodwill, pay-for-delete, cease & desist, debt validation, and more), creditor letter analyzer, and smart notifications. No feature gates, no usage limits. You can also mail disputes via USPS for $2/letter.",
      },
      {
        q: "What is the Autopilot plan?",
        a: "Autopilot is our fully hands-free credit repair tier — we do everything for you. It includes everything in Self Service plus a monthly soft-pull credit report, auto-generated dispute letters, automatic USPS mailing of up to 10 letters per month, hands-free VantageScore tracking, FCRA-compliant full automation, a compliance audit trail, and priority support. You don't need to log in, upload anything, or write a single letter. We handle the entire dispute cycle on your behalf.",
      },
      {
        q: "What's the difference between Self Service and Autopilot?",
        a: "Self Service (Free) gives you all the tools to run your own credit repair — you upload your report, generate letters, and send them yourself. Autopilot ($49/mo) is fully automated — we pull your credit report monthly, generate the dispute letters, and mail them to the bureaus on your behalf. You just sit back. Self Service is best if you want full control at no cost. Autopilot is best if you want a true set-it-and-forget-it experience.",
      },
      {
        q: "When will Autopilot be available?",
        a: "Autopilot is coming soon. We're in the final stages of building and testing the full automation pipeline to ensure it's FCRA-compliant and reliable before we open it up. Sign up for Self Service now and you'll be notified as soon as Autopilot launches — existing subscribers will be able to upgrade with one click.",
      },
      {
        q: "Can I upgrade from Self Service to Autopilot later?",
        a: "Yes. When Autopilot launches, you'll be able to upgrade directly from your account settings. Your existing data, dispute history, and documents will carry over automatically — no need to start from scratch.",
      },
      {
        q: "How is Credit 800 different from hiring a credit repair company?",
        a: "Traditional credit repair companies charge $79–$149/month and do the same thing you can do yourself — disputing items under the FCRA. Many also require long-term contracts. Credit 800's Self Service plan gives you the same tools for free. Our Autopilot plan ($49/mo) offers full automation comparable to a credit repair service — at a fraction of the cost and with full transparency into every letter sent.",
      },
      {
        q: "Can I cancel Autopilot anytime?",
        a: "Yes. No contracts, no cancellation fees, no questions asked. Cancel from your account settings at any time. You keep full Autopilot access until the end of your current billing period. Self Service is free and always available.",
      },
    ],
  },
  {
    title: "Credit Repair & Disputes",
    faqs: [
      {
        q: "Is this legit? I've been burned by credit repair scams before.",
        a: "We understand the skepticism — the credit repair industry is full of companies that charge hundreds of dollars and deliver nothing. Credit 800 is different. On the Self Service plan, you're in full control — you generate your own FCRA-compliant dispute letters, send them yourself, and keep 100% of the results. On the Autopilot plan, we handle everything for you transparently — you can see every letter generated and every action taken. Either way, no shady contracts, no per-letter charges, and no promises we can't keep.",
      },
      {
        q: "How fast will I see results?",
        a: "Credit bureaus are required to respond to disputes within 30 days (sometimes 45 days if you submit additional documentation). Many users see their first removals within 30–60 days. Results depend on your specific situation — inaccurate items, outdated accounts, and unverifiable collections are typically the fastest to remove. Payment history and utilization improvements can reflect on your report within 1–2 billing cycles.",
      },
      {
        q: "Do I need to send letters myself?",
        a: "On the Self Service plan, you copy the letter and submit it directly on the bureau's website or via certified mail. You can also use our USPS mail service ($2/letter) where we print and mail the dispute with trackable delivery confirmation. On the Autopilot plan, we handle all mailing automatically — up to 10 letters per month included.",
      },
      {
        q: "What if the bureau doesn't respond or denies my dispute?",
        a: "If a bureau denies your dispute, the next step is a Method of Verification letter demanding they explain exactly how they verified the item — this forces a more thorough reinvestigation. If they still fail to respond within 30 days, the item must be removed by law. On Self Service, Credit 800 includes escalation letter templates so you can send these yourself. On Autopilot, we detect denials and automatically generate and mail the escalation letter on your behalf.",
      },
      {
        q: "Does disputing items hurt my credit score?",
        a: "No. Filing a dispute does not trigger a hard inquiry and will not lower your score. In fact, successfully removing negative items almost always results in a score increase. The only way disputing can backfire is if you dispute accurate, positive information — so stick to disputing inaccuracies and unverifiable items.",
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
        a: "It depends on your plan. Self Service: no SSN required. You upload your own credit report (available free at AnnualCreditReport.com) and Credit 800 analyzes it — your SSN is never requested or stored. Autopilot: your SSN is required so we can pull your credit report automatically each month on your behalf. It is stored encrypted using 256-bit encryption, never shared with third parties, and used solely to retrieve your credit report.",
      },
      {
        q: "Does Autopilot store my credit report data?",
        a: "Yes — Autopilot pulls a soft-pull credit report monthly to generate your dispute letters. This data is encrypted, stored securely, and only used to power your dispute automation. It is never shared with third parties or used for any other purpose. You can request deletion of your data at any time.",
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
      <div className="bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600">
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
              <h2 className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-4">{section.title}</h2>
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
            <GetStartedButton className="px-6 py-2.5 bg-gradient-to-r from-lime-500 to-teal-600 text-white rounded-lg font-medium hover:opacity-90 transition text-sm">
              Get Started — Free
            </GetStartedButton>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}

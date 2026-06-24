import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { AutopilotHero } from "@/components/AutopilotHero";
import { HeroDataStream } from "@/components/HeroDataStream";
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

      <div className="bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] relative overflow-hidden">
        {/* Data stream background */}
        <HeroDataStream />
        {/* Hero */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-16 pb-16 sm:pb-20">
          <AutopilotHero />

          {/* Scroll indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce">
            <span className="text-white/50 text-xs tracking-widest uppercase">Scroll</span>
            <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </section>
      </div>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 text-[#1a3fd4] bg-blue-50">
              How Autopilot Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Set it up once. Let it run.
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              Autopilot handles the full dispute cycle for you — no manual work, no follow-up.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: (
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                ),
                title: "Authorize Autopilot",
                desc: "Give one-time FCRA authorization. Autopilot pulls your credit report and begins working on your behalf — no uploads needed.",
              },
              {
                step: "02",
                icon: (
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                  </svg>
                ),
                title: "Letters Generated & Mailed",
                desc: "Autopilot finds every disputable item, generates FCRA-compliant letters citing specific legal sections, and physically mails them to the bureaus.",
              },
              {
                step: "03",
                icon: (
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                ),
                title: "Watch Your Score Climb",
                desc: "Track every dispute, monitor your score progress, and let Autopilot repeat the cycle monthly until you hit 800.",
              },
            ].map((item, i) => {
              const gradients = [
                "from-[#1a3fd4] to-[#1a3fd4]",
                "from-[#1a3fd4] to-[#00d4aa]",
                "from-[#00d4aa] to-[#00d4aa]",
              ];
              const iconBgs = ["bg-blue-50 text-[#1a3fd4]", "bg-cyan-50 text-[#0e7fd4]", "bg-teal-50 text-[#00d4aa]"];
              return (
                <div
                  key={item.step}
                  className="rounded-2xl p-8 border border-slate-100 bg-slate-50"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${iconBgs[i]}`}>
                    {item.icon}
                  </div>
                  <span className={`text-sm font-black tracking-widest bg-gradient-to-r ${gradients[i]} bg-clip-text text-transparent`}>{item.step}</span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1 mb-3">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <GetStartedButton className="px-8 py-4 rounded-lg font-semibold text-white bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] hover:opacity-90 transition">
              Start Now →
            </GetStartedButton>
          </div>
        </div>
      </section>

      {/* Feature Breakdown */}
      <section className="bg-slate-50 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 text-[#1a3fd4] bg-blue-50">What Autopilot Does</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Everything. Every Month. Automatically.</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">No uploads. No manual letters. No follow-up. Autopilot runs the full dispute cycle for you.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", title: "Soft-Pull Credit Report", desc: "Autopilot pulls your TransUnion report every 30 days using a soft inquiry — no impact to your score." },
              { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", title: "FCRA-Compliant Letters", desc: "Each dispute letter cites the specific FCRA and FDCPA sections that apply — not generic templates." },
              { icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", title: "Physical USPS Mailing", desc: "Letters are printed and mailed via USPS with delivery confirmation — the same way the bureaus require." },
              { icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", title: "Score Tracking", desc: "Every point gained is logged. See your score trend over time and exactly what changed after each run." },
              { icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", title: "Automatic Escalation", desc: "If a bureau doesn't respond or denies a dispute, Autopilot generates escalation letters in the next cycle." },
              { icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", title: "Full Audit Trail", desc: "Every pull, letter, and mailing is logged with timestamps — complete compliance documentation." },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-slate-200 flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-[#1a3fd4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="bg-white py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 text-[#1a3fd4] bg-blue-50">Why Credit 800</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">vs. Traditional Credit Repair</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">Same process. A fraction of the cost. Full transparency.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium w-1/3"></th>
                  <th className="py-3 px-4 text-center">
                    <span className="inline-block bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white text-xs font-bold px-3 py-1.5 rounded-lg">Credit 800 Autopilot</span>
                  </th>
                  <th className="py-3 px-4 text-center text-slate-400 font-medium">Credit Repair Companies</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  ["Monthly Cost", "$49/mo", "$79–$149/mo"],
                  ["Setup Fee", "None", "$99–$199"],
                  ["Contract Required", "No — cancel anytime", "Often 6–12 months"],
                  ["Credit Report Pull", "Automatic (soft pull)", "You provide it"],
                  ["Letter Generation", "AI-powered, FCRA-compliant", "Generic templates"],
                  ["USPS Mailing", "Included", "Extra or manual"],
                  ["Transparency", "Full dashboard + audit log", "Often none"],
                  ["Escalation Letters", "Automatic", "Extra charge"],
                ].map(([feature, us, them]) => (
                  <tr key={feature} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 text-slate-600 font-medium">{feature}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-teal-700 font-semibold">{us}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-400">{them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Trust / Legal */}
      <section className="bg-slate-50 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 text-[#1a3fd4] bg-blue-50">Your Rights</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Built on Federal Law</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">Credit 800 exercises rights that already belong to you under the FCRA and FDCPA.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 mb-10">
            {[
              { badge: "FCRA", full: "Fair Credit Reporting Act", desc: "Gives you the right to dispute any inaccurate, incomplete, or unverifiable information on your credit report. Bureaus must investigate within 30 days and remove anything they can't verify." },
              { badge: "FDCPA", full: "Fair Debt Collection Practices Act", desc: "Protects you from abusive or deceptive debt collectors. You have the right to request debt validation and demand collectors stop contacting you." },
              { badge: "15 U.S.C.", full: "§ 1681 — Your Legal Weapon", desc: "Every dispute letter Credit 800 generates cites the specific statute sections that apply to your situation — giving your disputes legal weight that generic letters don't have." },
            ].map((t) => (
              <div key={t.badge} className="bg-white rounded-2xl p-6 border border-slate-200">
                <div className="inline-block px-3 py-1 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white text-xs font-black rounded-lg mb-4 tracking-wider">{t.badge}</div>
                <h3 className="font-semibold text-slate-900 mb-2 text-sm">{t.full}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
            <p className="text-sm text-amber-800 max-w-2xl mx-auto">
              <strong>Important:</strong> Credit 800 is an automated tool, not a law firm. We do not provide legal advice. No one can legally guarantee credit score improvements — anyone who does is misleading you.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 text-[#1a3fd4] bg-blue-50">FAQ</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a3fd4] mb-4">Common Questions</h2>
          </div>
          <div className="space-y-3">
            {[
              { q: "Does Autopilot hurt my credit score?", a: "No. Autopilot uses a soft inquiry to pull your credit report, which has zero impact on your score. Only hard inquiries (from new credit applications) affect your score." },
              { q: "How long before I see results?", a: "Credit bureaus are required by law to respond within 30 days. Most users see their first removals within 30–60 days of their first run. Results depend on your specific situation — unverifiable collections and outdated accounts tend to resolve fastest." },
              { q: "Can I cancel anytime?", a: "Yes, always. Cancel from your profile page or by contacting support — no cancellation fees, no contracts. Your data stays accessible." },
              { q: "What if a bureau denies my dispute?", a: "Autopilot automatically generates escalation letters in the next cycle, citing Method of Verification requirements under FCRA § 611. Persistent non-compliance can also be escalated to the CFPB." },
              { q: "Is my personal information safe?", a: "Yes. All data is encrypted in transit and at rest. We don't sell your data, don't use it to train AI models, and you can delete your account at any time." },
            ].map((item, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer font-medium text-sm text-slate-800 hover:bg-slate-50 transition list-none">
                  {item.q}
                  <svg className="w-4 h-4 text-slate-400 shrink-0 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-5 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

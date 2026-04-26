import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { GetStartedButton } from "@/components/AuthModalButtons";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Credit Repair Glossary — Definitions of Every Credit Term",
  description:
    "Plain-English definitions for every credit and debt term you'll encounter — from FICO scores to FCRA rights to charge-offs, utilization, and more.",
  openGraph: {
    title: "Credit Glossary — Every Credit Term Explained Simply",
    description:
      "Definitions for 60+ credit and debt terms: FICO, utilization, charge-off, collections, FCRA, FDCPA, hard inquiry, and much more.",
    url: "https://credit-800.com/glossary",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Credit Glossary" }],
  },
  alternates: {
    canonical: "https://credit-800.com/glossary",
  },
};

const glossaryJsonLd = {
  "@context": "https://schema.org",
  "@type": "DefinedTermSet",
  name: "Credit Repair Glossary",
  description: "Definitions for credit, debt, and consumer protection terms.",
  url: "https://credit-800.com/glossary",
};

interface GlossaryTerm {
  term: string;
  definition: string;
  related?: string[];
}

const glossaryTerms: GlossaryTerm[] = [
  {
    term: "Annual Percentage Rate (APR)",
    definition:
      "The yearly cost of borrowing money, including interest and fees, expressed as a percentage. A higher credit score typically qualifies you for a lower APR, which means less money paid over the life of a loan.",
    related: ["Credit Score", "Interest Rate"],
  },
  {
    term: "Authorized User",
    definition:
      "A person added to someone else's credit card account who can make purchases but is not legally responsible for the debt. Authorized users inherit the account's payment history and credit limit on their own credit report — a strategy often used to build credit.",
  },
  {
    term: "Balance Transfer",
    definition:
      "Moving debt from one credit card to another, typically to take advantage of a lower interest rate or a 0% APR promotional offer. Balance transfers can save money on interest and simplify payments but may come with transfer fees.",
  },
  {
    term: "Bankruptcy",
    definition:
      "A federal legal process allowing individuals or businesses to eliminate or restructure debts they cannot repay. Chapter 7 bankruptcy liquidates assets to pay creditors and stays on your credit report for 10 years. Chapter 13 reorganizes debt into a repayment plan and stays for 7 years.",
    related: ["Chapter 7", "Chapter 13", "Credit Report"],
  },
  {
    term: "Chapter 7 Bankruptcy",
    definition:
      "A type of bankruptcy that discharges most unsecured debts (credit cards, medical bills, personal loans) in exchange for liquidating non-exempt assets. Typically completed in 3–6 months. Remains on your credit report for 10 years from the filing date.",
  },
  {
    term: "Chapter 13 Bankruptcy",
    definition:
      "A type of bankruptcy that reorganizes your debt into a 3–5 year repayment plan rather than liquidating assets. Allows you to keep property like a home or car while catching up on missed payments. Remains on your credit report for 7 years from the filing date.",
  },
  {
    term: "Charge-Off",
    definition:
      "When a creditor writes off a debt as a loss after you've been delinquent — typically 120–180 days past due. 'Charged off' doesn't mean the debt is forgiven; you still owe it. The account may be sold to a debt collector, and the charge-off notation remains on your credit report for 7 years from the date of first delinquency.",
    related: ["Date of First Delinquency", "Collections", "Debt Collector"],
  },
  {
    term: "Collection Account",
    definition:
      "A delinquent debt that has been sent to a collection agency, either in-house or third-party. Collections are reported as a separate negative account and can significantly damage your credit score. Collections must be removed from your report 7 years after the original date of first delinquency.",
    related: ["Charge-Off", "Debt Collector", "Date of First Delinquency"],
  },
  {
    term: "Consumer Financial Protection Bureau (CFPB)",
    definition:
      "A federal government agency that regulates consumer financial products and services. You can file complaints with the CFPB about credit bureaus, debt collectors, or creditors who violate your rights. CFPB complaints often receive faster resolution than direct bureau disputes.",
  },
  {
    term: "Credit Bureau",
    definition:
      "A company that collects and maintains credit information about consumers and sells it to lenders and other authorized parties. The three major U.S. credit bureaus are Equifax, Experian, and TransUnion. They operate independently and may have different information about you.",
    related: ["Equifax", "Experian", "TransUnion", "Credit Report"],
  },
  {
    term: "Credit Freeze (Security Freeze)",
    definition:
      "A free service that prevents credit bureaus from releasing your credit report to potential new creditors. Highly effective at preventing identity theft because lenders can't approve new credit without accessing your report. Must be placed separately at each bureau. Can be temporarily lifted when you need to apply for credit.",
    related: ["Fraud Alert", "Identity Theft"],
  },
  {
    term: "Credit Inquiry",
    definition:
      "A record of someone accessing your credit report. Hard inquiries occur when you apply for credit and can lower your score by 5–10 points. Soft inquiries (checking your own credit, pre-approvals) do not affect your score. Hard inquiries stay on your report for 2 years but only impact your score for 12 months.",
    related: ["Hard Inquiry", "Soft Inquiry"],
  },
  {
    term: "Credit Mix",
    definition:
      "One of the five FICO score factors (worth 10%) that measures the variety of credit types on your report — revolving credit (credit cards) and installment credit (auto loans, mortgages, personal loans). A diverse mix can modestly improve your score, but you shouldn't open accounts just to improve your mix.",
    related: ["FICO Score", "Revolving Credit", "Installment Loan"],
  },
  {
    term: "Credit Report",
    definition:
      "A detailed record of your credit history compiled by a credit bureau. Includes personal information, account information (trade lines), public records, and inquiries. You're entitled to one free report from each bureau every 12 months at AnnualCreditReport.com.",
    related: ["Credit Bureau", "Credit Score", "FCRA"],
  },
  {
    term: "Credit Score",
    definition:
      "A three-digit number (typically 300–850) that summarizes your creditworthiness based on your credit history. The two main models are FICO and VantageScore. Your score is calculated from your credit report data and can differ across bureaus.",
    related: ["FICO Score", "VantageScore", "Credit Report"],
  },
  {
    term: "Credit Utilization",
    definition:
      "The ratio of your current credit card balances to your total credit limits, expressed as a percentage. Accounts for approximately 30% of your FICO score. Lower is better — experts recommend keeping it below 10% for the best score impact. Unlike most factors, utilization has no memory and can improve quickly.",
    related: ["Revolving Credit", "FICO Score", "Credit Limit"],
  },
  {
    term: "Date of First Delinquency (DOFD)",
    definition:
      "The date you first missed a payment that led to a delinquency. This date is critical because it determines when negative information must be removed from your credit report under the FCRA — most items must be deleted 7 years from this date. Collectors sometimes illegally re-age debts by reporting a newer DOFD.",
    related: ["FCRA", "Charge-Off", "Collection Account"],
  },
  {
    term: "Debt-to-Income Ratio (DTI)",
    definition:
      "Your total monthly debt payments divided by your gross monthly income, expressed as a percentage. Not part of your credit score, but a key factor in loan underwriting — especially mortgages. Most conventional lenders prefer DTI below 43%; the best mortgage rates require below 36%.",
  },
  {
    term: "Debt Collector",
    definition:
      "A person or company that collects debts owed to others. Debt collectors are regulated by the Fair Debt Collection Practices Act (FDCPA), which restricts when, how, and how often they can contact you. You have the right to request debt validation and to stop collector contact in writing.",
    related: ["FDCPA", "Debt Validation", "Collection Account"],
  },
  {
    term: "Debt Validation",
    definition:
      "A written request under the FDCPA § 809(b) that requires a debt collector to prove the debt is valid, accurate, and that they have the legal right to collect it. Must be sent within 30 days of first contact. The collector must stop all collection activity until they provide validation.",
    related: ["FDCPA", "Debt Collector"],
  },
  {
    term: "Delinquency",
    definition:
      "Failing to make a required payment by the due date. Payments more than 30 days late are typically reported to credit bureaus. Late payments are categorized as 30-, 60-, 90-, or 120-days late, with each tier causing progressively more score damage.",
  },
  {
    term: "Equifax",
    definition:
      "One of the three major U.S. credit bureaus, headquartered in Atlanta, Georgia. Equifax collects and maintains credit data on over 800 million consumers worldwide. To dispute errors with Equifax, contact them at P.O. Box 740256, Atlanta, GA 30374.",
    related: ["Credit Bureau", "Experian", "TransUnion"],
  },
  {
    term: "Experian",
    definition:
      "One of the three major U.S. credit bureaus, headquartered in Dublin, Ireland with U.S. offices in Costa Mesa, California. To dispute errors with Experian, contact them at P.O. Box 4500, Allen, TX 75013.",
    related: ["Credit Bureau", "Equifax", "TransUnion"],
  },
  {
    term: "Fair Credit Reporting Act (FCRA)",
    definition:
      "A federal law enacted in 1970 that regulates how consumer credit information is collected, used, and shared. The FCRA gives consumers the right to dispute inaccurate information, access their credit reports, know who has accessed their reports, and sue for damages when their rights are violated.",
    related: ["Dispute Rights", "Credit Bureau", "Furnisher"],
  },
  {
    term: "Fair Debt Collection Practices Act (FDCPA)",
    definition:
      "A federal law that restricts how third-party debt collectors can contact you and what they can say. Prohibits harassment, false statements, and unfair practices. Gives you the right to demand debt validation and to stop all collector contact in writing. Violations allow you to sue for $1,000 per violation.",
    related: ["Debt Collector", "Debt Validation"],
  },
  {
    term: "FICO Score",
    definition:
      "The most widely used credit scoring model, developed by the Fair Isaac Corporation. Used in over 90% of U.S. lending decisions. Scores range from 300–850 and are calculated from five factors: payment history (35%), credit utilization (30%), length of credit history (15%), credit mix (10%), and new credit inquiries (10%).",
    related: ["Credit Score", "VantageScore"],
  },
  {
    term: "Fraud Alert",
    definition:
      "A notice placed on your credit file that requires lenders to take extra steps to verify your identity before opening new credit. An initial fraud alert lasts 1 year; an extended fraud alert (for identity theft victims) lasts 7 years. Placing a fraud alert at one bureau requires them to notify the other two.",
    related: ["Credit Freeze", "Identity Theft"],
  },
  {
    term: "Furnisher",
    definition:
      "Any entity that provides information to credit bureaus about consumer accounts — including banks, credit card companies, auto lenders, and debt collectors. Under the FCRA, furnishers are required to report accurate information and must investigate disputes forwarded by the bureaus.",
    related: ["FCRA", "Credit Bureau"],
  },
  {
    term: "Goodwill Letter",
    definition:
      "A letter sent to a creditor requesting that they remove a negative mark from your credit report as a goodwill gesture — even though the information is technically accurate. Most effective for isolated late payments on accounts with an otherwise strong payment history. Success rate is roughly 20–30%.",
  },
  {
    term: "Hard Inquiry",
    definition:
      "A credit report check triggered when you apply for new credit — a credit card, loan, mortgage, or line of credit. Hard inquiries can lower your credit score by 5–10 points and remain on your report for 2 years, though they only affect your score for the first 12 months.",
    related: ["Soft Inquiry", "Credit Inquiry"],
  },
  {
    term: "Identity Theft",
    definition:
      "When someone uses your personal information — name, SSN, date of birth, account numbers — without your permission to open new accounts, make purchases, or commit fraud. Victims have special rights under the FCRA, including the right to permanently block fraudulent information from their credit reports.",
    related: ["Credit Freeze", "Fraud Alert", "FCRA"],
  },
  {
    term: "Installment Loan",
    definition:
      "A loan with a fixed number of scheduled payments over a set term — auto loans, mortgages, student loans, personal loans. Installment loans report as a separate account type and contribute to your credit mix.",
    related: ["Credit Mix", "Revolving Credit"],
  },
  {
    term: "Method of Verification (MOV)",
    definition:
      "A written request under FCRA § 611(a)(6)(B)(iii) that requires a credit bureau to explain exactly how they verified a disputed item — including who they contacted and what documentation they reviewed. The bureau must respond within 15 days. Many items are removed at this stage because bureaus can't produce genuine verification.",
    related: ["FCRA", "Dispute", "Credit Bureau"],
  },
  {
    term: "Mixed File",
    definition:
      "A credit report that contains information belonging to two different people — often with similar names or SSNs. Mixed files can cause someone to have accounts, late payments, or collections on their report that belong to a different person. This is disputable under the FCRA.",
    related: ["Credit Report", "FCRA"],
  },
  {
    term: "Pay-for-Delete",
    definition:
      "An agreement with a debt collector to pay all or part of a debt in exchange for them removing the collection account from your credit report. Not legally required by the FCRA, but many collectors agree to it — especially on older debts. Always get the agreement in writing before making payment.",
    related: ["Collection Account", "Debt Collector"],
  },
  {
    term: "Payment History",
    definition:
      "The record of whether you've paid your credit accounts on time. The single most important factor in your FICO score, accounting for 35% of your score. Even one 30-day late payment can drop your score 60–100 points. Late payments stay on your report for 7 years.",
    related: ["FICO Score", "Delinquency"],
  },
  {
    term: "Rapid Rescore",
    definition:
      "A service offered by mortgage lenders that quickly updates your credit report with recent changes — paying off a balance, correcting an error — so the updated score can be used for your mortgage application, often within 2–7 business days instead of the usual 30-day billing cycle.",
  },
  {
    term: "Re-aging",
    definition:
      "An illegal practice where a debt collector reports a more recent date of first delinquency to keep a collection account on your credit report beyond the 7-year FCRA limit. This is a violation of the FCRA and is grounds for disputing the account and potentially suing the collector.",
    related: ["Date of First Delinquency", "FCRA", "Collection Account"],
  },
  {
    term: "Revolving Credit",
    definition:
      "A type of credit with a set limit that you can borrow, repay, and borrow again — credit cards and home equity lines of credit (HELOCs). Your credit utilization ratio applies specifically to revolving credit accounts.",
    related: ["Credit Utilization", "Installment Loan"],
  },
  {
    term: "Secured Credit Card",
    definition:
      "A credit card that requires a cash deposit as collateral, which typically becomes your credit limit. Designed for people with no credit or bad credit. When used responsibly, it reports to all three bureaus and helps build a positive credit history.",
    related: ["Credit Mix", "Building Credit"],
  },
  {
    term: "Soft Inquiry",
    definition:
      "A credit check that does not affect your credit score. Examples include: checking your own credit, employer background checks, pre-qualification offers from lenders, and credit monitoring services. Only visible on your own copy of your credit report.",
    related: ["Hard Inquiry", "Credit Inquiry"],
  },
  {
    term: "Statute of Limitations (SOL)",
    definition:
      "The time period during which a creditor or collector can legally sue you in court to collect a debt. Varies by state (typically 3–6 years) and debt type. After the SOL expires, the debt is 'time-barred' — they can still contact you, but cannot win a lawsuit. Making a payment or acknowledging the debt can restart the SOL in some states.",
    related: ["Collection Account", "Debt Collector"],
  },
  {
    term: "Trade Line",
    definition:
      "An entry in your credit report representing one credit account — a credit card, loan, or line of credit. Each trade line shows account details, payment history, and current status.",
    related: ["Credit Report", "Account Information"],
  },
  {
    term: "TransUnion",
    definition:
      "One of the three major U.S. credit bureaus, headquartered in Chicago, Illinois. To dispute errors with TransUnion, contact their Consumer Dispute Center at P.O. Box 2000, Chester, PA 19016.",
    related: ["Credit Bureau", "Equifax", "Experian"],
  },
  {
    term: "VantageScore",
    definition:
      "A credit scoring model jointly developed by the three major credit bureaus as an alternative to FICO. Also uses a 300–850 scale. Commonly used by free credit monitoring services. VantageScore 3.0+ ignores paid collections, while older FICO models do not.",
    related: ["FICO Score", "Credit Score"],
  },
];

// Group by first letter
const grouped = glossaryTerms.reduce<Record<string, GlossaryTerm[]>>((acc, term) => {
  const letter = term.term[0].toUpperCase();
  if (!acc[letter]) acc[letter] = [];
  acc[letter].push(term);
  return acc;
}, {});

const letters = Object.keys(grouped).sort();

export default function GlossaryPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(glossaryJsonLd) }}
      />
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <MarketingNav />
      </header>

      <div className="bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-14 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3">Credit Glossary</h1>
          <p className="text-lime-100 max-w-2xl mx-auto text-sm sm:text-base">
            Plain-English definitions for every credit, debt, and consumer protection term — from FICO scores to FCRA rights.
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        {/* Letter nav */}
        <div className="flex flex-wrap gap-2 mb-10">
          {letters.map((letter) => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition"
            >
              {letter}
            </a>
          ))}
        </div>

        {/* Terms by letter */}
        <div className="space-y-12">
          {letters.map((letter) => (
            <section key={letter} id={`letter-${letter}`}>
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-2xl font-bold text-teal-600">{letter}</h2>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <div className="space-y-5">
                {grouped[letter].map((term) => (
                  <div key={term.term} className="border-l-2 border-slate-200 pl-4">
                    <h3 className="font-semibold text-slate-900 mb-1">{term.term}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{term.definition}</p>
                    {term.related && term.related.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-xs text-slate-400">See also:</span>
                        {term.related.map((r) => (
                          <span key={r} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600 rounded-2xl p-8 text-center mt-14">
          <h2 className="text-2xl font-bold text-white mb-2">Apply These Concepts to Your Own Credit</h2>
          <p className="text-lime-100 text-sm mb-6 max-w-md mx-auto">
            Upload your credit report and get a personalized analysis, dispute letters, and action plan — all the terms above, applied to your specific situation.
          </p>
          <GetStartedButton className="inline-block px-8 py-3 bg-white text-teal-600 hover:bg-lime-50 rounded-lg font-medium transition">
            Get Started
          </GetStartedButton>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

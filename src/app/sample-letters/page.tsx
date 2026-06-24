import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { GetStartedButton } from "@/components/AuthModalButtons";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sample Dispute Letters — FCRA-Compliant Templates",
  description: "See real examples of FCRA dispute letters used to remove inaccurate collections, charge-offs, and late payments from credit reports.",
  openGraph: {
    title: "Free Sample Credit Dispute Letters — FCRA-Compliant Templates",
    description: "Real FCRA dispute letters for removing collections, charge-offs, and late payments. Section 609, 611, goodwill, pay-for-delete, and more.",
    url: "https://credit-800.com/sample-letters",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Sample FCRA Dispute Letters" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Sample Credit Dispute Letters — FCRA-Compliant Templates",
    description: "Real FCRA dispute letters for removing collections, charge-offs, and late payments.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://credit-800.com/sample-letters",
  },
};

const BUREAU_LETTER = `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

Equifax Information Services LLC
P.O. Box 740256
Atlanta, GA 30374-0256

Re: FCRA Section 611 Dispute — Account #████-████-████-####

To Whom It May Concern:

Pursuant to my rights under the Fair Credit Reporting Act (FCRA), Section 611
(15 U.S.C. § 1681i), I am writing to dispute the following inaccurate information
appearing on my credit report:

DISPUTED ITEM:
  Creditor:                  ████████████ Inc.
  Account #:                 ████-████-████-####
  Balance Reported:          $█,███
  Status Reported:           Collection / Charge-Off
  Date of First Delinquency: ██/████

REASON FOR DISPUTE:
The above-referenced account contains inaccurate information. The balance and
account status reported do not reflect the true status of this account. I am
exercising my rights under FCRA § 611 to request a full investigation and
correction of this item.

FCRA § 611 REQUIRES YOU TO:
  1. Investigate the disputed information within 30 days
  2. Forward all relevant information to the furnisher of the information
  3. Delete or correct any information that cannot be verified
  4. Provide me with written notice of the results of your investigation

PLEASE PROVIDE:
  □ The name, address, and telephone number of the original creditor
  □ The method used to verify the disputed information
  □ Documentation used in the verification process
  □ A corrected copy of my credit report at no charge

This dispute is submitted in good faith. If this matter is not resolved within
the 30-day statutory period, I am prepared to file a complaint with the Consumer
Financial Protection Bureau (CFPB) and the Federal Trade Commission (FTC) and
seek all remedies available under FCRA § 616 and § 617.

Sincerely,

_________________________
[Your Name]
[Phone Number]
[Email Address]

Enclosures:
  - Copy of government-issued photo ID
  - Proof of current address (utility bill or bank statement)
  - Highlighted copy of credit report showing disputed item`;

const COLLECTOR_LETTER = `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

████████ Collections, LLC
[Collector Address]
[City, State ZIP]

Re: Debt Validation Demand — Account #████-████-████-####
    FDCPA § 809(b) — 15 U.S.C. § 1692g(b)

To Whom It May Concern:

I am writing in response to your recent collection attempt regarding the above-
referenced account. Pursuant to my rights under the Fair Debt Collection
Practices Act (FDCPA), Section 809(b) (15 U.S.C. § 1692g(b)), I hereby formally
dispute this debt and demand full validation.

DISPUTED DEBT DETAILS:
  Creditor Claiming Debt:    ████████ Collections, LLC
  Alleged Original Creditor: ████████████ Inc.
  Account #:                 ████-████-████-####
  Amount Claimed:            $█,███.██

UNDER THE FDCPA, YOU ARE REQUIRED TO PROVIDE:
  □ Verification of the original debt (amount and nature)
  □ Proof that your agency is licensed to collect in my state
  □ A copy of the original signed credit agreement
  □ A complete payment history showing how the amount was calculated
  □ The name and address of the original creditor
  □ Proof that the statute of limitations has not expired

NOTICE: You must cease all collection activity — including credit reporting —
until this validation is provided. Any continued collection attempts before
validation is received will constitute a violation of FDCPA § 809(b) and may
expose your company to civil liability under FDCPA § 813.

If you are unable to validate this debt, I demand that you:
  1. Cease all collection activity immediately
  2. Notify all credit reporting agencies to delete this account
  3. Confirm in writing that this matter is resolved

This is not a refusal to pay — it is a formal exercise of my rights under
federal law. Failure to comply will result in a complaint filed with the
Consumer Financial Protection Bureau (CFPB), the Federal Trade Commission
(FTC), and my state Attorney General's office.

Sincerely,

_________________________
[Your Name]
[Phone Number]
[Email Address]

Sent via: Certified Mail — Return Receipt Requested`;

const METHOD_VERIFICATION_LETTER = `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

Equifax Information Services LLC
P.O. Box 740256
Atlanta, GA 30374-0256

Re: Method of Verification Request — FCRA § 611(a)(6)(B)(iii)
    Account #████-████-████-####

To Whom It May Concern:

On [original dispute date], I submitted a dispute regarding the above-referenced
account. On [response date], I received notice that your investigation "verified"
the accuracy of this information. I write now to exercise my right under the Fair
Credit Reporting Act (FCRA), Section 611(a)(6)(B)(iii), to request the method
by which you verified this account.

Specifically, I request that you provide, in writing:

  □ The name, business address, and telephone number of the party you contacted
    to verify this information
  □ A description of the procedure used to determine the accuracy and completeness
    of the disputed information
  □ All documentation used in connection with your verification

Under FCRA § 611(a)(6)(B)(iii), you are required to provide this information
within 15 days of receiving this request.

I have significant reason to believe that your verification consisted solely of
an automated e-OSCAR transmission to the furnisher without any review of source
documentation. If so, this does not constitute a genuine investigation as required
by FCRA § 611(a)(1) ("reasonable reinvestigation").

If you cannot provide genuine documentation of your verification process, I
request that you immediately delete this item and send me an updated credit report
at no charge.

Sincerely,

_________________________
[Your Name]
[Phone Number]
[Email Address]

Sent via: Certified Mail — Return Receipt Requested`;

const GOODWILL_LETTER = `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Creditor Name] — Executive Customer Relations
[Creditor Address]
[City, State ZIP]

Re: Goodwill Adjustment Request — Account #████-████-████-####

Dear [Creditor Name] Customer Relations Team,

I am writing to respectfully request a goodwill adjustment on my above-referenced
account. I have been a customer since [year] and have maintained a consistent
payment record, with the exception of a single late payment in [month/year].

CIRCUMSTANCES OF THE LATE PAYMENT:
The late payment occurred due to [brief, honest explanation — e.g., unexpected
medical emergency, temporary job loss, oversight during relocation]. This was an
isolated incident that does not reflect my overall commitment to my financial
obligations.

MY ACCOUNT HISTORY WITH YOU:
  - Account opened:          [Date]
  - Total payments made:     [Number] payments
  - Payments made on time:   [Number — e.g., 47 of 48]
  - Current account status:  Current / Paid in full
  - Current balance:         $[Amount]

I fully understand that the late payment was my responsibility and I am not
disputing its accuracy. I am asking for your goodwill and understanding in
recognizing that this single incident was a departure from my otherwise
responsible account management.

This late payment is currently impacting my ability to [specific impact —
e.g., qualify for a mortgage, secure employment, refinance an auto loan]. I would
be deeply grateful if you would consider removing this notation as a gesture of
goodwill toward a long-standing customer.

I am happy to provide any additional documentation that would support this request.
Thank you sincerely for your time and consideration.

Respectfully,

_________________________
[Your Name]
[Phone Number]
[Email Address]
[Account Number]`;

const PAY_FOR_DELETE_LETTER = `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

████████ Collections, LLC
[Collector Address]
[City, State ZIP]

Re: Settlement and Deletion Offer — Account #████-████-████-####
    Original Creditor: ████████████ Inc.
    Alleged Balance: $█,███.██

To Whom It May Concern:

I am writing regarding the above-referenced account currently appearing on my
credit report. I am prepared to resolve this account and wish to offer a full
and final settlement in exchange for complete deletion of this account from all
three major credit reporting agencies (Equifax, Experian, and TransUnion).

SETTLEMENT OFFER:
  Offered Amount:     $█,███.██ (full balance / [X]% of balance)
  Payment Method:     Certified check or money order
  Payment Timeline:   Within 14 days of written agreement

CONDITIONS OF THIS OFFER:
This offer is contingent upon your written agreement to:
  1. Accept the offered amount as payment in full and final settlement of this debt
  2. Delete this account from Equifax, Experian, and TransUnion within 30 days
     of receiving payment
  3. Provide written confirmation that this matter is resolved and the debt is
     satisfied in full
  4. Instruct the original creditor to also delete or update their reporting

IMPORTANT: I will not make any payment until I receive a signed written agreement
containing the above terms. Verbal agreements will not be accepted.

Please respond in writing within 20 days. If this offer is unacceptable, please
counter in writing with an alternative. I am committed to resolving this matter
and look forward to reaching a mutually acceptable resolution.

Sincerely,

_________________________
[Your Name]
[Phone Number]
[Email Address]

Sent via: Certified Mail — Return Receipt Requested`;

const CEASE_DESIST_LETTER = `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

████████ Collections, LLC
[Collector Address]
[City, State ZIP]

Re: CEASE AND DESIST ALL COMMUNICATION
    FDCPA § 805(c) — 15 U.S.C. § 1692c(c)
    Account #████-████-████-####

To Whom It May Concern:

Pursuant to my rights under the Fair Debt Collection Practices Act (FDCPA),
Section 805(c) (15 U.S.C. § 1692c(c)), I am formally demanding that you
CEASE AND DESIST all communication with me regarding the above-referenced account,
effective immediately upon receipt of this letter.

This demand includes all forms of communication:
  - Telephone calls (home, work, cell, or any other number)
  - Written correspondence
  - Email, text message, or any electronic communication
  - Contact through third parties, including family, friends, or employers
  - Any other form of direct or indirect communication

Under the FDCPA, once you receive this written request, you may only contact me:
  1. To confirm that collection efforts are being terminated
  2. To notify me of a specific action you intend to take (such as filing suit)

BE ADVISED: Any communication received after the date this letter is received
will constitute a violation of the FDCPA, 15 U.S.C. § 1692c(c), and may result
in civil liability under FDCPA § 813, including actual damages, statutory damages
up to $1,000, court costs, and attorney fees. I will document all violations.

This letter is not a refusal to acknowledge or pay any legitimately owed debt.
It is a formal exercise of my rights under federal law.

Sincerely,

_________________________
[Your Name]
[Phone Number — for written response only]
[Email Address]

Sent via: Certified Mail — Return Receipt Requested
CC: Consumer Financial Protection Bureau (CFPB)`;

const CFPB_LETTER = `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

Consumer Financial Protection Bureau
P.O. Box 4503
Iowa City, IA 52244

Re: Formal Complaint Against [Bureau/Creditor Name]
    FCRA Violation — Failure to Investigate / Remove Verified Inaccuracy
    Account #████-████-████-####

To Whom It May Concern:

I am submitting this formal complaint against [Bureau/Creditor/Collector Name]
for violations of the Fair Credit Reporting Act (FCRA) in connection with the
above-referenced account.

NATURE OF THE COMPLAINT:
  Respondent:    [Equifax / Experian / TransUnion / Creditor Name]
  Address:       [Respondent's Address]
  Violation:     [Failure to investigate / Continued inaccurate reporting /
                  Failure to delete unverifiable item / Other FCRA violation]

TIMELINE OF EVENTS:
  [Date]:  Submitted initial dispute to [Bureau] via certified mail
           (Tracking #: ████████████████████)
  [Date]:  Received response — item "verified" with no explanation
  [Date]:  Submitted Method of Verification request
  [Date]:  No response received / Unsatisfactory response received
  [Date]:  Item continues to appear inaccurately on my credit report

APPLICABLE LAW:
Under FCRA § 611, [Bureau] was required to conduct a reasonable investigation
of my dispute. Their failure to [investigate properly / correct the record /
delete an unverifiable item] constitutes a potential violation of:
  - FCRA § 611(a)(1): Duty to conduct reasonable reinvestigation
  - FCRA § 611(a)(5): Duty to correct or delete inaccurate information
  - FCRA § 616 / § 617: Civil liability for violations

RESOLUTION REQUESTED:
  □ Immediate deletion of the disputed item from my credit report
  □ Issuance of a corrected credit report at no charge
  □ Written confirmation of the correction
  □ Investigation of [Bureau/Creditor]'s compliance practices

Enclosed: Copies of all dispute correspondence, certified mail receipts,
and credit report excerpts showing the disputed item.

Thank you for your assistance in resolving this matter.

Sincerely,

_________________________
[Your Name]
[Phone Number]
[Email Address]
[SSN Last 4: ████]
[Date of Birth: ██/██/████]`;

const letterTypes = [
  {
    title: "FCRA § 611 Initial Dispute",
    desc: "Standard first-round bureau dispute. Demands investigation of inaccurate or unverifiable items.",
    tag: "Credit Bureau",
    tagColor: "bg-blue-50 text-[#1a3fd4]",
  },
  {
    title: "Method of Verification (Round 2)",
    desc: "Escalation demanding the bureau explain exactly how they verified a disputed item.",
    tag: "Credit Bureau",
    tagColor: "bg-blue-50 text-[#1a3fd4]",
  },
  {
    title: "Goodwill Letter",
    desc: "Asks a creditor to remove a negative item as goodwill — often works for isolated late payments.",
    tag: "Creditor Direct",
    tagColor: "bg-blue-100 text-blue-700",
  },
  {
    title: "Pay-for-Delete Letter",
    desc: "Offers full or partial payment to a collector in exchange for removing the account.",
    tag: "Debt Collector",
    tagColor: "bg-amber-100 text-amber-700",
  },
  {
    title: "Debt Validation Letter",
    desc: "Demands the collector prove the debt is valid, accurate, and they have the right to collect.",
    tag: "Debt Collector",
    tagColor: "bg-amber-100 text-amber-700",
  },
  {
    title: "Cease & Desist Letter",
    desc: "Legally orders a debt collector to stop all contact with you under the FDCPA.",
    tag: "Debt Collector",
    tagColor: "bg-amber-100 text-amber-700",
  },
  {
    title: "CFPB Complaint Letter",
    desc: "Formal federal complaint — triggers a response directly from the creditor.",
    tag: "Regulatory",
    tagColor: "bg-rose-100 text-rose-700",
  },
];

const sampleLettersJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "FCRA & FDCPA Credit Dispute Letter Templates",
  description:
    "FCRA & FDCPA-compliant credit dispute letter templates for removing inaccurate items from your credit report.",
  url: "https://credit-800.com/sample-letters",
  numberOfItems: letterTypes.length,
  itemListElement: letterTypes.map((letter, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: letter.title,
    description: letter.desc,
  })),
};

export default function SampleLettersPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sampleLettersJsonLd) }}
      />
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <MarketingNav />
      </header>
      <div className="bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-14 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3">Sample Dispute Letters</h1>
          <p className="text-lime-100 max-w-2xl mx-auto text-sm sm:text-base">
            FCRA & FDCPA-compliant letters citing specific legal sections — tailored to your situation, not generic templates.
          </p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">

        {/* Letter types */}
        <div className="mb-14">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Every Letter Type, Included</h2>
          <p className="text-slate-500 text-sm mb-6">All letters are personalized and pre-filled with your specific account details from your credit report.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {letterTypes.map((l) => (
              <div key={l.title} className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-sm text-slate-800">{l.title}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${l.tagColor}`}>{l.tag}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{l.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Personal details are redacted in these samples. Credit 800 fills them in automatically from your uploaded credit report.
        </div>

        {/* Letter 1 — Credit Bureau */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-[#1a3fd4] rounded-full">Credit Bureau</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">FCRA § 611 Initial Dispute Letter</h2>
              <p className="text-xs text-slate-500">Sent to Equifax, Experian, or TransUnion — first round</p>
            </div>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 leading-relaxed bg-white p-5 rounded-xl border border-slate-200 overflow-x-auto">
            {BUREAU_LETTER}
          </pre>
        </div>

        {/* Letter 2 — Debt Collector */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full">Debt Collector</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">FDCPA § 809(b) Debt Validation Letter</h2>
              <p className="text-xs text-slate-500">Sent directly to the collection agency</p>
            </div>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 leading-relaxed bg-white p-5 rounded-xl border border-slate-200 overflow-x-auto">
            {COLLECTOR_LETTER}
          </pre>
        </div>

        {/* Letter 3 — Method of Verification */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-[#1a3fd4] rounded-full">Credit Bureau</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Method of Verification Request (Round 2)</h2>
              <p className="text-xs text-slate-500">Sent after the bureau claims they "verified" a disputed item</p>
            </div>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 leading-relaxed bg-white p-5 rounded-xl border border-slate-200 overflow-x-auto">
            {METHOD_VERIFICATION_LETTER}
          </pre>
        </div>

        {/* Letter 4 — Goodwill */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full">Creditor Direct</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Goodwill Adjustment Letter</h2>
              <p className="text-xs text-slate-500">Asks a creditor to remove a negative mark as a courtesy — works best for isolated late payments</p>
            </div>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 leading-relaxed bg-white p-5 rounded-xl border border-slate-200 overflow-x-auto">
            {GOODWILL_LETTER}
          </pre>
        </div>

        {/* Letter 5 — Pay for Delete */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full">Debt Collector</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Pay-for-Delete Settlement Offer</h2>
              <p className="text-xs text-slate-500">Offers payment in exchange for complete deletion of the collection account</p>
            </div>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 leading-relaxed bg-white p-5 rounded-xl border border-slate-200 overflow-x-auto">
            {PAY_FOR_DELETE_LETTER}
          </pre>
        </div>

        {/* Letter 6 — Cease & Desist */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full">Debt Collector</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Cease & Desist Letter</h2>
              <p className="text-xs text-slate-500">Orders a debt collector to stop all contact under FDCPA § 805(c)</p>
            </div>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 leading-relaxed bg-white p-5 rounded-xl border border-slate-200 overflow-x-auto">
            {CEASE_DESIST_LETTER}
          </pre>
        </div>

        {/* Letter 7 — CFPB Complaint */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 mb-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold px-2.5 py-1 bg-rose-100 text-rose-700 rounded-full">Regulatory</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">CFPB Formal Complaint Letter</h2>
              <p className="text-xs text-slate-500">Filed with the Consumer Financial Protection Bureau when direct disputes fail</p>
            </div>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 leading-relaxed bg-white p-5 rounded-xl border border-slate-200 overflow-x-auto">
            {CFPB_LETTER}
          </pre>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Get Your Personalized Letters</h2>
          <p className="text-lime-100 text-sm mb-6 max-w-lg mx-auto">
            Your letters include specific account numbers, exact legal citations, and bureau/collector mailing addresses — personalized and ready to send.
          </p>
          <GetStartedButton className="inline-block px-8 py-3 bg-white text-[#1a3fd4] hover:bg-blue-50 rounded-lg font-medium transition">
            Get Started
          </GetStartedButton>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

"use client";

import { useState } from "react";
import { GetStartedButton } from "@/components/AuthModalButtons";

const SAMPLE_LETTER = `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: FCRA Section 611 Dispute — Account #XXXX-XXXX-XXXX-####

To Whom It May Concern:

Pursuant to my rights under the Fair Credit Reporting Act (FCRA), Section 611
(15 U.S.C. § 1681i), I am writing to dispute the following inaccurate information
appearing on my credit report:

DISPUTED ITEM:
  Creditor:                  ████████████ Inc.
  Account #:                 ████-████-████-####
  Balance Reported:          $█,███
  Status Reported:           ████████████
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

export function SampleLetterModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-teal-600 text-teal-600 hover:bg-teal-50 rounded-lg font-medium transition text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        View Sample Dispute Letter
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-semibold">Sample FCRA Dispute Letter</h2>
                <p className="text-sm text-slate-500 mt-0.5">Bureau dispute — Section 611</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Personal details redacted. Credit 800 fills these in automatically from your credit report.
              </div>
              <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">
                {SAMPLE_LETTER}
              </pre>
            </div>

            <div className="p-6 border-t border-slate-200 shrink-0 bg-gradient-to-r from-lime-50 to-teal-50 rounded-b-2xl">
              <p className="text-sm text-slate-600 mb-3">
                Your personalized letters include specific account numbers, exact FCRA citations, and bureau mailing addresses — ready to send.
              </p>
              <GetStartedButton className="block w-full text-center px-6 py-3 bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] text-white rounded-lg font-medium hover:opacity-90 transition">
                Get Your Letters Free
              </GetStartedButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

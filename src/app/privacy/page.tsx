import Link from "next/link";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MarketingNav } from "@/components/MarketingNav";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <MarketingNav />
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-slate-500 mb-8">Last updated: June 1, 2026</p>

        <div className="prose prose-slate max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-slate-600 leading-relaxed">
              Credit 800 (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you use our Service at credit-800.com.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>

            <h3 className="text-lg font-medium mt-4 mb-2">Account Information</h3>
            <p className="text-slate-600 leading-relaxed mb-3">When you create an account, we collect:</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li>Email address</li>
              <li>Password (hashed — never stored in plain text)</li>
              <li>Full name, date of birth, mailing address, and phone number (required at signup for dispute letter generation)</li>
              <li>Temporary two-factor authentication codes (stored in hashed form, auto-deleted after use or expiry)</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">Credit Report Data</h3>
            <p className="text-slate-600 leading-relaxed mb-3">When you upload a credit report, we process:</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li>Account information (creditor names, account numbers, balances)</li>
              <li>Payment history and derogatory marks</li>
              <li>Public records and collections</li>
              <li>Hard and soft inquiries</li>
              <li>Personal identifying information contained in the report</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">Financial &amp; Budget Data</h3>
            <p className="text-slate-600 leading-relaxed mb-3">If you use budget or debt payoff features, we store:</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li>Budget entries (category, amount, date)</li>
              <li>Debt accounts and balances you manually enter</li>
              <li>Credit scores you log manually</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">Payment Information</h3>
            <p className="text-slate-600 leading-relaxed">
              Payments are processed by Stripe. We do not store your full card number, CVV, or billing details.
              We receive only a tokenized reference and last-four digits from Stripe for display purposes.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">Audit Log Data</h3>
            <p className="text-slate-600 leading-relaxed">
              For compliance purposes, we maintain an immutable audit log of all significant account actions including
              FCRA consent grants and revocations, credit pulls, dispute letter generation, USPS mailings,
              and two-factor authentication events. These records are retained as required by applicable law.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">Usage Data</h3>
            <p className="text-slate-600 leading-relaxed mb-3">We automatically collect:</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li>Browser type and version</li>
              <li>Device information</li>
              <li>IP address</li>
              <li>Pages visited and features used</li>
              <li>Date and time of access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <p className="text-slate-600 leading-relaxed mb-3">We use your information to:</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li>Provide and maintain the Service</li>
              <li>Analyze your credit report and identify potential disputes</li>
              <li>Generate personalized dispute letters and action plans</li>
              <li>Process payments for optional USPS mailing</li>
              <li>Send transactional emails (analysis complete, dispute mailed, USPS mailing receipts, two-factor authentication codes, weekly progress summaries)</li>
              <li>Maintain compliance audit trails as required by FCRA and applicable law</li>
              <li>Improve and optimize the Service</li>
              <li>Detect and prevent fraud or abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Automated Processing</h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              We use automated AI technology to analyze your credit report data, generate dispute letters, and parse bureau response documents. This processing occurs on secure Cloudflare infrastructure. We do not use your credit report data to train AI models.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Generated content is presented for your review before any action is taken. You are responsible for submitting dispute letters yourself, or you can use our optional USPS mailing service ($2/letter) to send them directly from the app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Storage and Security</h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              Your data is stored using industry-standard security measures:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li>Credit report PDFs are stored in encrypted Cloudflare R2 cloud storage</li>
              <li>Account data and audit logs are stored in Cloudflare D1 with strict access controls</li>
              <li>Passwords and 2FA codes are hashed and never stored in plain text</li>
              <li>All data transmission uses TLS encryption</li>
              <li>Two-factor authentication is available for all accounts</li>
              <li>Access to data is restricted to authorized personnel only</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
            <p className="text-slate-600 leading-relaxed">
              We retain your account information and credit report data for as long as your account is active.
              FCRA consent records and audit logs are retained as required by applicable law and may be retained
              beyond account closure. You may request deletion of your account and associated data by contacting
              us via our <a href="/support" className="text-teal-600 hover:text-teal-500">support page</a>. After account deletion, we may retain certain information as required
              by law or for legitimate business purposes for up to 90 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Information Sharing</h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              We do not sell your personal information. We may share your information with:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li><strong>Stripe:</strong> For payment processing (card-on-file for USPS mailing)</li>
              <li><strong>PostGrid:</strong> For physical USPS mailing and mail tracking of dispute letters (name and mailing address only)</li>
              <li><strong>Cloudflare:</strong> For hosting, edge infrastructure, and file storage</li>
              <li><strong>AWS:</strong> For transactional email delivery</li>
              <li><strong>OpenAI:</strong> For AI-powered credit report analysis and dispute letter generation — your report data is processed solely to generate your dispute content and is not used for model training</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Your Rights</h2>
            <p className="text-slate-600 leading-relaxed mb-3">You have the right to:</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li>Access your personal information</li>
              <li>Correct inaccurate information via your profile page</li>
              <li>Request deletion of your account and data</li>
              <li>Opt out of non-transactional email communications</li>
              <li>Opt out of optional USPS mailing charges at any time</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              To exercise any of these rights, <a href="/support" className="text-teal-600 hover:text-teal-500">contact us here</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Cookies and Tracking</h2>
            <p className="text-slate-600 leading-relaxed">
              We use essential cookies to maintain your authentication session. We do not use
              third-party advertising or tracking cookies. You can configure your browser to reject cookies,
              but this will prevent you from staying logged in.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Children&apos;s Privacy</h2>
            <p className="text-slate-600 leading-relaxed">
              The Service is not intended for users under 18 years of age. We do not knowingly collect
              personal information from children under 18. If you believe a minor has created an account,
              contact us immediately via our <a href="/support" className="text-teal-600 hover:text-teal-500">support page</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. California Privacy Rights (CCPA)</h2>
            <p className="text-slate-600 leading-relaxed">
              If you are a California resident, you have additional rights under the California Consumer
              Privacy Act (CCPA), including the right to know what personal information we collect,
              the right to delete your information, and the right to opt out of the sale of personal
              information. We do not sell personal information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Changes to This Policy</h2>
            <p className="text-slate-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material changes
              by email or by posting the updated policy on this page with a new &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Contact Us</h2>
            <p className="text-slate-600 leading-relaxed">
              If you have any questions about this Privacy Policy, please <a href="/support" className="text-teal-600 hover:text-teal-500">contact us here</a>.
            </p>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}

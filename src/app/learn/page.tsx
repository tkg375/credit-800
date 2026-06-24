import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { GetStartedButton } from "@/components/AuthModalButtons";
import { learnArticles, learnCategories } from "@/lib/learn-articles";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Credit Education — Learn How to Fix & Build Your Credit",
  description:
    "Free, in-depth guides on credit scores, dispute rights, debt management, identity protection, and how to build credit from scratch. Backed by FCRA and FDCPA.",
  openGraph: {
    title: "Credit Education Hub — Free Guides on Credit Repair & Building",
    description:
      "Learn how credit scores are calculated, how to dispute errors, your FCRA rights, and how to handle collections — free expert guides.",
    url: "https://credit-800.com/learn",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Credit Education" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Credit Education Hub — Free Guides on Credit Repair & Building",
    description:
      "Free in-depth credit guides: scores, disputes, FCRA rights, collections, identity theft, and more.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://credit-800.com/learn",
  },
};

const categoryColors: Record<string, string> = {
  "Understanding Credit": "bg-blue-50 text-[#1a3fd4]",
  "Dispute Rights": "bg-rose-100 text-rose-700",
  "Building Credit": "bg-lime-100 text-lime-700",
  "Debt Management": "bg-amber-100 text-amber-700",
  "Identity Protection": "bg-blue-100 text-blue-700",
};

const learnJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Credit Education Hub",
  description:
    "Free, in-depth guides on credit scores, dispute rights, debt management, identity protection, and building credit.",
  url: "https://credit-800.com/learn",
  publisher: {
    "@type": "Organization",
    name: "Credit 800",
    url: "https://credit-800.com",
  },
  hasPart: learnArticles.map((article) => ({
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    url: `https://credit-800.com/learn/${article.slug}`,
    datePublished: article.publishDate,
  })),
};

export default function LearnPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(learnJsonLd) }}
      />
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <MarketingNav />
      </header>

      <div className="bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-14 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3">Credit Education Hub</h1>
          <p className="text-lime-100 max-w-2xl mx-auto text-sm sm:text-base">
            Free, in-depth guides on everything credit — from understanding your score to disputing errors to building from scratch.
          </p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        {learnCategories.map((category) => {
          const articles = learnArticles.filter((a) => a.category === category);
          if (articles.length === 0) return null;
          return (
            <section key={category} className="mb-14">
              <div className="flex items-center gap-3 mb-6">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${categoryColors[category] ?? "bg-slate-100 text-slate-600"}`}>
                  {category}
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {articles.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/learn/${article.slug}`}
                    className="group border border-slate-200 rounded-xl p-5 hover:border-teal-300 hover:shadow-md transition block"
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[article.category] ?? "bg-slate-100 text-slate-500"}`}>
                        {article.category}
                      </span>
                      <span className="text-xs text-slate-400">{article.readTime} read</span>
                    </div>
                    <h2 className="font-semibold text-slate-900 mb-2 group-hover:text-teal-700 transition text-sm sm:text-base leading-snug">
                      {article.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed line-clamp-3">{article.excerpt}</p>
                    <span className="inline-flex items-center gap-1 text-xs text-teal-600 font-medium mt-3 group-hover:gap-2 transition-all">
                      Read article
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <div className="bg-gradient-to-r from-[#1a3fd4] to-[#00d4aa] rounded-2xl p-8 text-center mt-8">
          <h2 className="text-2xl font-bold text-white mb-2">Put This Knowledge to Work</h2>
          <p className="text-lime-100 text-sm mb-6 max-w-lg mx-auto">
            Upload your credit report and let Credit 800 identify every disputable item, generate personalized FCRA-compliant letters, and build your action plan.
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { GetStartedButton } from "@/components/AuthModalButtons";
import { learnArticles, getArticleBySlug, getRelatedArticles, type SectionType } from "@/lib/learn-articles";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return learnArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      url: `https://credit-800.com/learn/${article.slug}`,
      type: "article",
      publishedTime: article.publishDate,
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
      images: ["/og-image.png"],
    },
    alternates: {
      canonical: `https://credit-800.com/learn/${article.slug}`,
    },
  };
}

const categoryColors: Record<string, string> = {
  "Understanding Credit": "bg-teal-100 text-teal-700",
  "Dispute Rights": "bg-rose-100 text-rose-700",
  "Building Credit": "bg-lime-100 text-lime-700",
  "Debt Management": "bg-amber-100 text-amber-700",
  "Identity Protection": "bg-blue-100 text-blue-700",
};

function renderSection(section: SectionType, idx: number) {
  switch (section.type) {
    case "h2":
      return (
        <h2 key={idx} className="text-xl sm:text-2xl font-bold text-slate-900 mt-10 mb-4">
          {section.text}
        </h2>
      );
    case "h3":
      return (
        <h3 key={idx} className="text-base sm:text-lg font-semibold text-slate-800 mt-6 mb-2">
          {section.text}
        </h3>
      );
    case "p":
      return (
        <p key={idx} className="text-slate-600 leading-relaxed mb-4 text-sm sm:text-base">
          {section.text}
        </p>
      );
    case "ul":
      return (
        <ul key={idx} className="list-disc list-inside space-y-2 mb-4 text-slate-600 text-sm sm:text-base ml-2">
          {section.items.map((item, i) => (
            <li key={i} className="leading-relaxed">{item}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={idx} className="list-decimal list-inside space-y-2 mb-4 text-slate-600 text-sm sm:text-base ml-2">
          {section.items.map((item, i) => (
            <li key={i} className="leading-relaxed">{item}</li>
          ))}
        </ol>
      );
    case "callout": {
      const styles = {
        info: "bg-blue-50 border-blue-200 text-blue-800",
        warning: "bg-amber-50 border-amber-200 text-amber-800",
        tip: "bg-teal-50 border-teal-200 text-teal-800",
      };
      const icons = {
        info: "ℹ️",
        warning: "⚠️",
        tip: "💡",
      };
      return (
        <div key={idx} className={`border rounded-xl p-4 mb-4 flex gap-3 text-sm ${styles[section.variant]}`}>
          <span className="text-lg flex-shrink-0 mt-0.5">{icons[section.variant]}</span>
          <p className="leading-relaxed">{section.text}</p>
        </div>
      );
    }
    case "table":
      return (
        <div key={idx} className="overflow-x-auto mb-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100">
                {section.headers.map((h, i) => (
                  <th key={i} className="text-left px-4 py-2.5 text-slate-700 font-semibold border border-slate-200">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2.5 text-slate-600 border border-slate-200">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

export default async function LearnArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const related = getRelatedArticles(article.relatedSlugs);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    url: `https://credit-800.com/learn/${article.slug}`,
    datePublished: article.publishDate,
    publisher: {
      "@type": "Organization",
      name: "Credit 800",
      url: "https://credit-800.com",
      logo: { "@type": "ImageObject", url: "https://credit-800.com/og-image.png" },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://credit-800.com/learn/${article.slug}`,
    },
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <MarketingNav />
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-400 mb-6">
          <Link href="/" className="hover:text-slate-600 transition">Home</Link>
          <span>/</span>
          <Link href="/learn" className="hover:text-slate-600 transition">Learn</Link>
          <span>/</span>
          <span className="text-slate-600 truncate">{article.title}</span>
        </nav>

        {/* Article header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColors[article.category] ?? "bg-slate-100 text-slate-500"}`}>
              {article.category}
            </span>
            <span className="text-xs text-slate-400">{article.readTime} read</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 leading-tight mb-4">
            {article.title}
          </h1>
          <p className="text-slate-500 text-sm sm:text-base leading-relaxed">{article.excerpt}</p>
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-200 mb-8" />

        {/* Article content */}
        <article className="prose-custom">
          {article.sections.map((section, idx) => renderSection(section, idx))}
        </article>

        {/* CTA */}
        <div className="bg-gradient-to-r from-lime-500 via-teal-500 to-cyan-600 rounded-2xl p-6 sm:p-8 text-center mt-12">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Ready to Put This Into Action?</h2>
          <p className="text-lime-100 text-sm mb-6 max-w-md mx-auto">
            Upload your credit report and get personalized FCRA dispute letters, a score improvement plan, and all the tools you need — in one place.
          </p>
          <GetStartedButton className="inline-block px-8 py-3 bg-white text-teal-600 hover:bg-lime-50 rounded-lg font-medium transition">
            Get Started
          </GetStartedButton>
        </div>

        {/* Related articles */}
        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Related Articles</h2>
            <div className="space-y-3">
              {related.map((rel) => (
                <Link
                  key={rel.slug}
                  href={`/learn/${rel.slug}`}
                  className="flex items-start gap-3 p-4 border border-slate-200 rounded-xl hover:border-teal-300 hover:shadow-sm transition group"
                >
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${categoryColors[rel.category] ?? "bg-slate-100 text-slate-500"}`}>
                    {rel.category}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-teal-700 transition">{rel.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{rel.readTime} read</p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-4">
              <Link href="/learn" className="text-sm text-teal-600 hover:text-teal-700 font-medium transition">
                ← View all articles
              </Link>
            </div>
          </section>
        )}
      </main>

      <MarketingFooter />
    </div>
  );
}

import type { MetadataRoute } from "next";
import { learnArticles } from "@/lib/learn-articles";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://credit-800.com";
  const now = new Date();

  const articleUrls: MetadataRoute.Sitemap = learnArticles.map((article) => ({
    url: `${base}/learn/${article.slug}`,
    lastModified: new Date(article.publishDate),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${base}/learn`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...articleUrls,
    {
      url: `${base}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/glossary`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/sample-letters`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/support`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${base}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}

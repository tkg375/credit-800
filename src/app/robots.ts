import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register", "/privacy", "/terms", "/faq", "/sample-letters", "/support", "/learn", "/about", "/glossary"],
        disallow: [
          "/dashboard",
          "/disputes",
          "/analyze-letter",
          "/education",
          "/templates",
          "/vault",
          "/simulator",
          "/bureaus",
          "/scores",
          "/upload",
          "/calendar",
          "/goals",
          "/payoff",
          "/portfolio",
          "/budget",
          "/investing",
          "/credit-builder",
          "/cfpb",
          "/freeze",
          "/monitoring",
          "/readiness",
          "/profile",
          "/tools",
          "/admin",
          "/api/",
        ],
      },
    ],
    sitemap: "https://credit-800.com/sitemap.xml",
  };
}

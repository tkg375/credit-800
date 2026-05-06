import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support — Credit 800",
  description: "Contact the Credit 800 support team. We respond within 1 business day.",
  alternates: { canonical: "https://credit-800.com/support" },
  openGraph: {
    title: "Contact Support — Credit 800",
    description: "Have a question? Send us a message and we'll respond within 1 business day.",
    url: "https://credit-800.com/support",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Credit 800 Support" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Support — Credit 800",
    description: "Have a question? Send us a message and we'll respond within 1 business day.",
  },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";
import { Exo_2 } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const exo2 = Exo_2({
  variable: "--font-exo2",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Credit 800 — Smarter Credit Repair",
    template: "%s | Credit 800",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
  },
  description:
    "Credit 800 analyzes your credit report, automatically generates FCRA-compliant dispute letters, and builds a personalized action plan to reach an 800 credit score.",
  keywords: [
    "credit repair",
    "credit repair software",
    "dispute credit report",
    "improve credit score",
    "FCRA dispute letters",
    "credit bureau dispute",
    "remove collections",
    "credit score 800",
    "fix bad credit",
    "credit repair software",
    "automated credit repair",
    "dispute collections",
    "credit report errors",
    "raise credit score fast",
    "how to dispute credit report",
    "remove negative items from credit report",
    "credit repair letters",
    "goodwill letter template",
    "pay for delete letter",
    "debt validation letter",
    "Section 609 dispute letter",
    "credit repair app",
    "fix credit score fast",
    "how to improve credit score",
    "credit score simulator",
    "loan readiness",
    "debt payoff calculator",
    "budget tracker",
    "CFPB complaint",
    "credit freeze",
  ],
  authors: [{ name: "Credit 800", url: "https://credit-800.com" }],
  creator: "Credit 800",
  publisher: "Credit 800",
  metadataBase: new URL("https://credit-800.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://credit-800.com",
    siteName: "Credit 800",
    title: "Credit 800 — Smarter Credit Repair",
    description:
      "Analyze your credit report, dispute inaccuracies automatically, and get a personalized plan to reach an 800 credit score.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Credit 800 — Smarter Credit Repair",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Credit 800 — Smarter Credit Repair",
    description:
      "Dispute letters, score analysis, and a personalized plan to reach 800.",
    images: ["/og-image.png"],
    creator: "@credit800",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://credit-800.com",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Credit 800",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#14b8a6",
    "google-adsense-account": "ca-pub-9321589235939792",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9321589235939792"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${exo2.variable} antialiased`}
        style={{ fontFamily: "var(--font-exo2), sans-serif" }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

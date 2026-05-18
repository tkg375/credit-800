import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.credit-800.com" }],
        destination: "https://credit-800.com/:path*",
        permanent: true,
      },
    ];
  },
  serverExternalPackages: ["openai"],
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  // Server-side env vars are baked in at build time so they reach the Amplify
  // Lambda runtime (Amplify does not inject console env vars into Lambda at runtime).
  // These values are only present in the server bundle — never sent to the browser.
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    JWT_SECRET: process.env.JWT_SECRET ?? "",
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ?? "",
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ?? "",
    S3_REGION: process.env.S3_REGION ?? "us-east-1",
    S3_BUCKET: process.env.S3_BUCKET ?? "",
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "",
    STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID ?? "",
    STRIPE_AUTOPILOT_PRICE_ID: process.env.STRIPE_AUTOPILOT_PRICE_ID ?? "",
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
    POSTGRID_API_KEY: process.env.POSTGRID_API_KEY ?? "",
    OWNER_NOTIFICATION_EMAIL: process.env.OWNER_NOTIFICATION_EMAIL ?? "",
    ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? "",
    DYNAMODB_TABLE_PREFIX: process.env.DYNAMODB_TABLE_PREFIX ?? "credit800",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "https://credit-800.com",
    LAMBDA_FUNCTION_NAME: process.env.LAMBDA_FUNCTION_NAME ?? "",
  },
};

export default nextConfig;

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
  // NOTE: Only NEXT_PUBLIC_ vars belong here. All server-only secrets (API keys,
  // credentials, signing secrets) must NOT be listed here — they are available to
  // server code via process.env without being placed in this block.
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  },
};

export default nextConfig;

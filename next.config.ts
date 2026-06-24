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
};

export default nextConfig;

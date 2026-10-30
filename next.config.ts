import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDFs and fonts are read from disk at run time (welcome pack, certificates, receipts), so make
  // sure the deployed functions carry them, including pack files added later such as the bye-laws.
  outputFileTracingIncludes: {
    "/api/**": ["./assets/**/*"],
  },
  async headers() {
    return [
      {
        // The back office is reachable by URL only — keep it out of search engines.
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;

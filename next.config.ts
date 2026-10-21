import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The study API reads the gzipped library from disk at request time.
  outputFileTracingIncludes: {
    "/api/*": ["./data/corpus/**/*"],
  },
  // The phone app is one static page (web/app.html, copied to public/ by
  // scripts/build-web.mjs), served at the root.
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/margin.html" }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;

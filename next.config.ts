import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The study API reads the gzipped library from disk at request time.
  outputFileTracingIncludes: {
    "/api/*": ["./data/corpus/**/*"],
  },
};

export default nextConfig;

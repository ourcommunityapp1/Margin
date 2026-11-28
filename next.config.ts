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
      beforeFiles: [
        // katekize.com's front door is the public home page. Netlify also rewrites this, but if the server
        // handler sees the original "/" it must not fall through to the phone-app rule below (that gave a 404).
        { source: "/", has: [{ type: "host", value: "katekize.com" }], destination: "/katekize" },
        { source: "/", destination: "/margin.html" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;

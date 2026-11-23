import type { MetadataRoute } from 'next';

// Search engines and AI answer engines may read the public pages. The app's own screens are marked noindex in the
// app, and the API is kept out of crawls.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/'] }],
    sitemap: 'https://katekize.com/sitemap.xml',
  };
}

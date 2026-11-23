import type { MetadataRoute } from 'next';

// The public pages of katekize.com. Add each new public page here (the catechism hubs and question pages, the
// guides) so search engines find it. The app itself (/heir) is marked noindex and is left out on purpose.
const BASE = 'https://katekize.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const built = new Date();
  return [{ url: `${BASE}/`, lastModified: built, changeFrequency: 'monthly', priority: 1 }];
}

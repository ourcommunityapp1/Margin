import type { MetadataRoute } from 'next';
import { courseItems, getCourse } from '@/heir/content';
import { PUBLISHED, allGuides } from '@/site/guides';
import { PASSAGES } from '@/site/passages';

// The public pages of katekize.com. Every new public page is listed here so search engines find it. The app itself
// (/heir) is marked noindex and is left out on purpose. `lastModified` is the date the public content last changed
// (PUBLISHED in site/guides.ts), not the build time, because search engines ignore dates that always read "today".
const BASE = 'https://katekize.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const changed = new Date(`${PUBLISHED}T12:00:00Z`);
  const page = (path: string, priority: number, changeFrequency: 'monthly' | 'yearly' = 'monthly') => ({ url: `${BASE}${path}`, lastModified: changed, changeFrequency, priority });
  return [
    page('/', 1),
    page('/westminster-shorter-catechism', 0.9),
    page('/guides', 0.8),
    ...allGuides().map((g) => page(`/guides/${g.slug}`, 0.8)),
    ...PASSAGES.map((p) => page(`/memorize/${p.slug}`, 0.8)),
    page('/about', 0.5),
    ...courseItems(getCourse('westminster-shorter')!).map((i) => page(`/westminster-shorter-catechism/${i.number}`, 0.7, 'yearly')),
  ];
}

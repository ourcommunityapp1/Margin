import type { MetadataRoute } from 'next';
import { courseItems, getCourse } from '@/heir/content';
import { allGuides } from '@/site/guides';

// The public pages of katekize.com. Every new public page is listed here so search engines find it. The app itself
// (/heir) is marked noindex and is left out on purpose.
const BASE = 'https://katekize.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const built = new Date();
  const questions = courseItems(getCourse('westminster-shorter')!).map((i) => ({ url: `${BASE}/westminster-shorter-catechism/${i.number}`, lastModified: built, changeFrequency: 'yearly' as const, priority: 0.7 }));
  const guides = allGuides().map((g) => ({ url: `${BASE}/guides/${g.slug}`, lastModified: built, changeFrequency: 'monthly' as const, priority: 0.8 }));
  return [
    { url: `${BASE}/`, lastModified: built, changeFrequency: 'monthly', priority: 1 },
    { url: `${BASE}/westminster-shorter-catechism`, lastModified: built, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/guides`, lastModified: built, changeFrequency: 'monthly', priority: 0.8 },
    ...guides,
    ...questions,
  ];
}

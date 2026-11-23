import type { Metadata } from 'next';
import Link from 'next/link';
import { allGuides } from '@/site/guides';
import { Crumbs, JsonLd, SITE, SiteFooter, SiteHeader, breadcrumbLd } from '../shell';

const TITLE = 'Guides to Memorizing Scripture and the Catechism';
const DESCRIPTION = 'Plain answers on how to memorize Bible verses, how to review them, why they fade, and how to start the Westminster Shorter Catechism with your family.';
export const metadata: Metadata = {
  title: { absolute: TITLE }, description: DESCRIPTION, alternates: { canonical: `${SITE}/guides` },
  openGraph: { type: 'website', url: `${SITE}/guides`, siteName: 'Katekize', title: TITLE, description: DESCRIPTION, images: [{ url: '/katekize-og.png', width: 1200, height: 630 }] },
};

export default function Guides() {
  const trail = [{ name: 'Katekize', href: '/' }, { name: 'Guides', href: '/guides' }];
  return (
    <>
      <JsonLd data={breadcrumbLd(trail)} />
      <div className="kz-wrap">
        <SiteHeader />
        <main className="kz-page">
          <Crumbs trail={trail} />
          <h1>Guides to memorizing Scripture and the catechism</h1>
          <p className="kz-answer">Plain answers to the questions people ask most: how to memorize Bible verses, how to keep them, and how to start the catechism with your family.</p>
          <ul className="kz-guides">
            {allGuides().map((g) => (
              <li key={g.slug}><Link href={`/guides/${g.slug}`}><b>{g.title}</b><span>{g.description}</span></Link></li>
            ))}
          </ul>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}

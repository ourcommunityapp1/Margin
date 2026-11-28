import type { Metadata } from 'next';
import Link from 'next/link';
import { PUBLISHED, PUBLISHED_LABEL, SOURCES } from '@/site/guides';
import { Crumbs, JsonLd, SITE, SiteFooter, SiteHeader, breadcrumbLd } from '../shell';

const TITLE = 'About Katekize: Where the Words Come From and How It Teaches';
const DESCRIPTION = 'Katekize helps families memorize Scripture, catechisms and creeds. Where the catechism and Bible text come from, and the memory research behind how it teaches.';
export const metadata: Metadata = {
  title: { absolute: TITLE }, description: DESCRIPTION, alternates: { canonical: `${SITE}/about` },
  openGraph: { type: 'website', url: `${SITE}/about`, siteName: 'Katekize', title: TITLE, description: DESCRIPTION, images: [{ url: '/katekize-og.jpg', width: 1200, height: 630 }] },
};

export default function About() {
  const trail = [{ name: 'Katekize', href: '/' }, { name: 'About', href: '/about' }];
  return (
    <>
      <JsonLd data={breadcrumbLd(trail)} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'AboutPage', name: TITLE, url: `${SITE}/about`, dateModified: PUBLISHED, isPartOf: { '@type': 'WebSite', name: 'Katekize', url: SITE } }} />
      <div className="kz-wrap">
        <SiteHeader />
        <main className="kz-page">
          <Crumbs trail={trail} />
          <h1>About Katekize</h1>
          <p className="kz-muted">Updated <time dateTime={PUBLISHED}>{PUBLISHED_LABEL}</time></p>
          <p className="kz-answer">Katekize is a web app that helps families memorize Scripture, the Westminster Catechisms and the creeds together, and keep them for life. It teaches by recall and spaced review, and it says plainly where every word it shows comes from.</p>

          <section aria-labelledby="words-h">
            <h2 id="words-h">Where the words come from</h2>
            <ul className="kz-list">
              <li><b>The catechisms and creeds.</b> The Westminster Shorter and Larger Catechisms (1647), the Apostles’ Creed and the Nicene Creed are in the public domain. The Shorter Catechism’s Scripture proofs follow the Westminster Assembly’s own citations.</li>
              <li><b>Scripture on these public pages.</b> The Berean Standard Bible (BSB), which is in the public domain. Verses are shown exactly as the text has them.</li>
              <li><b>Scripture in the app.</b> The New American Standard Bible (NASB), used by permission of The Lockman Foundation.</li>
            </ul>
          </section>

          <section aria-labelledby="teach-h">
            <h2 id="teach-h">How it teaches</h2>
            <p>Each verse or answer is learned in short phrases, then recalled from memory by typing or speaking it. Reviews come back when you are close to forgetting. A verse earns a stone only when you recall all of it with no hints after time away: a night, weeks, months and, at the top, a year or more. The reasoning is explained in <Link href="/guides/how-to-memorize-bible-verses">How do you memorize Bible verses and actually keep them?</Link></p>
            <h3>Research behind it</h3>
            <ul className="kz-refs">{[SOURCES.roediger, SOURCES.cepeda, SOURCES.rawson, SOURCES.bahrick].map((s) => <li key={s}>{s}</li>)}</ul>
          </section>

          <section aria-labelledby="fam-h">
            <h2 id="fam-h">For families</h2>
            <p>Everyone has their own pace and progress, and a child track uses shorter pieces. Separate accounts can be linked so one person can see another’s progress, view only.</p>
          </section>

          <section aria-labelledby="notes-h">
            <h2 id="notes-h">What you will find on this site</h2>
            <ul className="kz-list">
              <li><Link href="/westminster-shorter-catechism">All 107 questions of the Westminster Shorter Catechism</Link>, each on its own page.</li>
              <li><Link href="/guides">Guides</Link> on memorizing and reviewing.</li>
              <li>Memorizing pages for <Link href="/memorize/psalm-23">Psalm 23</Link> and <Link href="/memorize/the-lords-prayer">the Lord’s Prayer</Link>.</li>
            </ul>
            <p className="kz-muted">Window and photo credits are on the <Link href="/heir/about">credits page</Link>.</p>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}

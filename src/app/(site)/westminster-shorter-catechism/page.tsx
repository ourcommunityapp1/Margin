import type { Metadata } from 'next';
import Link from 'next/link';
import { courseItems, courseParts, getCourse } from '@/heir/content';
import { Crumbs, JsonLd, SITE, SiteFooter, SiteHeader, breadcrumbLd } from '../shell';

const URL_HUB = `${SITE}/westminster-shorter-catechism`;
const TITLE = 'Westminster Shorter Catechism: All 107 Questions and Answers';
const DESCRIPTION = 'Read all 107 questions and answers of the Westminster Shorter Catechism, each on its own page with Scripture proofs and a way to memorize it.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: URL_HUB },
  openGraph: { type: 'website', url: URL_HUB, siteName: 'Katekize', title: TITLE, description: DESCRIPTION, images: [{ url: '/katekize-og.png', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/katekize-og.png'] },
};

export default function Hub() {
  const course = getCourse('westminster-shorter')!;
  const parts = courseParts(course);
  const total = courseItems(course).length;
  const trail = [{ name: 'Katekize', href: '/' }, { name: 'Westminster Shorter Catechism', href: '/westminster-shorter-catechism' }];
  return (
    <>
      <JsonLd data={breadcrumbLd(trail)} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: TITLE, url: URL_HUB, description: DESCRIPTION, isPartOf: { '@type': 'WebSite', name: 'Katekize', url: SITE } }} />
      <div className="kz-wrap">
        <SiteHeader />
        <main className="kz-page">
          <Crumbs trail={trail} />
          <h1>Westminster Shorter Catechism: all {total} questions and answers</h1>
          <p className="kz-answer">The Westminster Shorter Catechism (1647) is a set of {total} questions and answers about what Christians believe and how they live. It begins with “What is the chief end of man?” and is written to be memorized. Each question below has its own page with the answer, the Scripture proofs, and a way to memorize it.</p>
          <div className="kz-cta">
            <Link href="/heir/courses/westminster-shorter" className="kz-btn">Memorize it in Katekize</Link>
            <Link href="/guides/how-long-to-memorize-the-westminster-shorter-catechism" className="kz-btn quiet">How long does it take?</Link>
          </div>
          {parts.map((part, pi) => (
            <section key={part.title} className="kz-qlist" aria-labelledby={`part-${pi}`}>
              <h2 id={`part-${pi}`}>{part.title}</h2>
              <p className="kz-muted">Questions {part.items[0].number}–{part.items[part.items.length - 1].number}</p>
              <ol>
                {part.items.map((i) => (
                  <li key={i.id}><Link href={`/westminster-shorter-catechism/${i.number}`}><span className="n">{i.number}</span><span>{i.prompt}</span></Link></li>
                ))}
              </ol>
            </section>
          ))}
          <p className="kz-muted">Katekize groups the questions into these three parts for study. The text is the 1647 catechism, which is in the public domain.</p>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}

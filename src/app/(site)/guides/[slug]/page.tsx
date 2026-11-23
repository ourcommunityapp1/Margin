import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PUBLISHED, PUBLISHED_LABEL, allGuides, guideBySlug } from '@/site/guides';
import { BIBLE_NOTICE, passageText } from '@/site/bible';
import { Crumbs, JsonLd, SITE, SiteFooter, SiteHeader, breadcrumbLd } from '../../shell';

export const dynamicParams = false;
export const generateStaticParams = () => allGuides().map((g) => ({ slug: g.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = guideBySlug(slug);
  if (!g) return {};
  const url = `${SITE}/guides/${g.slug}`;
  return {
    title: { absolute: `${g.title} | Katekize` }, description: g.description, alternates: { canonical: url },
    openGraph: { type: 'article', url, siteName: 'Katekize', title: g.title, description: g.description, publishedTime: PUBLISHED, images: [{ url: '/katekize-og.jpg', width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title: g.title, description: g.description, images: ['/katekize-og.jpg'] },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = guideBySlug(slug);
  if (!g) notFound();
  const url = `/guides/${g.slug}`;
  const trail = [{ name: 'Katekize', href: '/' }, { name: 'Guides', href: '/guides' }, { name: g.label, href: url }];
  const verses = new Map<string, Awaited<ReturnType<typeof passageText>>>();
  for (const s of g.sections) if (s.verse) verses.set(s.verse, await passageText(s.verse));
  const usesVerse = verses.size > 0;
  const related = g.related.map((r) => guideBySlug(r)).filter((x): x is NonNullable<typeof x> => !!x);

  return (
    <>
      <JsonLd data={breadcrumbLd(trail)} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Article', headline: g.title, description: g.description, url: `${SITE}${url}`, datePublished: PUBLISHED, dateModified: PUBLISHED, inLanguage: 'en', author: { '@type': 'Organization', name: 'Katekize', url: SITE }, publisher: { '@type': 'Organization', name: 'Katekize', url: SITE }, mainEntityOfPage: `${SITE}${url}` }} />
      <div className="kz-wrap">
        <SiteHeader />
        <main className="kz-page">
          <Crumbs trail={trail} />
          <h1>{g.title}</h1>
          <p className="kz-muted">Updated <time dateTime={PUBLISHED}>{PUBLISHED_LABEL}</time></p>
          <p className="kz-answer">{g.answer}</p>
          {g.sections.map((s) => {
            const v = s.verse ? verses.get(s.verse) : null;
            const List = s.ordered ? 'ol' : 'ul';
            return (
              <section key={s.h} aria-labelledby={`h-${s.h.replace(/\W+/g, '-')}`}>
                <h2 id={`h-${s.h.replace(/\W+/g, '-')}`}>{s.h}</h2>
                {s.p?.map((t) => <p key={t}>{t}</p>)}
                {s.table && (
                  <div className="kz-tablewrap"><table>
                    <thead><tr>{s.table.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>{s.table.rows.map((r) => <tr key={r.join('|')}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
                  </table></div>
                )}
                {s.list && <List className="kz-list">{s.list.map((t) => <li key={t}>{t}</li>)}</List>}
                {v && (
                  <figure className="kz-proofs one">
                    <figcaption>{v.ref}</figcaption>
                    <blockquote>{v.verses.map((x) => <span key={x.n}>{v.verses.length > 1 ? <sup>{x.n}</sup> : null}{x.text} </span>)}</blockquote>
                  </figure>
                )}
              </section>
            );
          })}
          <div className="kz-cta">
            <Link href="/heir" className="kz-btn">Try it in Katekize</Link>
            <Link href="/westminster-shorter-catechism" className="kz-btn quiet">Westminster Shorter Catechism</Link>
          </div>
          {related.length > 0 && (
            <section aria-labelledby="rel-h">
              <h2 id="rel-h">Related guides</h2>
              <ul className="kz-list">{related.map((r) => <li key={r.slug}><Link href={`/guides/${r.slug}`}>{r.title}</Link></li>)}</ul>
            </section>
          )}
          {g.sources && (
            <section aria-labelledby="src-h">
              <h2 id="src-h">Sources</h2>
              <ul className="kz-refs">{g.sources.map((s) => <li key={s}>{s}</li>)}</ul>
            </section>
          )}
        </main>
        <SiteFooter notice={usesVerse ? BIBLE_NOTICE : undefined} />
      </div>
    </>
  );
}

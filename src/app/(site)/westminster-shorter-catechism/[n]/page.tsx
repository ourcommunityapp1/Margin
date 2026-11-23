import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { courseItems, courseParts, getCourse, getItem } from '@/heir/content';
import { BIBLE_NOTICE, proofTexts } from '@/site/bible';
import { Crumbs, JsonLd, SITE, SiteFooter, SiteHeader, breadcrumbLd } from '../../shell';

// One page per question: the question as the heading, the answer first, then what it means (only once the owner has
// approved the notes), the Scripture proofs with their text, and a way to memorize it.

export const dynamicParams = false;
const course = () => getCourse('westminster-shorter')!;
export const generateStaticParams = () => courseItems(course()).map((i) => ({ n: String(i.number) }));

const cut = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1).replace(/\s+\S*$/, '')}…`);
const titleFor = (n: number, q: string) => {
  const full = `WSC Q${n}: ${q} | Westminster Shorter Catechism`;
  return full.length <= 70 ? full : `WSC Q${n}: ${q}`;
};

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> {
  const { n } = await params;
  const item = getItem(`wsc-${n}`);
  if (!item) return {};
  const url = `${SITE}/westminster-shorter-catechism/${item.number}`;
  const title = titleFor(item.number, item.prompt);
  const description = cut(`${item.text} Westminster Shorter Catechism question ${item.number}, with Scripture proofs and a way to memorize it.`, 158);
  return {
    title: { absolute: title }, description, alternates: { canonical: url },
    openGraph: { type: 'article', url, siteName: 'Katekize', title, description, images: [{ url: '/katekize-og.png', width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: ['/katekize-og.png'] },
  };
}

export default async function QuestionPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const item = getItem(`wsc-${n}`);
  if (!item || item.collection !== 'westminster-shorter') notFound();
  const all = courseItems(course());
  const prev = all.find((i) => i.number === item.number - 1);
  const next = all.find((i) => i.number === item.number + 1);
  const part = courseParts(course()).find((p) => p.items.some((i) => i.id === item.id));
  const { shown, refsOnly } = await proofTexts(item.connected);
  const url = `/westminster-shorter-catechism/${item.number}`;
  const trail = [{ name: 'Katekize', href: '/' }, { name: 'Westminster Shorter Catechism', href: '/westminster-shorter-catechism' }, { name: `Question ${item.number}`, href: url }];
  // The plain-language notes are drafts until the owner approves them; only approved notes go on public pages.
  const meaning = item.reviewed ? item.meaning : [];

  return (
    <>
      <JsonLd data={breadcrumbLd(trail)} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebPage', name: titleFor(item.number, item.prompt), url: `${SITE}${url}`, description: item.text, isPartOf: { '@type': 'CreativeWork', name: 'Westminster Shorter Catechism', url: `${SITE}/westminster-shorter-catechism` }, inLanguage: 'en' }} />
      <div className="kz-wrap">
        <SiteHeader />
        <main className="kz-page">
          <Crumbs trail={trail} />
          <span className="kz-eyebrow">Westminster Shorter Catechism · Question {item.number} of {all.length}{part ? ` · ${part.title}` : ''}</span>
          <h1>{item.prompt}</h1>
          <p className="kz-answer">{item.text}</p>
          <div className="kz-cta">
            <Link href="/heir/courses/westminster-shorter" className="kz-btn">Memorize this in Katekize</Link>
            <a href="#memorize" className="kz-btn quiet">How to memorize it</a>
          </div>

          {meaning.length > 0 && (
            <section aria-labelledby="mean-h">
              <h2 id="mean-h">What this means</h2>
              {meaning.map((m) => <p key={m.phrase}><b>{m.question}</b> {m.answer}. {m.explain}</p>)}
            </section>
          )}

          <section aria-labelledby="proofs-h">
            <h2 id="proofs-h">Scripture proofs</h2>
            <p className="kz-muted">The passages the Westminster Assembly cited for this answer. {BIBLE_NOTICE}</p>
            <div className="kz-proofs">
              {shown.map((p) => (
                <figure key={p.ref}>
                  <figcaption>{p.ref}</figcaption>
                  <blockquote>
                    {p.verses.map((v) => <span key={v.n}>{p.verses.length > 1 || v.n !== p.verses[0].n ? <sup>{v.n}</sup> : null}{v.text} </span>)}
                  </blockquote>
                </figure>
              ))}
            </div>
            {refsOnly.length > 0 && <p className="kz-muted">Also cited: {refsOnly.join('; ')}.</p>}
          </section>

          <section id="memorize" aria-labelledby="mem-h">
            <h2 id="mem-h">How to memorize this answer</h2>
            <p>Learn it a phrase at a time, then say the whole answer from memory with the page closed. This is how Katekize splits it:</p>
            <ol className="kz-pieces">
              {item.chunks.adult.map((c) => <li key={c}>{c}</li>)}
            </ol>
            <p>For younger children, Katekize uses shorter pieces:</p>
            <ol className="kz-pieces">
              {item.chunks.child.map((c) => <li key={c}>{c}</li>)}
            </ol>
            <p>After a night’s sleep, try to say the answer before looking at it, and then again after a few days. <Link href="/guides/how-to-review-memorized-verses">How to review what you have memorized</Link>.</p>
          </section>

          <nav className="kz-pn" aria-label="Neighboring questions">
            {prev ? <Link href={`/westminster-shorter-catechism/${prev.number}`}><small>Previous</small><span>Q{prev.number}: {prev.prompt}</span></Link> : <span />}
            {next ? <Link href={`/westminster-shorter-catechism/${next.number}`} className="r"><small>Next</small><span>Q{next.number}: {next.prompt}</span></Link> : <span />}
          </nav>
          <p><Link href="/westminster-shorter-catechism">All {all.length} questions</Link></p>
        </main>
        <SiteFooter notice="Westminster Shorter Catechism (1647), public domain. Proof texts follow the Westminster Assembly’s own citations." />
      </div>
    </>
  );
}

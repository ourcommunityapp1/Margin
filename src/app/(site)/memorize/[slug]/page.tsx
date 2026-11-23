import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BIBLE_NOTICE, passageText } from '@/site/bible';
import { PASSAGES, courseEstimates, passageBySlug, phrasesOf } from '@/site/passages';
import { PUBLISHED, PUBLISHED_LABEL, guideBySlug } from '@/site/guides';
import { Crumbs, JsonLd, SITE, SiteFooter, SiteHeader, breadcrumbLd } from '../../shell';

export const dynamicParams = false;
export const generateStaticParams = () => PASSAGES.map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = passageBySlug(slug);
  if (!p) return {};
  const est = courseEstimates(p.course).find((e) => e.minutes === 15)!;
  const url = `${SITE}/memorize/${p.slug}`;
  const description = `The full text of ${p.ref} in short phrases, a day-by-day memorizing plan, and how to review it. Katekize estimates ${est.label} at 15 minutes a day.`;
  const title = `${p.title} | Katekize`;
  return {
    title: { absolute: title }, description, alternates: { canonical: url },
    openGraph: { type: 'article', url, siteName: 'Katekize', title, description, publishedTime: PUBLISHED, images: [{ url: '/katekize-og.jpg', width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: ['/katekize-og.jpg'] },
  };
}

export default async function MemorizePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = passageBySlug(slug);
  if (!p) notFound();
  const text = await passageText(p.ref);
  if (!text) notFound();
  const est = courseEstimates(p.course);
  const at15 = est.find((e) => e.minutes === 15)!;
  const n = text.verses.length;
  const url = `/memorize/${p.slug}`;
  const trail = [{ name: 'Katekize', href: '/' }, { name: `Memorize ${p.name}`, href: url }];
  const plan = text.verses.map((v, i) => [`Day ${i + 1}`, i === 0 ? `Learn verse ${v.n} in phrases, then say it from memory.` : i === n - 1 ? `Learn verse ${v.n}, then say the whole passage from memory.` : `Recall ${i === 1 ? `verse ${text.verses[0].n}` : `verses ${text.verses[0].n}–${text.verses[i - 1].n}`} from memory, then learn verse ${v.n}.`]);
  const review = [['The next morning', 'Say the whole passage before you look at it.'], ['About three days later', 'Recall it again from memory.'], ['About a week later', 'Recall it again.'], ['About a month later', 'Recall it again. If you miss, review sooner.']];
  const related = ['how-to-memorize-bible-verses', 'how-to-review-memorized-verses', 'how-many-bible-verses-to-memorize-per-week'].map((s) => guideBySlug(s)!);

  return (
    <>
      <JsonLd data={breadcrumbLd(trail)} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Article', headline: p.title, url: `${SITE}${url}`, datePublished: PUBLISHED, dateModified: PUBLISHED, inLanguage: 'en', author: { '@type': 'Organization', name: 'Katekize', url: SITE }, publisher: { '@type': 'Organization', name: 'Katekize', url: SITE }, mainEntityOfPage: `${SITE}${url}` }} />
      <div className="kz-wrap">
        <SiteHeader />
        <main className="kz-page">
          <Crumbs trail={trail} />
          <h1>{p.h1}</h1>
          <p className="kz-muted">Updated <time dateTime={PUBLISHED}>{PUBLISHED_LABEL}</time></p>
          <p className="kz-answer">{(p.ref.startsWith(p.name) ? p.name : `${p.name.charAt(0).toUpperCase()}${p.name.slice(1)} (${p.ref})`)} has {n} verses. Learn one verse a day in short phrases, recall each earlier verse before adding the next, and say the whole passage from memory the next morning. Then review it after about three days, a week and a month. At 15 minutes a day, Katekize estimates {at15.label} to learn it.</p>
          <div className="kz-cta">
            <Link href={`/heir/courses/${p.course}`} className="kz-btn">Learn it in Katekize</Link>
            <a href="#plan" className="kz-btn quiet">The day-by-day plan</a>
          </div>

          <section aria-labelledby="text-h">
            <h2 id="text-h">The text, one phrase at a time</h2>
            <p className="kz-muted">Each line is a phrase to learn on its own. The words are exactly the {p.ref} text, only broken at its punctuation for reading.</p>
            <div className="kz-proofs">
              {text.verses.map((v) => (
                <figure key={v.n}>
                  <figcaption>Verse {v.n}</figcaption>
                  <blockquote>{phrasesOf(v.text).map((ph, i) => <span key={i} className="kz-phrase">{ph}</span>)}</blockquote>
                </figure>
              ))}
            </div>
          </section>

          <section id="plan" aria-labelledby="plan-h">
            <h2 id="plan-h">A {n}-day plan</h2>
            <div className="kz-tablewrap"><table><thead><tr><th>Day</th><th>What to do</th></tr></thead><tbody>{plan.map(([d, w]) => <tr key={d}><td>{d}</td><td>{w}</td></tr>)}</tbody></table></div>
            <h3>Then review</h3>
            <div className="kz-tablewrap"><table><thead><tr><th>When</th><th>What to do</th></tr></thead><tbody>{review.map(([d, w]) => <tr key={d}><td>{d}</td><td>{w}</td></tr>)}</tbody></table></div>
            <p className="kz-muted">This is one workable plan. Learn more slowly if you need to, and review sooner when you miss. Recalling from memory, not rereading, is what builds the memory.</p>
          </section>

          <section aria-labelledby="time-h">
            <h2 id="time-h">How long it takes</h2>
            <p>Katekize’s own estimate for learning all of {p.name}, at each daily goal: {est.map((e) => `${e.label} at ${e.minutes} minutes a day`).join(', ')}. These are estimates, not promises.</p>
          </section>

          <div className="kz-cta"><Link href={`/heir/courses/${p.course}`} className="kz-btn">Learn it in Katekize</Link></div>

          <section aria-labelledby="rel-h">
            <h2 id="rel-h">Related guides</h2>
            <ul className="kz-list">{related.map((g) => <li key={g.slug}><Link href={`/guides/${g.slug}`}>{g.title}</Link></li>)}</ul>
          </section>
        </main>
        <SiteFooter notice={BIBLE_NOTICE} />
      </div>
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { courseItems, courses, getItem, itemNoun } from '@/heir/content';
import { TIERS } from '@/heir/tiers';
import { windowBase } from '@/app/heir/ui/glass/light';
import { JsonLd, SiteFooter, SiteHeader } from '../shell';

// katekize.com's front door (served at / on that domain). Everything here is real content from the app's own data,
// written to answer the questions people type and ask: what is this, how does it work, what can I memorize.

const URL_HOME = 'https://katekize.com/';
const TITLE = 'Katekize: Bible Memory and Catechism Memorization for Families';
const DESCRIPTION = 'Memorize Scripture, the Westminster Catechisms and the creeds together as a family. Short lessons, recall from memory and spaced review help it last for life.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: URL_HOME },
  openGraph: { type: 'website', url: URL_HOME, siteName: 'Katekize', title: TITLE, description: DESCRIPTION, images: [{ url: '/katekize-og.jpg', width: 1200, height: 630, alt: 'Katekize: a stained-glass window and the words Memorize Scripture, catechisms and creeds together.' }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/katekize-og.jpg'] },
};

const FAQ: { q: string; a: string }[] = [
  { q: 'What is Katekize?', a: 'Katekize is a web app for memorizing Scripture, catechisms and creeds, on your own or as a family. You learn each verse or answer in short pieces, recall it from memory by typing or speaking it, and review it on a schedule so it lasts.' },
  { q: 'How does Katekize help me memorize?', a: 'Every question or verse is broken into short phrases. You rebuild them in order, fill in missing words, then type or say the whole thing with the words hidden. Reviews come back when you are close to forgetting, and a unit is locked in after a night’s sleep, with all of its questions recalled together from memory.' },
  { q: 'What can I memorize with Katekize?', a: 'The Westminster Shorter Catechism (107 questions), the Westminster Larger Catechism (being added), the Apostles’ Creed and the Nicene Creed, Psalm 23, the Lord’s Prayer, the Shema and the priestly blessing, the Ten Commandments, and sets of verses on the gospel, who God is, and fear and peace, plus seasonal courses for Christmas and Easter.' },
  { q: 'Can my whole family use it?', a: 'Yes. Everyone gets their own pace and progress, and the child track uses shorter pieces. Each person can have a separate account. Accounts can be linked so one person can see the other’s progress, view only: nobody can change or delete another person’s progress.' },
  { q: 'How do I know something is really memorized?', a: 'A verse or answer moves up a level only when you recall it from memory, with no hints, after time away: first a night’s sleep, then days, then weeks and months. Practicing more keeps it fresh, but never moves it up by itself.' },
  { q: 'Which Bible translation does it use?', a: 'Scripture in the app is the New American Standard Bible (NASB), used by permission of The Lockman Foundation. The Westminster Catechisms and the creeds are in the public domain.' },
  { q: 'Do I need to install anything?', a: 'No. Katekize runs in your phone’s browser. Open it, then add it to your Home Screen to use it like an app. Sign in with a code sent to your email and your progress is kept on every phone you use.' },
];

const REFS = [
  'Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. Psychological Science, 17(3), 249–255.',
  'Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., & Pashler, H. (2008). Spacing effects in learning: A temporal ridgeline of optimal retention. Psychological Science, 19(11), 1095–1102.',
  'Rawson, K. A., & Dunlosky, J. (2011). Optimizing schedules of retrieval practice for durable and efficient learning: How much is enough? Journal of Experimental Psychology: General, 140(3), 283–302.',
  'Bahrick, H. P. (1984). Semantic memory content in permastore: Fifty years of memory for Spanish learned in school. Journal of Experimental Psychology: General, 113(1), 1–29.',
];

export default function Home() {
  const wsc = getItem('wsc-1')!;
  // Plain-language notes are drafts until the owner approves them, so only approved ones go on public pages.
  const note = wsc.reviewed ? wsc.meaning[0] : undefined;
  const ld = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Katekize', url: URL_HOME, description: DESCRIPTION },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ];

  return (
    <>
      <JsonLd data={ld} />
      <div className="kz-wrap">
        <SiteHeader />

        <main>
          <section className="kz-hero" aria-labelledby="top">
            <div>
              <h1 id="top">Memorize Scripture, catechisms and creeds together, and keep them for life.</h1>
              <p className="kz-lede">Katekize is a Bible memory and catechism app for families. Learn a verse, a catechism answer or a creed in short pieces, recall it from memory, and review it just before you would forget it.</p>
              <div className="kz-cta">
                <Link href="/heir" className="kz-btn">Open Katekize</Link>
                <a href="#how" className="kz-btn quiet">How it works</a>
              </div>
              <p className="kz-note">Works in your phone’s browser. Add it to your Home Screen to use it like an app.</p>
            </div>
            <div className="kz-window">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/katekize-window.webp" width={640} height={640} alt="A stained-glass window of the Good Shepherd, the picture that lights up as you learn the Westminster Shorter Catechism." fetchPriority="high" />
            </div>
          </section>

          <section className="kz-sec" id="how" aria-labelledby="how-h">
            <h2 id="how-h">How Katekize helps you memorize</h2>
            <p className="kz-intro">It is built on a simple idea: you remember what you recall, not what you reread.</p>
            <ol className="kz-steps">
              <li><h3>Learn in small pieces</h3><p>Each question or verse is split into short phrases. You rebuild them in order, fill in the missing words, then type or say them with the words hidden.</p></li>
              <li><h3>Recall after time away</h3><p>Reviews come back when you are close to forgetting, which is when recalling helps most. A unit is locked in after a night’s sleep, with every question recalled together from memory.</p></li>
              <li><h3>Keep it for life</h3><p>Each question climbs from Familiar to Expert as you recall it with no hints after a night, then days, then weeks and months away.</p></li>
            </ol>
          </section>

          <section className="kz-sec" aria-labelledby="ex-h">
            <h2 id="ex-h">An example: the first question of the Shorter Catechism</h2>
            <p className="kz-intro">Every catechism question comes with its answer, word for word, and the Scripture it rests on. <Link href={`/westminster-shorter-catechism/${wsc.number}`} style={{ textDecoration: 'underline' }}>Read this question in full</Link>.</p>
            <div className="kz-example">
              <span className="src">Westminster Shorter Catechism, Question {wsc.number}</span>
              <p className="q">{wsc.prompt}</p>
              <p className="a">{wsc.text}</p>
              {note && <div className="m"><b>{note.question}</b>{note.answer}. {note.explain}</div>}
            </div>
          </section>

          <section className="kz-sec" aria-labelledby="explore-h">
            <h2 id="explore-h">Read before you start</h2>
            <p className="kz-intro">Every question of the Westminster Shorter Catechism has its own page, and the guides answer the questions people ask most about memorizing.</p>
            <div className="kz-explore">
              <Link href="/westminster-shorter-catechism"><b>Westminster Shorter Catechism</b><span>All 107 questions and answers, each with its Scripture proofs.</span></Link>
              <Link href="/guides"><b>Guides to memorizing</b><span>How to memorize Bible verses, how to review them, why they fade, and how to start with children.</span></Link>
              <Link href="/memorize/psalm-23"><b>Memorize Psalm 23</b><span>The full text in short phrases and a six-day plan.</span></Link>
              <Link href="/memorize/the-lords-prayer"><b>Memorize the Lord’s Prayer</b><span>Matthew 6:9–13 in short phrases and a five-day plan.</span></Link>
            </div>
          </section>

          <section className="kz-sec" aria-labelledby="learn-h">
            <h2 id="learn-h">What you can memorize</h2>
            <p className="kz-intro">Choose a course and Katekize plans the lessons, at 5, 15 or 25 minutes a day.</p>
            <ul className="kz-courses">
              {courses.map((c) => {
                const items = courseItems(c);
                return (
                  <li key={c.id} className="kz-course">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${windowBase(c.id, 0)}/glass-mini.webp`} width={76} height={76} alt="" loading="lazy" />
                    <div>
                      <h3>{c.title}</h3>
                      <p>{c.short}</p>
                      <span className="n">{items.length} {itemNoun(items[0], items.length)}{c.id === 'westminster-larger' ? ' so far' : ''}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="kz-sec" aria-labelledby="stones-h">
            <h2 id="stones-h">Five levels, from familiar to expert</h2>
            <p className="kz-intro">Each verse or answer climbs the same five levels, measured the way memory research measures it: recalled from memory, with no hints, after time away. The longer the time away, the higher the level.</p>
            <ul className="kz-stones">
              {TIERS.map((t) => (
                <li key={t.id} className="kz-stone">
                  <span aria-hidden="true" style={{ width: 56, height: 56, borderRadius: 16, flex: 'none', background: `linear-gradient(150deg, ${t.color}, ${t.edge})` }} />
                  <div><b>{t.stone} <span>· {t.name}</span></b><p>{t.means}</p></div>
                </li>
              ))}
            </ul>
          </section>

          <section className="kz-sec" aria-labelledby="fam-h">
            <h2 id="fam-h">For the whole family</h2>
            <div className="kz-cols">
              <article><h3>Their own pace</h3><p>Everyone gets their own lessons and progress. The child track uses shorter pieces.</p></article>
              <article><h3>Separate, linked accounts</h3><p>Each person can have their own account. Link them to see a family member’s progress, view only: nobody can change or delete another person’s.</p></article>
              <article><h3>On every phone</h3><p>Sign in with a code sent to your email, and your progress follows you to any phone.</p></article>
            </div>
          </section>

          <section className="kz-sec" aria-labelledby="research-h">
            <h2 id="research-h">Built on memory research</h2>
            <p className="kz-intro">Studies of memory keep finding the same things. Recalling something from memory strengthens it more than rereading it. Practice spread over days works better than practice crammed into one sitting. And what a person can still recall after the first few years tends to last for decades. Katekize is designed around all three.</p>
            <h3 style={{ fontSize: 17 }}>Further reading</h3>
            <ul className="kz-refs">{REFS.map((r) => <li key={r}>{r}</li>)}</ul>
          </section>

          <section className="kz-sec" aria-labelledby="faq-h">
            <h2 id="faq-h">Questions</h2>
            <div className="kz-faq">
              {FAQ.map((f) => <div key={f.q}><h3>{f.q}</h3><p>{f.a}</p></div>)}
            </div>
            <div className="kz-cta" style={{ marginTop: 36 }}>
              <Link href="/heir" className="kz-btn">Open Katekize</Link>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}

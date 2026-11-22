'use client';

// Courses: the season's course first while it's in season, then the course you're on, then every course on its
// shelf. Each is a card with its window (lit as far as you've come), its name and two lines on what it is.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useHeir } from '../ui/provider';
import { Tabs } from '../ui/tabs';
import { courseSummary } from '../ui/course-list';
import { MiniWindow } from '../ui/glass/mini';
import { courseFor, courses, SHELVES, type Course } from '@/heir/content';
import { activeMember, setPlan } from '@/heir/household';
import { memberProgress } from '@/heir/progress';
import { seasonLabel } from '@/heir/season';

const arrow = <span className="hr-glass-btn-go" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>;
const chevron = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', color: 'var(--muted)' }}><path d="M9 5l7 7-7 7" /></svg>;

export default function Courses() {
  const { ready, household, progress, now, update } = useHeir();
  const router = useRouter();
  if (!ready) return <main className="hr-page" aria-busy="true" />;
  const me = activeMember(household);
  const mine = memberProgress(progress, me?.id);
  const track = me?.track ?? 'adult';
  const minutes = household.plan?.minutes ?? 15;
  const summary = (c: Course) => courseSummary(c, track, mine, minutes, now);
  const current = courseFor(household.plan?.course);

  // The season's course, if one is in season now.
  const seasonal = courses.map((c) => ({ c, label: c.season ? seasonLabel(c.season, now) : null })).find((x) => x.label);
  const choose = (c: Course) => { update((h) => setPlan(h, { course: c.id })); router.push('/heir'); };
  const statusOf = (s: ReturnType<typeof summary>) => (s.learned >= s.total ? 'Finished' : s.started ? `${s.learned} of ${s.total} learned` : '');

  const hero = seasonal && (() => {
    const s = summary(seasonal.c);
    const mineToo = current?.id === seasonal.c.id;
    return (
      <section className="hr-rose-card" aria-label={`In season: ${seasonal.c.title}`}>
        <div className="hr-rose-wash" style={{ backgroundImage: `url(${s.window.base}/glass.webp)` }} aria-hidden="true" />
        <span className="hr-label">In season · {seasonal.label}</span>
        <Link href={`/heir/courses/${seasonal.c.id}`} aria-label={`About ${seasonal.c.title}`}>
          <MiniWindow base={s.window.base} lit={s.window.lit} dusty={s.window.dusty} size={170} started={s.started} label={`${seasonal.c.title} window`} />
        </Link>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
          <h2 className="serif" style={{ margin: 0, fontSize: 28, fontWeight: 500, lineHeight: 1.1 }}>{seasonal.c.title}</h2>
          <p style={{ margin: 0, fontSize: 15, color: '#D9D1C4', lineHeight: 1.45 }}>{seasonal.c.blurb}</p>
          {statusOf(s) && <p style={{ margin: 0, fontSize: 13, color: '#C9C1B3' }}>{statusOf(s)}</p>}
        </div>
        {mineToo
          ? <Link className="hr-glass-btn" href="/heir"><span>Continue this course</span>{arrow}</Link>
          : <button type="button" className="hr-glass-btn hr-glass-btn-reset" onClick={() => choose(seasonal.c)}><span>{s.started ? 'Continue this course' : 'Start this course'}</span>{arrow}</button>}
      </section>
    );
  })();

  // The course you're on, unless it's the one in season (already above).
  const resume = current && current.id !== seasonal?.c.id && (() => {
    const s = summary(current);
    return (
      <Link href="/heir" className="hr-rose-card hr-continue" aria-label={`Continue ${current.title}`}>
        <div className="hr-rose-wash" style={{ backgroundImage: `url(${s.window.base}/glass.webp)` }} aria-hidden="true" />
        <MiniWindow base={s.window.base} lit={s.window.lit} dusty={s.window.dusty} size={84} started={s.started} label={`${current.title} window`} />
        <span style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
          <span className="hr-label">Continue</span>
          <span className="serif" style={{ fontSize: 22, lineHeight: 1.15 }}>{current.title}</span>
          <span className="hr-continue-bar" aria-hidden="true"><span style={{ width: `${Math.round((s.learned / Math.max(1, s.total)) * 100)}%` }} /></span>
          <span style={{ fontSize: 12.5, color: '#C9C1B3' }}>{s.learned} of {s.total} learned</span>
        </span>
      </Link>
    );
  })();

  // Every course on its shelf; the one in season is already at the top.
  const shelves = SHELVES.map((sh, n) => ({ ...sh, n, list: courses.filter((c) => c.shelf === sh.id && c.id !== seasonal?.c.id) })).filter((sh) => sh.list.length);

  return (
    <>
      <main className="hr-page">
        <h1 className="serif" style={{ margin: '20px 4px 0', fontSize: 34, fontWeight: 500 }}>Courses</h1>
        {hero}
        {resume}
        {shelves.map((sh) => (
          <section key={sh.id} className="hr-shelf" aria-labelledby={`shelf-${sh.id}`}>
            <h2 id={`shelf-${sh.id}`} className="hr-label" style={{ margin: '8px 6px 0' }}>{sh.title}</h2>
            <ul>
              {sh.list.map((c, i) => {
                const s = summary(c);
                return (
                  <li key={c.id}>
                    <Link href={`/heir/courses/${c.id}`} className="hr-card hr-course-card">
                      <MiniWindow base={s.window.base} lit={s.window.lit} dusty={s.window.dusty} size={92} started={s.started}
                        motion={{ kind: 'list', index: i, count: sh.list.length, offset: sh.n * 1700 }} label={`${c.title} window`} />
                      <span className="hr-course-text">
                        <span className="serif hr-course-name">{c.title}</span>
                        <span className="hr-course-short">{c.short}</span>
                        {statusOf(s) && <span className="hr-course-status">{statusOf(s)}</span>}
                      </span>
                      {chevron}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        <Link href="/heir/review" style={{ alignSelf: 'center', fontSize: 14, color: 'var(--ink)', padding: 12 }}>Review all the content (for the owner)</Link>
      </main>
      <Tabs />
    </>
  );
}

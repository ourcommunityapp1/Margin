'use client';

// Courses: "My courses" first (the course you're on, then every course you've begun), then the season's course while it's
// in season, then every other course on its shelf. Each is a card with its window (lit as far as you've come), its name and
// two lines on what it is.

import { DEFAULT_GOAL } from '@/heir/planner';
import Link from 'next/link';
import { useHeir } from '../ui/provider';
import { Tabs } from '../ui/tabs';
import { courseSummary } from '../ui/course-list';
import { MiniWindow } from '../ui/glass/mini';
import { courseFor, courses, SHELVES, type Course } from '@/heir/content';
import { startedCourses } from '@/heir/dayplan';
import { activeMember } from '@/heir/household';
import { memberProgress } from '@/heir/progress';
import { seasonLabel } from '@/heir/season';

const chevron = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', color: 'var(--muted)' }}><path d="M9 5l7 7-7 7" /></svg>;

export default function Courses() {
  const { ready, household, progress, now, labs } = useHeir();
  if (!ready) return <main className="hr-page" aria-busy="true" />;
  const me = activeMember(household);
  const mine = memberProgress(progress, me?.id);
  const track = me?.track ?? 'adult';
  const minutes = household.plan?.minutes ?? DEFAULT_GOAL;
  const summary = (c: Course) => courseSummary(c, track, mine, minutes, now);
  const current = courseFor(household.plan?.course);
  const mineCourses = startedCourses(mine, track, current?.id ?? null);
  const mineIds = new Set(mineCourses.map((c) => c.id));

  // The season's course, if one is in season now.
  const seasonal = courses.map((c) => ({ c, label: c.season ? seasonLabel(c.season, now) : null })).find((x) => x.label);
  const statusOf = (s: ReturnType<typeof summary>) => (s.learned >= s.total ? 'Finished' : s.started ? `${s.learned} of ${s.total} learned` : '');

  // The season's course, as a smaller card under the course you're on. It opens the course's own page.
  const hero = seasonal && (() => {
    const s = summary(seasonal.c);
    return (
      <Link href={`/heir/courses/${seasonal.c.id}`} className="hr-rose-card hr-continue" aria-label={`In season: ${seasonal.c.title}`}>
        <div className="hr-rose-wash" style={{ backgroundImage: `url(${s.window.base}/glass.webp)` }} aria-hidden="true" />
        <MiniWindow base={s.window.base} lit={s.window.lit} dusty={s.window.dusty} size={84} started={s.started} bright label={`${seasonal.c.title} window`} />
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
          <span className="hr-label">In season · {seasonal.label}</span>
          <span className="serif" style={{ fontSize: 22, lineHeight: 1.15 }}>{seasonal.c.title}</span>
          <span style={{ fontSize: 13, color: '#D9D1C4', lineHeight: 1.4 }}>{statusOf(s) || seasonal.c.short}</span>
        </span>
        {chevron}
      </Link>
    );
  })();

  // Every other course on its shelf: the ones under My courses and the one in season are not shown twice.
  const shelves = SHELVES.map((sh, n) => ({ ...sh, n, list: courses.filter((c) => c.shelf === sh.id && c.id !== seasonal?.c.id && !mineIds.has(c.id)) })).filter((sh) => sh.list.length);

  return (
    <>
      <main className="hr-page">
        <h1 className="serif" style={{ margin: '20px 4px 0', fontSize: 34, fontWeight: 500 }}>Courses</h1>
        {mineCourses.length > 0 && (
          <section className="hr-shelf" aria-labelledby="shelf-mine">
            <h2 id="shelf-mine" className="hr-label" style={{ margin: '8px 6px 0' }}>My courses</h2>
            <ul>
              {mineCourses.map((c) => {
                const s = summary(c);
                return (
                  <li key={c.id}>
                    <Link href={`/heir/courses/${c.id}`} className="hr-card hr-course-card">
                      <MiniWindow base={s.window.base} lit={s.window.lit} dusty={s.window.dusty} size={92} started reveal label={`${c.title} window`} />
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
        )}
        {seasonal && !mineIds.has(seasonal.c.id) && hero}
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
        {labs && <Link href="/heir/review" style={{ alignSelf: 'center', fontSize: 14, color: 'var(--ink)', padding: 12 }}>Review all the content (for the owner)</Link>}
      </main>
      <Tabs />
    </>
  );
}

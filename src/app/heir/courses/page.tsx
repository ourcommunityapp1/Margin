'use client';

// Learn: "In your plan" first (the course you're on, then every course you've begun), then the season's course while it's
// in season, then every other course on its shelf. Each is a card with its window (lit as far as you've come), its name and
// two lines on what it is.

import { DEFAULT_GOAL } from '@/heir/planner';
import Link from 'next/link';
import { useHeir } from '../ui/provider';
import { Tabs } from '../ui/tabs';
import { courseSummary } from '../ui/course-list';
import { MiniWindow } from '../ui/glass/mini';
import { courseFor, courses, getItem, itemLabel, SHELVES, type Course } from '@/heir/content';
import { VERSE_SHELVES } from '@/heir/content/verse-shelves';
import { unitsFor } from '@/heir/lesson';
import type { Item } from '@/heir/types';
import { startedCourses } from '@/heir/dayplan';
import { activeMember, dailyCourse } from '@/heir/household';
import { memberProgress } from '@/heir/progress';
import { seasonLabel } from '@/heir/season';

const chevron = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', color: 'var(--muted)' }}><path d="M9 5l7 7-7 7" /></svg>;

const search = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>;

// A course card: its window, name and status. The plan's Add and Remove live on the course's own page.
function CourseCard({ course, status, window: w, i, count, offset }: { course: Course; status: string; window: React.ReactNode; i?: number; count?: number; offset?: number }) {
  void i; void count; void offset;
  return (
    <div className="hr-card hr-course-card">
      <Link href={`/heir/courses/${course.id}`} style={{ display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 220px', minWidth: 0, color: 'inherit', textDecoration: 'none' }}>
        {w}
        <span className="hr-course-text">
          <span className="serif hr-course-name">{course.title}</span>
          <span className="hr-course-short">{course.short}</span>
          {status && <span className="hr-course-status">{status}</span>}
        </span>
      </Link>
    </div>
  );
}

// A verse on a shelf: its reference, its first words, and whether it's learned.
function VerseCard({ item, learned }: { item: Item; learned: boolean }) {
  return (
    <Link href={`/heir/item/${item.id}`} className="hr-vc">
      <span className="serif hr-vc-ref">{itemLabel(item)}</span>
      <span className="hr-vc-txt">{item.text}</span>
      <span className="hr-vc-go" data-done={learned || undefined}>{learned ? 'Learned' : 'Learn · 2 min'}</span>
    </Link>
  );
}

export default function Courses() {
  const { ready, household, progress, now, labs } = useHeir();
  if (!ready) return <main className="hr-page" aria-busy="true" />;
  const me = activeMember(household);
  const mine = memberProgress(progress, me?.id);
  const track = me?.track ?? 'adult';
  const minutes = household.plan?.minutes ?? DEFAULT_GOAL;
  const summary = (c: Course) => courseSummary(c, track, mine, minutes, now);
  const current = courseFor(dailyCourse(household.plan));
  const mineCourses = startedCourses(mine, track, current?.id ?? null, household.plan?.removed);
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

  // Single verses to learn any time, on hand-picked shelves that have nothing to do with which course a verse is in.
  const learnedUnits = new Set(mine.units);
  const isLearned = (i: Item) => unitsFor(i, track).every((u) => learnedUnits.has(u.key));
  const verseShelves = VERSE_SHELVES.map((sh) => ({ id: sh.id, title: sh.title, items: sh.ids.flatMap((id) => { const it = getItem(id); return it ? [it] : []; }) }));

  // Course shelves and verse shelves taken in turn, so the page alternates between a list of courses and a row of verses.
  type Sec = { kind: 'courses'; id: string; title: string; list: Course[] } | { kind: 'verses'; id: string; title: string; items: Item[] };
  const mixed: Sec[] = [];
  for (let n = 0; n < Math.max(shelves.length, verseShelves.length); n++) {
    if (shelves[n]) mixed.push({ kind: 'courses', id: shelves[n].id, title: shelves[n].title, list: shelves[n].list });
    if (verseShelves[n]) mixed.push({ kind: 'verses', id: verseShelves[n].id, title: verseShelves[n].title, items: verseShelves[n].items });
  }

  const windowFor = (c: Course, started: boolean, size: number, reveal?: boolean) => {
    const s = summary(c);
    return <MiniWindow base={s.window.base} lit={s.window.lit} dusty={s.window.dusty} size={size} started={started} reveal={reveal} label={`${c.title} window`} />;
  };

  return (
    <>
      <main className="hr-page">
        <h1 className="serif" style={{ margin: '20px 4px 0', fontSize: 34, fontWeight: 500 }}>Learn</h1>
        <Link href="/heir/discover" className="hr-search" aria-label="Search verses, topics and courses">{search}<span>Search verses, topics, courses</span></Link>

        {mineCourses.length > 0 && (
          <section className="hr-shelf" aria-labelledby="shelf-mine">
            <h2 id="shelf-mine" className="hr-label" style={{ margin: '8px 6px 0' }}>In your plan</h2>
            <ul>
              {mineCourses.map((c) => (
                <li key={c.id}><CourseCard course={c} status={statusOf(summary(c))} window={windowFor(c, true, 84, true)} /></li>
              ))}
            </ul>
          </section>
        )}
        {seasonal && !mineIds.has(seasonal.c.id) && hero}
        {mixed.map((sec) => sec.kind === 'courses' ? (
          <section key={`c-${sec.id}`} className="hr-shelf" aria-labelledby={`shelf-${sec.id}`}>
            <h2 id={`shelf-${sec.id}`} className="hr-label" style={{ margin: '8px 6px 0' }}>{sec.title}</h2>
            <ul>
              {sec.list.map((c) => (
                <li key={c.id}><CourseCard course={c} status={statusOf(summary(c))} window={windowFor(c, summary(c).started, 84)} /></li>
              ))}
            </ul>
          </section>
        ) : (
          <section key={`v-${sec.id}`} className="hr-shelf" aria-labelledby={`vs-${sec.id}`}>
            <h2 id={`vs-${sec.id}`} className="hr-label" style={{ margin: '8px 6px 0' }}>{sec.title}</h2>
            <div className="hr-hscroll">{sec.items.map((i) => <VerseCard key={i.id} item={i} learned={isLearned(i)} />)}</div>
          </section>
        ))}
        {labs && <Link href="/heir/review" style={{ alignSelf: 'center', fontSize: 14, color: 'var(--ink)', padding: 12 }}>Review all the content (for the owner)</Link>}
      </main>
      <Tabs />
    </>
  );
}

'use client';

// One course at a glance, for the Courses list and a course's own page: what kind of thing you memorize,
// how long it takes at your daily goal, how far you've come, and its window as lit so far.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { courseItems, courseParts, courseFor, getCollection, getCourse, itemNoun, type Course } from '@/heir/content';
import { activeMember, setPlan } from '@/heir/household';
import { groupsOf, unitsFor } from '@/heir/lesson';
import { levelInfo, needsRefresh, recited } from '@/heir/levels';
import { courseStats } from '@/heir/path';
import { project } from '@/heir/planner';
import { emptyProgress, memberProgress, type MemberProgress } from '@/heir/progress';
import type { Track } from '@/heir/types';
import { useHeir } from './provider';
import { Back, Tabs } from './tabs';
import { groupLabel } from './course';
import { partWindow } from './glass/light';
import { ShareCourseIcon } from './share-course';
import { MiniWindow } from './glass/mini';
import { Stone } from './stone';

export type Kind = 'scripture' | 'catechism' | 'creed';
export const KINDS: [Kind, string][] = [['scripture', 'Verses'], ['catechism', 'Catechisms'], ['creed', 'Creeds']];

export type Length = 'short' | 'medium' | 'long';
export const LENGTHS: { id: Length; label: string; upTo: number }[] = [
  { id: 'short', label: 'Short', upTo: 31 },
  { id: 'medium', label: 'Medium', upTo: 122 },
  { id: 'long', label: 'Long', upTo: Infinity },
];

const span = (days: number) => (days < 14 ? `${days} days` : days < 63 ? `${Math.round(days / 7)} weeks` : `${Math.round(days / 30.4)} months`);

export function courseSummary(course: Course, track: Track, p: MemberProgress, minutes: number, now: Date) {
  const items = courseItems(course);
  // The whole course's length from the start, so a course keeps its place in the filter as you go.
  const days = project({ items, track, p: emptyProgress(), minutes, now }).learnDays;
  const stats = courseStats(items, track, p);
  return {
    course,
    kind: (getCollection(course.collections[0])?.kind ?? 'catechism') as Kind,
    length: LENGTHS.find((l) => days <= l.upTo)!.id,
    time: `${span(days)} at ${minutes} min a day`,
    noun: itemNoun(items[0], items.length),
    learned: stats.learned,
    // Any part of any item learned: the course has begun, so its windows hold still.
    started: items.some((i) => unitsFor(i, track).some((u) => p.units.includes(u.key))),
    total: stats.total,
    window: partWindow(course, track, p, now),
  };
}

// A course's own page: its window (or one per part), and everything in it, unit by unit.
export function CourseScreen({ id }: { id: string }) {
  const { ready, household, progress, now, update } = useHeir();
  const router = useRouter();
  const course = getCourse(id);
  if (!ready || !course) return <main className="hr-page" aria-busy="true" />;
  const me = activeMember(household);
  const mine = memberProgress(progress, me?.id);
  const track = me?.track ?? 'adult';
  const minutes = household.plan?.minutes ?? 15;
  const s = courseSummary(course, track, mine, minutes, now);
  const current = courseFor(household.plan?.course)?.id === course.id;
  const parts = courseParts(course);
  const groups = groupsOf(courseItems(course));

  return (
    <>
      <main className="hr-page">
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Back href="/heir/courses" label="Courses" />
          <ShareCourseIcon course={course} />
        </div>
        {/* Like the window card on Today: the window's own colours, blurred, behind a frosted button. */}
        <section className="hr-rose-card">
          <div className="hr-rose-wash" style={{ backgroundImage: `url(${s.window.base}/glass.webp)` }} aria-hidden="true" />
          <MiniWindow base={s.window.base} lit={s.window.lit} dusty={s.window.dusty} size={168} started={s.started} label={`${course.title} window, ${s.learned} of ${s.total} learned`} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
            <h1 className="serif" style={{ margin: 0, fontSize: 30, fontWeight: 500, lineHeight: 1.15 }}>{course.title}</h1>
            <p style={{ margin: 0, fontSize: 16, color: '#D9D1C4', lineHeight: 1.45 }}>{course.blurb}</p>
            <p style={{ margin: 0, fontSize: 13, color: '#C9C1B3' }}>{s.total} {s.noun} · about {s.time}{s.learned > 0 ? ` · ${s.learned} learned` : ''}</p>
          </div>
          {current
            ? <Link className="hr-glass-btn" href="/heir"><span>Continue this course</span><span className="hr-glass-btn-go" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span></Link>
            : <button type="button" className="hr-glass-btn" style={{ font: 'inherit', fontWeight: 600, fontSize: 17, cursor: 'pointer', textAlign: 'left' }} onClick={() => { update((h) => setPlan(h, { course: course.id })); router.push('/heir'); }}><span>Start this course</span><span className="hr-glass-btn-go" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span></button>}
        </section>

        {parts.length > 1 && (
          <section className="hr-card" style={{ display: 'grid', gridTemplateColumns: `repeat(${parts.length}, minmax(0, 1fr))`, gap: 10, padding: '18px 12px' }} aria-label="Parts">
            {parts.map((part, i) => {
              const w = partWindow(course, track, mine, now, i);
              const done = w.lit.filter((f) => f >= 1).length;
              return (
                <div key={part.title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
                  <MiniWindow base={w.base} lit={w.lit} dusty={w.dusty} size={84} started={s.started} motion={{ kind: 'circle', delay: i * 0.35 }} label={`${part.title} window, ${done} of ${w.items.length} learned`} />
                  <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.25 }}>{part.title}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{done} of {w.items.length}</span>
                </div>
              );
            })}
          </section>
        )}

        {groups.map((g, n) => (
          <section key={g.key} className="hr-card" style={{ padding: '16px 22px 6px' }} aria-label={`Unit ${n + 1}`}>
            <span className="hr-label">Unit {n + 1} · {groupLabel(g)}</span>
            <ol className="hr-lessons" style={{ marginTop: 6 }}>
              {g.items.map((item) => {
                const learned = unitsFor(item, track).every((u) => mine.units.includes(u.key));
                const level = mine.levels[item.id] ?? 0;
                const dim = needsRefresh(mine, item.id, now);
                const status = dim ? 'Needs a refresh' : level ? levelInfo(level)!.name : recited(item, track, mine.log) ? 'Recited' : learned ? 'Practised' : null;
                const unit = getCollection(item.collection)?.unit;
                return (
                  <li key={item.id}>
                    <Link className="hr-lesson" href={`/heir/item/${item.id}`} style={{ alignItems: 'flex-start', padding: '10px 8px' }}>
                      <Stone level={level} size={30} dim={dim} />
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 }}>
                        <span style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.35 }}>{unit === 'Question' ? `Q${item.number} · ${item.prompt}` : unit === 'Verse' || unit === 'Commandment' ? item.prompt : `${item.number} · ${item.prompt}`}</span>
                        <span className="serif" style={{ fontSize: 16, lineHeight: 1.4, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.text}</span>
                      </span>
                      {status && <span style={{ flex: 'none', fontSize: 12, fontWeight: 600, color: dim ? 'var(--miss)' : 'var(--muted)', paddingTop: 2 }}>{status}</span>}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </main>
      <Tabs />
    </>
  );
}

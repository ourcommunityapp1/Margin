'use client';

// One course at a glance, for the Courses list and a course's own page: what kind of thing you memorize,
// how long it takes at your daily goal, how far you've come, and its window as lit so far.

import { DEFAULT_GOAL } from '@/heir/planner';
import Link from 'next/link';
import { useState } from 'react';
import { courseItems, courseParts, getCollection, getCourse, itemNoun, type Course } from '@/heir/content';
import { activeMember, dailyCourse } from '@/heir/household';
import { groupsOf, unitsFor } from '@/heir/lesson';
import { needsRefresh, recited } from '@/heir/levels';
import { tierOf } from '@/heir/tiers';
import { courseStats } from '@/heir/path';
import { project } from '@/heir/planner';
import { emptyProgress, memberProgress, type MemberProgress } from '@/heir/progress';
import type { Track } from '@/heir/types';
import { useHeir } from './provider';
import { Back, Tabs } from './tabs';
import { groupLabel } from './course';
import { partWindow } from './glass/light';
import { ShareCourseIcon } from './share-course';
import { PlanButtons, PlanNote } from './plan-button';
import { MiniWindow } from './glass/mini';
import { Stone } from './stone';
import { partMemories } from '@/heir/memory';
import { KEEP_LAUNCH, heldItems } from '@/heir/keep';
import { itemStrength, practisedToday, strengthBand } from '@/heir/item-stats';
import { localTz } from './keep';

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

// A course's own page. Long courses show one part at a time (its window is the switcher), opened at the unit
// you're on; every other unit folds to one line that opens on tap.
export function CourseScreen({ id }: { id: string }) {
  const { ready, household, progress, now } = useHeir();
  const [part, setPart] = useState<number | null>(null);
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const course = getCourse(id);
  if (!ready || !course) return <main className="hr-page" aria-busy="true" />;
  const me = activeMember(household);
  const mine = memberProgress(progress, me?.id);
  const track = me?.track ?? 'adult';
  const minutes = household.plan?.minutes ?? DEFAULT_GOAL;
  const s = courseSummary(course, track, mine, minutes, now);
  const parts = courseParts(course);
  const groups = groupsOf(courseItems(course));
  const learnedUnits = new Set(mine.units);
  const locked = new Set(mine.checkpoints);
  const learnedIn = (g: (typeof groups)[number]) => g.items.filter((i) => unitsFor(i, track).every((u) => learnedUnits.has(u.key))).length;
  // The unit you're on: the first one not yet locked in.
  const here = groups.find((g) => !locked.has(g.key)) ?? groups[groups.length - 1];
  const partOf = (g: (typeof groups)[number]) => Math.max(0, parts.findIndex((p) => p.items.some((i) => i.id === g.items[0].id)));
  const shownPart = part ?? (here ? partOf(here) : 0);
  const shown = parts.length > 1 ? groups.filter((g) => partOf(g) === shownPart) : groups;
  const fold = groups.length > 3;
  const isOpen = (key: string) => !fold || (opened[key] ?? key === here?.key);
  // Strength of each learned question or verse (not on a day it was practised), and the course's three numbers.
  const mems = partMemories(mine.log, mine.partSnap);
  const all = courseItems(course);
  const learnedItems = all.filter((i) => unitsFor(i, track).every((u) => learnedUnits.has(u.key)));
  const strengthOf = new Map(learnedItems.map((i) => [i.id, itemStrength(mine, i.id, now, mems)]));
  const nums = [...strengthOf.values()].filter((v): v is number => typeof v === 'number');
  const average = nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) : null;
  const inMemory = heldItems(all, mine, track, now, { launch: KEEP_LAUNCH, tz: localTz(), mode: 'whole' }).filter((h) => h.state.state === 'kept' || h.state.state === 'review').length;

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
          {parts.length <= 1 && <MiniWindow base={s.window.base} lit={s.window.lit} dusty={s.window.dusty} size={168} started={s.started} reveal label={`${course.title} window, ${s.learned} of ${s.total} learned`} />}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
            <h1 className="serif" style={{ margin: 0, fontSize: 30, fontWeight: 500, lineHeight: 1.15 }}>{course.title}</h1>
            <p style={{ margin: 0, fontSize: 16, color: '#D9D1C4', lineHeight: 1.45 }}>{course.blurb}</p>
            <p style={{ margin: 0, fontSize: 13, color: '#C9C1B3' }}>{s.total} {s.noun} · about {s.time}{s.learned > 0 ? ` · ${s.learned} learned` : ''}</p>
          </div>
          <PlanButtons course={course} surface="hero" />
          <PlanNote course={course} />
        </section>

        {learnedItems.length > 0 && (
          <section className="hr-cstats" data-four aria-label="Where you are">
            <div><b className="serif">{Math.round((learnedItems.length / Math.max(1, all.length)) * 100)}%</b><span>of the course done</span></div>
            <div><b className="serif">{learnedItems.length}</b><span>learned of {all.length}</span></div>
            <div><b className="serif">{inMemory}</b><span>in memory</span></div>
            <div><b className="serif">{average === null ? '–' : `${average}%`}</b><span>average strength</span></div>
          </section>
        )}

        {parts.length > 1 && (
          <section className="hr-card" style={{ display: 'grid', gridTemplateColumns: `repeat(${parts.length}, minmax(0, 1fr))`, gap: 8, padding: '16px 10px' }} aria-label="Parts">
            {parts.map((p, i) => {
              const w = partWindow(course, track, mine, now, i);
              const done = w.lit.filter((f) => f >= 1).length;
              return (
                <button key={p.title} type="button" className="hr-part" aria-pressed={shownPart === i} onClick={() => setPart(i)}>
                  <MiniWindow base={w.base} lit={w.lit} dusty={w.dusty} size={78} started={s.started} reveal motion={{ kind: 'circle', delay: i * 0.35 }} label={`${p.title} window, ${done} of ${w.items.length} learned`} />
                  <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.25 }}>{p.title}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{done} of {w.items.length}</span>
                </button>
              );
            })}
          </section>
        )}

        <section className="hr-card" style={{ padding: '4px 18px' }} aria-label="Units">
          {shown.map((g) => {
            const n = groups.indexOf(g) + 1;
            const open = isOpen(g.key);
            const refresh = g.items.filter((i) => needsRefresh(mine, i.id, now)).length;
            const learned = learnedIn(g);
            const summary = locked.has(g.key) ? `Locked in${refresh ? ` · ${refresh} need${refresh === 1 ? 's' : ''} a refresh` : ''}` : learned ? `${learned} of ${g.items.length} learned` : 'Not started';
            return (
              <div key={g.key} className="hr-unit-fold">
                <button type="button" className="hr-unit-head" aria-expanded={open} onClick={() => fold && setOpened((o) => ({ ...o, [g.key]: !open }))} disabled={!fold}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' }}>
                    <span style={{ fontWeight: 600, fontSize: 16 }}>Unit {n} · {groupLabel(g)}</span>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{g.key === here?.key && !locked.has(g.key) && dailyCourse(household.plan) === course.id ? 'You’re here' : summary}</span>
                  </span>
                  {fold && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--muted)', transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }}><path d="M6 9l6 6 6-6" /></svg>}
                </button>
                {open && (
                  <ol className="hr-lessons" style={{ marginBottom: 8 }}>
                    {g.items.map((item) => {
                      const itemLearned = unitsFor(item, track).every((u) => learnedUnits.has(u.key));
                      const level = mine.levels[item.id] ?? 0;
                      const dim = needsRefresh(mine, item.id, now);
                      const status = dim ? 'Needs a refresh' : level ? tierOf(level)!.name : recited(item, track, mine.log) || itemLearned ? 'Familiar' : null;
                      const unit = getCollection(item.collection)?.unit;
                      return (
                        <li key={item.id}>
                          <Link className="hr-lesson" href={`/heir/item/${item.id}`} style={{ alignItems: 'flex-start', padding: '10px 4px' }}>
                            <Stone level={level} size={30} dim={dim} started={itemLearned} />
                            <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 }}>
                              <span style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.35 }}>{unit === 'Question' ? `Q${item.number} · ${item.prompt}` : unit === 'Verse' || unit === 'Commandment' ? item.prompt : `${item.number} · ${item.prompt}`}</span>
                              <span className="serif" style={{ fontSize: 16, lineHeight: 1.4, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.text}</span>
                            </span>
                            {(() => {
                              const st = strengthOf.get(item.id);
                              if (st === undefined) return status && <span style={{ flex: 'none', fontSize: 12, fontWeight: 600, color: 'var(--muted)', paddingTop: 2 }}>{status}</span>;
                              return (
                                <span style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, paddingTop: 2 }}>
                                  {st === null ? null : <span className="hr-strength" data-band={strengthBand(st)}>{Math.round(st * 100)}%</span>}
                                  {(practisedToday(mine, item.id, now) || status) && <span style={{ fontSize: 11.5, fontWeight: 600, color: dim ? 'var(--miss)' : 'var(--muted)' }}>{practisedToday(mine, item.id, now) ? 'Practised today' : status}</span>}
                                </span>
                              );
                            })()}
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            );
          })}
        </section>
      </main>
      <Tabs />
    </>
  );
}

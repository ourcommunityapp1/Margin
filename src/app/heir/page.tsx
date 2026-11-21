'use client';

// Today: days kept, what you know, the next lesson, and the course as units of named lessons,
// each question showing the stone it has earned.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useHeir } from './ui/provider';
import { groupLabel, useCourse } from './ui/course';
import { Tabs } from './ui/tabs';
import { Stone } from './ui/stone';
import { allItems, getCollection, itemLabel } from '@/heir/content';
import { bestDaysKept, countsFor, daysKept, levelInfo, needsRefresh, nextStep } from '@/heir/levels';
import { localDay, type MemberProgress } from '@/heir/progress';
import type { PathUnit } from '@/heir/path';
import { lessonsDone, planNext } from '@/heir/planner';
import { unitsFor } from '@/heir/lesson';
import { greeting } from '@/heir/time';
import type { Track } from '@/heir/types';
import { RoundWindow } from './ui/glass/round';
import { partWindow } from './ui/glass/light';

export default function Today() {
  const { ready, household, time, now } = useHeir();
  const router = useRouter();
  const { me, course, mine, track, items, path, due, chosen } = useCourse();

  useEffect(() => {
    if (!ready) return;
    if (!household.members.length) router.replace('/heir/welcome');
    else if (!chosen) router.replace('/heir/start');
  }, [ready, household.members.length, chosen, router]);

  if (!ready || !me || !chosen) return <main className="hr-page" aria-busy="true" />;

  const ids = new Set(items.map((i) => i.id));
  const done = lessonsDone(mine, course.id, ids);
  const plan = planNext({ courseId: course.id, items, track, p: mine, now });
  const lessonName = done === 0 ? 'Welcome' : plan?.kind === 'welcome-back' ? `Welcome back · Lesson ${done + 1}` : `Lesson ${done + 1}`;
  const today = localDay(now);
  const counts = countsFor(allItems(), mine);
  // The window for the part you're working in.
  const light = partWindow(course, track, mine, now);
  const start = !plan ? null : plan.kind === 'welcome' ? 'Begin' : plan.kind === 'checkpoint' ? 'Lock them in' : `Start ${lessonName.replace(/^Lesson/, 'lesson')}`;
  const learnedCount = light.lit.filter((f) => f >= 1).length;
  const noun = items[0] && getCollection(items[0].collection)?.unit === 'Question' ? 'questions' : 'sections';

  return (
    <>
      <main className="hr-page">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginTop: 12 }}>
          <h1 className="serif" style={{ margin: 0, fontSize: 26, fontWeight: 500, lineHeight: 1.15 }}>{greeting(time)}, {me.name}</h1>
          <Link href="/heir/family" aria-label={`Profiles (now ${me.name})`} style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--card)', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 17, textDecoration: 'none', flex: 'none' }}>{me.name[0]}</Link>
        </header>

        {/* The course's window: lit glass is what you've learned, dark glass is still to come. */}
        <section className="hr-rose-card">
          <div className="hr-rose-wash" style={{ backgroundImage: `url(${light.base}/glass.webp)` }} aria-hidden="true" />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' }}>
            {light.count > 1 && <span className="hr-label">Part {light.index + 1} of {light.count}</span>}
            <h2 className="serif" style={{ margin: 0, fontSize: 26, fontWeight: 500, lineHeight: 1.1 }}>{light.title}</h2>
          </div>
          <RoundWindow key={light.base} base={light.base} lit={light.lit} dusty={light.dusty} share={light.share} hint={plan && (plan.kind === 'welcome' || plan.kind === 'learn') && light.next >= 0 ? light.next : undefined} />
          <span style={{ fontSize: 13, color: '#C9C1B3' }}>{learnedCount} of {light.items.length} {noun} lit</span>
          {start ? (
            <Link className="hr-glass-btn" href="/heir/lesson"><span>{start}</span>
              <span className="hr-glass-btn-go" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
            </Link>
          ) : <p className="serif" style={{ margin: 0, fontSize: 17 }}>All caught up for today.</p>}
        </section>

        <DaysKept days={mine.days} today={today} now={now} dueCount={due.length} />

        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="hr-label">What you know · all courses</span>
            <Link href="/heir/progress" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Progress</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
            {[[1, counts.know, 'Know'], [2, counts.memorized, 'Memorized'], [3, counts.mastered, 'Mastered'], [4, counts.longTerm, 'Long-term']].map(([lv, n, name]) => (
              <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
                <Stone level={Number(lv)} size={34} />
                <span className="serif" style={{ fontSize: 24, fontWeight: 600, lineHeight: 1 }}>{n}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', lineHeight: 1.25 }}>{name}</span>
              </div>
            ))}
          </div>
        </section>

        <Link href="/heir/plan" className="hr-course-chip" aria-label={`Course: ${course.title}. Change course`}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Course</span>
            <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.title}</span>
          </span>
          <span style={{ fontSize: 15, color: 'var(--muted)', flex: 'none' }}>Change</span>
        </Link>

        {(() => {
          // Long courses: the last finished unit, the current one and the next; the rest summed up.
          const at = Math.max(0, path.findIndex((u) => u.status !== 'done'));
          const from = Math.max(0, at - 1), to = Math.min(path.length, at + 2);
          const before = path.slice(0, from), after = path.slice(to);
          const span = (list: PathUnit[]) => `${groupLabel(list[0].group).replace(/–.*$/, '')}–${list[list.length - 1].group.items[list[list.length - 1].group.items.length - 1].number}`;
          return (
            <>
              {before.length > 0 && <Link href="/heir/learn" className="hr-course-chip"><span><b>{before.length === 1 ? 'Unit 1' : `Units 1–${before.length}`}</b> · locked in</span><span style={{ fontSize: 15, color: 'var(--muted)' }}>See in Learn</span></Link>}
              {path.slice(from, to).map((u) => <UnitCard key={u.group.key} unit={u} mine={mine} track={track} now={now} />)}
              {after.length > 0 && <Link href="/heir/learn" className="hr-course-chip"><span><b>{after.length} more {after.length === 1 ? 'unit' : 'units'}</b> · {span(after)}</span><span style={{ fontSize: 15, color: 'var(--muted)' }}>See all</span></Link>}
            </>
          );
        })()}
      </main>
      <Tabs />
    </>
  );
}

function DaysKept({ days, today, now, dueCount }: { days: string[]; today: string; now: Date; dueCount: number }) {
  const kept = daysKept(days, today);
  const best = Math.max(kept, bestDaysKept(days));
  const set = new Set(days);
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const key = localDay(d);
    const state = set.has(key) ? 'kept' : key === today ? 'today' : d.getDay() === 0 ? 'rest' : key < today ? 'missed' : 'later';
    return { key, label: 'MTWTFSS'[i], state };
  });
  const doneToday = set.has(today);
  const sunday = now.getDay() === 0;
  const line = sunday && !doneToday ? 'Sunday is a day of rest: learn if you like, but skipping it never breaks the count.'
    : doneToday ? `Today is kept.${dueCount ? ` ${dueCount} ${dueCount === 1 ? 'review is' : 'reviews are'} still due.` : ''}`
    : 'One lesson or review keeps the day.';
  return (
    <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 20px' }} aria-label="Days kept">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="serif" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1 }}>{kept}</span>
          <span style={{ fontWeight: 600 }}>{kept === 1 ? 'day kept' : 'days kept'}</span>
        </span>
        {best > 0 && <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>Best: {best}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4, textAlign: 'center' }}>
        {week.map((d) => (
          <span key={d.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{d.label}</span>
            <span className="hr-day" data-state={d.state} aria-label={`${d.key}: ${d.state}`}>{d.state === 'rest' ? 'Rest' : ''}</span>
          </span>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', lineHeight: 1.45 }}>{line}</p>
    </section>
  );
}

// A unit is its questions: each shows the stone it has earned, the next one to learn, or nothing yet.
function UnitCard({ unit, mine, track, now }: { unit: PathUnit; mine: MemberProgress; track: Track; now: Date }) {
  const learned = new Set(mine.units);
  const nextUp = unit.lessons.find((l) => l.status === 'current');
  const lockDone = unit.lessons[unit.lessons.length - 1].status === 'done';
  const pct = Math.round((unit.learned / unit.group.items.length) * 100);
  return (
    <section className="hr-card hr-unit" data-status={unit.status} aria-label={`Unit ${unit.number}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="hr-label">Unit {unit.number}</span>
          <span className="serif" style={{ fontSize: 20, fontWeight: 600 }}>{groupLabel(unit.group)}</span>
        </span>
        <span className="hr-tag" style={{ flex: 'none' }}>{lockDone ? 'Locked in' : unit.status === 'upcoming' ? 'Not started' : `${unit.learned} of ${unit.group.items.length}`}</span>
      </div>
      {unit.status === 'current' && <div className="hr-progress" style={{ background: 'var(--well)', height: 6 }} aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>}
      {unit.status !== 'upcoming' ? (
        <ol className="hr-lessons">
          {unit.group.items.map((item) => {
            const started = unitsFor(item, track).some((u) => learned.has(u.key));
            const level = mine.levels[item.id] ?? 0;
            const dim = needsRefresh(mine, item.id, now);
            const isNext = nextUp?.itemId === item.id;
            const note = dim ? { text: 'Needs a refresh', miss: true } : level ? { text: levelInfo(level)!.name, miss: false } : started ? { text: nextStep(item, track, mine, now) ?? '', miss: false } : isNext ? { text: 'Next', miss: false } : null;
            const body = (
              <>
                {isNext && !started ? <span className="hr-dot current" aria-label="Next" /> : <Stone level={level} size={26} dim={dim} />}
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontWeight: 600 }}>{itemLabel(item)}</span>
                  <span style={{ fontSize: 14, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.prompt}</span>
                </span>
                {note && note.text && <span style={{ flex: 'none', marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: note.miss ? 'var(--miss)' : 'var(--muted)', textAlign: 'right', maxWidth: 110 }}>{note.text}</span>}
              </>
            );
            return <li key={item.id}>{started ? <Link className="hr-lesson" href={`/heir/item/${item.id}`}>{body}</Link> : <div className="hr-lesson" data-status={isNext ? undefined : 'upcoming'}>{body}</div>}</li>;
          })}
          <li><div className="hr-lesson" data-status={lockDone ? undefined : 'upcoming'}>
            <span className={`hr-dot${lockDone ? ' done' : ''}`} aria-hidden="true">{lockDone && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontWeight: 600 }}>Lock it in</span><span style={{ fontSize: 14, color: 'var(--muted)' }}>All {unit.group.items.length} from memory</span></span>
          </div></li>
        </ol>
      ) : <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>{unit.group.items.length} questions. Opens when the unit before is locked in.</p>}
    </section>
  );
}

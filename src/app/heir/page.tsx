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
import { allItems, getItem, itemLabel } from '@/heir/content';
import { bestDaysKept, countsFor, daysKept, levelInfo, needsRefresh, nextStep } from '@/heir/levels';
import { localDay, type MemberProgress } from '@/heir/progress';
import type { PathLesson, PathUnit } from '@/heir/path';
import { dayName, greeting } from '@/heir/time';
import type { Track } from '@/heir/types';

export default function Today() {
  const { ready, household, time, now } = useHeir();
  const router = useRouter();
  const { me, course, mine, track, activity, due, path, chosen } = useCourse();

  useEffect(() => {
    if (!ready) return;
    if (!household.members.length) router.replace('/heir/welcome');
    else if (!chosen) router.replace('/heir/start');
  }, [ready, household.members.length, chosen, router]);

  if (!ready || !me || !chosen) return <main className="hr-page" aria-busy="true" />;

  const currentUnit = path.find((u) => u.status === 'current');
  const current = currentUnit?.lessons.find((l) => l.status === 'current');
  const today = localDay(now);
  const counts = countsFor(allItems(), mine);

  return (
    <>
      <main className="hr-page">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0 4px', marginTop: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 500 }}>{dayName(now)}</span>
            <h1 className="serif" style={{ margin: 0, fontSize: 32, fontWeight: 500, lineHeight: 1.1 }}>{greeting(time)}, {me.name}</h1>
          </div>
          <Link href="/heir/family" aria-label={`Profiles (now ${me.name})`} style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--card)', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 17, textDecoration: 'none', flex: 'none' }}>{me.name[0]}</Link>
        </header>

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

        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="hr-label">{current && currentUnit ? `Up next · Unit ${currentUnit.number}, lesson ${current.number}` : 'All lessons done for now'}</span>
            {current && currentUnit ? <LessonTitle lesson={current} unit={currentUnit} big /> : (
              <p className="serif" style={{ margin: 0, fontSize: 22, lineHeight: 1.3 }}><span style={{ fontWeight: 600 }}>You’ve learned every lesson in this course so far.</span> <span style={{ color: 'var(--muted)' }}>Reviews keep it fresh while more are added.</span></p>
            )}
          </div>
          {activity ? <Link className="hr-btn" href="/heir/lesson">{activity.kind === 'checkpoint' ? 'Lock them in' : mine.lessons ? 'Start lesson' : 'Start your first lesson'}</Link>
            : <Link className="hr-btn" href="/heir/lesson?mode=review">Review</Link>}
          {activity && due.length > 0 && <Link className="hr-btn quiet" href="/heir/lesson?mode=review">Review {due.length} due</Link>}
        </section>

        <Link href="/heir/plan" className="hr-course-chip" aria-label={`Course: ${course.title}. Change course`}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Course</span>
            <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.title}</span>
          </span>
          <span style={{ fontSize: 15, color: 'var(--muted)', flex: 'none' }}>Change</span>
        </Link>

        {path.map((u) => <UnitCard key={u.group.key} unit={u} mine={mine} track={track} now={now} />)}
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

function LessonTitle({ lesson, unit, big }: { lesson: PathLesson; unit: PathUnit; big?: boolean }) {
  const item = lesson.itemId ? getItem(lesson.itemId) : null;
  const size = big ? 22 : 16;
  if (lesson.kind === 'checkpoint') {
    return (
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span className={big ? 'serif' : undefined} style={{ fontWeight: 600, fontSize: size }}>Lock it in</span>
        <span style={{ fontSize: big ? 16 : 14, color: 'var(--muted)' }}>All of {groupLabel(unit.group)}, from memory</span>
      </span>
    );
  }
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <span className={big ? 'serif' : undefined} style={{ fontWeight: 600, fontSize: size }}>{item ? itemLabel(item) : ''}{lesson.unit && lesson.unit.of > 1 ? `, part ${lesson.unit.part}` : ''}</span>
      <span className={big ? 'serif' : undefined} style={{ fontSize: big ? 18 : 14, color: 'var(--muted)', lineHeight: 1.35, ...(big ? {} : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }) }}>{item?.prompt}</span>
    </span>
  );
}

function UnitCard({ unit, mine, track, now }: { unit: PathUnit; mine: MemberProgress; track: Track; now: Date }) {
  const pct = Math.round((unit.learned / unit.group.items.length) * 100);
  const locked = unit.lessons[unit.lessons.length - 1].status === 'done';
  return (
    <section className="hr-card hr-unit" data-status={unit.status} aria-label={`Unit ${unit.number}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="hr-label">Unit {unit.number}</span>
          <span className="serif" style={{ fontSize: 20, fontWeight: 600 }}>{groupLabel(unit.group)}</span>
        </span>
        <span className="hr-tag" style={{ flex: 'none' }}>{locked ? 'Locked in' : unit.status === 'upcoming' ? 'Not started' : `${unit.learned} of ${unit.group.items.length}`}</span>
      </div>
      {unit.status === 'current' && <div className="hr-progress" style={{ background: 'var(--well)', height: 6 }} aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>}
      {unit.status !== 'upcoming' ? (
        <ol className="hr-lessons">
          {unit.lessons.map((l) => {
            const item = l.itemId ? getItem(l.itemId) : null;
            const level = item ? mine.levels[item.id] ?? 0 : 0;
            const dim = !!item && needsRefresh(mine, item.id, now);
            const note = l.status !== 'done' || !item ? null : dim ? { text: 'Needs a refresh', tone: 'miss' } : l.unit && l.unit.part < l.unit.of ? null : level ? { text: levelInfo(level)!.name, tone: '' } : { text: nextStep(item, track, mine, now) ?? '', tone: 'muted' };
            const icon = l.kind === 'checkpoint'
              ? <span className={`hr-dot${l.status === 'done' ? ' done' : l.status === 'current' ? ' current' : ''}`} aria-hidden="true">{l.status === 'done' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}</span>
              : l.status === 'current' ? <span className="hr-dot current" aria-label="Up next" /> : <Stone level={l.status === 'done' ? level : 0} size={26} dim={dim} />;
            const body = (
              <>
                {icon}
                <LessonTitle lesson={l} unit={unit} />
                {note && note.text && <span style={{ flex: 'none', fontSize: 12, fontWeight: 600, color: note.tone === 'miss' ? 'var(--miss)' : 'var(--muted)', textAlign: 'right', maxWidth: 110 }}>{note.text}</span>}
              </>
            );
            if (l.status === 'current') return <li key={l.key}><Link className="hr-lesson current" href="/heir/lesson">{body}</Link></li>;
            if (l.status === 'done' && item) return <li key={l.key}><Link className="hr-lesson" href={`/heir/item/${item.id}`}>{body}</Link></li>;
            return <li key={l.key}><div className="hr-lesson" data-status={l.status}>{body}</div></li>;
          })}
        </ol>
      ) : <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>{unit.lessons.length} lessons. Opens when the unit before is locked in.</p>}
    </section>
  );
}

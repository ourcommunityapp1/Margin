'use client';

// Today: the course you're on, as a path of units and named lessons, with what comes next on top.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useHeir } from './ui/provider';
import { groupLabel, useCourse } from './ui/course';
import { Tabs } from './ui/tabs';
import { getItem, itemLabel } from '@/heir/content';
import { masteredItem, type PathLesson, type PathUnit } from '@/heir/path';
import { dayName, greeting } from '@/heir/time';

export default function Today() {
  const { ready, household, time, now } = useHeir();
  const router = useRouter();
  const { me, course, mine, activity, due, path, stats, days, chosen } = useCourse();

  useEffect(() => {
    if (!ready) return;
    if (!household.members.length) router.replace('/heir/welcome');
    else if (!chosen) router.replace('/heir/start');
  }, [ready, household.members.length, chosen, router]);

  if (!ready || !me || !chosen) return <main className="hr-page" aria-busy="true" />;

  const currentUnit = path.find((u) => u.status === 'current');
  const current = currentUnit?.lessons.find((l) => l.status === 'current');

  return (
    <>
      <main className="hr-page">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0 4px', marginTop: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 500 }}>{dayName(now)}</span>
            <h1 className="serif" style={{ margin: 0, fontSize: 32, fontWeight: 500, lineHeight: 1.1 }}>{greeting(time)}, {me.name}</h1>
          </div>
          <Link href="/heir/family" aria-label={`Switch profile (now ${me.name})`} style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--card)', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 17, textDecoration: 'none', flex: 'none' }}>{me.name[0]}</Link>
        </header>

        <Link href="/heir/plan" className="hr-course-chip" aria-label={`Course: ${course.title}. Change course`}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Course</span>
            <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.title}</span>
          </span>
          <span style={{ fontSize: 15, color: 'var(--muted)', flex: 'none' }}>Change</span>
        </Link>

        <section className="hr-stats" aria-label="Progress">
          <Stat value={`${stats.learned}`} of={`of ${stats.total}`} label="Learned" />
          <Stat value={`${stats.mastered}`} label="Mastered" />
          <Stat value={`${days}`} label={days === 1 ? 'Day streak' : 'Days streak'} />
        </section>

        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

        {path.map((u) => <UnitCard key={u.group.key} unit={u} />)}

        <Link href="/heir/review" style={{ alignSelf: 'center', fontSize: 14, color: 'var(--ink)', padding: 12 }}>Review the content (for the owner)</Link>
      </main>
      <Tabs />
    </>
  );
}

function Stat({ value, of, label }: { value: string; of?: string; label: string }) {
  return (
    <div className="hr-stat">
      <span><strong>{value}</strong>{of && <span style={{ fontSize: 14, color: 'var(--muted)' }}> {of}</span>}</span>
      <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
    </div>
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

function Dot({ status }: { status: PathLesson['status'] }) {
  if (status === 'done') return <span className="hr-dot done" aria-label="Done"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg></span>;
  if (status === 'current') return <span className="hr-dot current" aria-label="Up next" />;
  return <span className="hr-dot" aria-label="Not started" />;
}

function UnitCard({ unit }: { unit: PathUnit }) {
  const { mine } = useCourse();
  const pct = Math.round((unit.learned / unit.group.items.length) * 100);
  const locked = unit.lessons[unit.lessons.length - 1].status === 'done';
  return (
    <section className="hr-card hr-unit" data-status={unit.status} aria-label={`Unit ${unit.number}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="hr-label">Unit {unit.number}</span>
          <span className="serif" style={{ fontSize: 20, fontWeight: 600 }}>{groupLabel(unit.group)}</span>
        </span>
        <span className="hr-tag" style={{ flex: 'none' }}>{locked ? 'Locked in' : unit.status === 'upcoming' ? 'Not started' : `${unit.learned} of ${unit.group.items.length}`}</span>
      </div>
      {unit.status !== 'upcoming' && (
        <>
          <div className="hr-progress" style={{ background: 'var(--well)', height: 6 }} aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
          <ol className="hr-lessons">
            {unit.lessons.map((l) => {
              const item = l.itemId ? getItem(l.itemId) : null;
              const mastered = item && l.status === 'done' && (!l.unit || l.unit.part === l.unit.of) && masteredItem(item, mine);
              const body = (
                <>
                  <Dot status={l.status} />
                  <LessonTitle lesson={l} unit={unit} />
                  {mastered && <span className="hr-tag" style={{ flex: 'none' }}>Mastered</span>}
                </>
              );
              if (l.status === 'current') return <li key={l.key}><Link className="hr-lesson current" href="/heir/lesson">{body}</Link></li>;
              if (l.status === 'done' && item) return <li key={l.key}><Link className="hr-lesson" href={`/heir/item/${item.id}`}>{body}</Link></li>;
              return <li key={l.key}><div className="hr-lesson" data-status={l.status}>{body}</div></li>;
            })}
          </ol>
        </>
      )}
      {unit.status === 'upcoming' && <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>{unit.lessons.length} lessons, unlocked when the unit before is locked in.</p>}
    </section>
  );
}

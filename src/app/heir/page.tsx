'use client';

// Today answers one question: what should I do now? The course's window with today's session, the week kept,
// and the unit you're on. What you know lives on Progress; the whole course on its own page.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHeir } from './ui/provider';
import { groupLabel, useCourse } from './ui/course';
import { KeepCards } from './ui/keep-cards';
import { Tabs } from './ui/tabs';
import { DaysKept } from './ui/days-kept';
import { TodayCards } from './ui/today';
import { Stone } from './ui/stone';
import { getItem, itemLabel, itemNoun, itemSubtitle } from '@/heir/content';
import { levelInfo, needsRefresh, recited } from '@/heir/levels';
import { localDay, type MemberProgress } from '@/heir/progress';
import type { PathUnit } from '@/heir/path';
import { describe, lessonsDone, nightOffer, planNext, riseOffer } from '@/heir/planner';
import { unitsFor } from '@/heir/lesson';
import { greeting } from '@/heir/time';
import type { Track } from '@/heir/types';
import { RoundWindow } from './ui/glass/round';
import { partWindow, type PartWindow } from './ui/glass/light';
import type { WindowHandle } from './ui/glass/window';

export default function Today() {
  const { ready, household, time, now, labs } = useHeir();
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
  // The window for the part you're working in.
  const light = partWindow(course, track, mine, now);
  const start = !plan ? null : plan.kind === 'welcome' ? 'Begin' : `Start ${lessonName.replace(/^Lesson/, 'lesson')}`;
  // What today's session holds, in a line.
  const holds = plan ? `${describe(plan, groupLabel)}${due.length && plan.kind !== 'practice' && plan.kind !== 'welcome-back' ? ` ${due.length} ${due.length === 1 ? 'review is' : 'reviews are'} due too.` : ''}` : '';
  const learnedCount = light.lit.filter((f) => f >= 1).length;
  // The evening review and the morning recall, offered only when there's something to do.
  const riseItems = riseOffer(mine, now);
  const nightItems = riseItems ? null : nightOffer(mine, ids, now);
  const noun = itemNoun(items[0]);

  return (
    <>
      <main className="hr-page">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginTop: 12 }}>
          <h1 className="serif" style={{ margin: 0, fontSize: 26, fontWeight: 500, lineHeight: 1.15 }}>{greeting(time)}, {me.name.trim().split(/\s+/)[0]}</h1>
          <Link href="/heir/you" aria-label={`You: ${me.name}, settings and family`} style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--card)', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 17, textDecoration: 'none', flex: 'none' }}>{me.name[0]}</Link>
        </header>

        {labs ? null : riseItems ? (
          <Link className="hr-invite morning" href="/heir/lesson?mode=rise">
            <span className="hr-invite-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 18a8 8 0 0 1 16 0M2 18h20M12 6V3M5.6 8.6 3.5 6.5M18.4 8.6l2.1-2.1" /></svg></span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}><span className="serif" style={{ fontSize: 18, fontWeight: 500 }}>When you rise</span><span style={{ fontSize: 13, opacity: 0.8 }}>1 minute · recall last night’s {riseItems.length}</span></span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
        ) : nightItems ? (
          <Link className="hr-invite night" href="/heir/lesson?mode=night">
            <span className="hr-invite-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z" /></svg></span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}><span className="serif" style={{ fontSize: 18 }}>When you lie down</span><span style={{ fontSize: 13, color: '#A9A6C4' }}>3 minutes before sleep · {nightItems.length} {itemNoun(getItem(nightItems[0]), nightItems.length)}</span></span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
        ) : null}

        {labs ? <TodayCards /> : <>
        {/* The course's window: lit glass is what you've learned, dark glass is still to come. */}
        <section className="hr-rose-card">
          <div className="hr-rose-wash" style={{ backgroundImage: `url(${light.base}/glass.webp)` }} aria-hidden="true" />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' }}>
            {(light.count > 1 || light.title !== course.title) && <span className="hr-label">{course.title}</span>}
            <h2 className="serif" style={{ margin: 0, fontSize: 26, fontWeight: 500, lineHeight: 1.1 }}>{light.count > 1 ? `Part ${light.index + 1} · ${light.title}` : light.title}</h2>
          </div>
          <TodayWindow key={light.base} light={light} started={items.some((i) => unitsFor(i, track).some((u) => mine.units.includes(u.key)))} hint={plan && (plan.kind === 'welcome' || plan.kind === 'learn') && light.next >= 0 ? light.next : undefined} />
          <span style={{ fontSize: 13, color: '#C9C1B3' }}>{learnedCount} of {light.items.length} {noun} learned</span>
          {plan && (
            <div className="hr-today-plan">
              <span style={{ fontWeight: 700 }}>Today · {lessonName}</span>
              <span>{holds}</span>
            </div>
          )}
          {start ? (
            <Link className="hr-glass-btn" href="/heir/lesson"><span>{start}</span>
              <span className="hr-glass-btn-go" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
            </Link>
          ) : <p className="serif" style={{ margin: 0, fontSize: 17 }}>All caught up for today.</p>}
        </section>

        <KeepCards />

        <DaysKept days={mine.days} today={today} now={now} dueCount={due.length} />

        {(() => {
          // Only the unit you're on; the whole course is on its own page.
          const at = path.findIndex((u) => u.status !== 'done');
          const unit = path[at >= 0 ? at : path.length - 1];
          return unit ? <UnitCard unit={unit} mine={mine} track={track} now={now} courseId={course.id} /> : null;
        })()}
        </>}
      </main>
      <Tabs />
    </>
  );
}

// A unit is its questions: each shows the stone it has earned, the next one to learn, or nothing yet.
function UnitCard({ unit, mine, track, now, courseId }: { unit: PathUnit; mine: MemberProgress; track: Track; now: Date; courseId: string }) {
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
            // Short labels in a list; the full next step is on the item's own page.
            const note = dim ? { text: 'Needs a refresh', miss: true } : level ? { text: levelInfo(level)!.name, miss: false }
              : started ? { text: recited(item, track, mine.log) ? 'Tomorrow' : 'Learning', miss: false } : isNext ? { text: 'Next', miss: false } : null;
            const body = (
              <>
                {isNext && !started ? <span className="hr-dot current" aria-label="Next" /> : <Stone level={level} size={26} dim={dim} />}
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontWeight: 600 }}>{itemLabel(item)}</span>
                  <span style={{ fontSize: 14, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{itemSubtitle(item)}</span>
                </span>
                {note && note.text && <span style={{ flex: 'none', marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: note.miss ? 'var(--miss)' : 'var(--muted)', textAlign: 'right', maxWidth: 110 }}>{note.text}</span>}
              </>
            );
            return <li key={item.id}>{started ? <Link className="hr-lesson" href={`/heir/item/${item.id}`}>{body}</Link> : <div className="hr-lesson" data-status={isNext ? undefined : 'upcoming'}>{body}</div>}</li>;
          })}
          <li><div className="hr-lesson" data-status={lockDone ? undefined : 'upcoming'}>
            <span className={`hr-dot${lockDone ? ' done' : ''}`} aria-hidden="true">{lockDone && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontWeight: 600 }}>Lock it in</span><span style={{ fontSize: 14, color: 'var(--muted)' }}>{unit.lockWaiting ? 'Tomorrow, after a night’s sleep' : `All ${unit.group.items.length} from memory`}</span></span>
          </div></li>
          <li><Link className="hr-lesson" href={`/heir/courses/${courseId}`} style={{ justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>The whole course</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--muted)' }}><path d="M9 6l6 6-6 6" /></svg>
          </Link></li>
        </ol>
      ) : <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>{unit.group.items.length} {itemNoun(unit.group.items[0], unit.group.items.length)}. Opens when the unit before is locked in.</p>}
    </section>
  );
}

// Each time Today opens, the window starts dark and lights pane by pane up to where you are, while the gold
// arc on the frame grows round with it: your progress, shown fresh every visit.
// Before the course has begun, a dim light moves behind the dark glass; once it has, the window holds still.
function TodayWindow({ light, hint, started }: { light: PartWindow; hint?: number; started: boolean }) {
  const win = useRef<WindowHandle>(null);
  const dark = useMemo(() => light.lit.map(() => 0), [light.lit]);
  const [share, setShare] = useState(0);
  const [arcMs, setArcMs] = useState(900);
  const [settled, setSettled] = useState(false);
  const ready = () => {
    const pieces = win.current?.meta()?.count ?? 500;
    const lit = Math.round(light.share * pieces);
    // The engine spaces panes so the whole sweep takes about two and a half seconds at most.
    const sweep = lit ? Math.min(2400, lit * 130) + 600 : 0;
    setTimeout(() => {
      win.current?.revealTo(light.lit);
      setArcMs(Math.max(600, sweep));
      setShare(light.share);
      setTimeout(() => setSettled(true), sweep);
    }, 350);
  };
  return (
    <RoundWindow ref={win} base={light.base} lit={dark} dusty={settled ? light.dusty : undefined} hint={settled ? hint : undefined}
      share={share} arcMs={arcMs} onReady={ready} beam={started ? undefined : { kind: 'circle' }} label={`Your window: ${Math.round(light.share * 100)}% lit`} />
  );
}

'use client';

// The week's days kept: one circle a day, Sunday and one more day each week free. On Today (and on Progress with the new Today).

import { bestDaysKept, daysKept } from '@/heir/levels';
import { localDay } from '@/heir/progress';

export function DaysKept({ days, today, now, dueCount }: { days: string[]; today: string; now: Date; dueCount: number }) {
  const kept = daysKept(days, today);
  const best = Math.max(kept, bestDaysKept(days));
  const set = new Set(days);
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  // The first skipped weekday of the week is its free day (shown as rest); a second skipped day shows as missed.
  const days7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const key = localDay(d);
    const state = set.has(key) ? 'kept' : key === today ? 'today' : d.getDay() === 0 ? 'rest' : key < today ? 'missed' : 'later';
    return { key, label: 'MTWTFSS'[i], state };
  });
  const firstMissed = days7.findIndex((d) => d.state === 'missed');
  const week = days7.map((d, i) => (i === firstMissed ? { ...d, state: 'rest' } : d));
  const doneToday = set.has(today);
  const sunday = now.getDay() === 0;
  const line = sunday && !doneToday ? 'Sunday is a day of rest: learn if you like, but skipping it never breaks the count. Each week also has one more free day.'
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


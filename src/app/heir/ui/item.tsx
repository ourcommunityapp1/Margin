'use client';

// One question or verse: the answer, how strong it is and how it has gone, Practice (a mix of steps) and Review (the whole
// answer from memory), what it means, and the Scripture it rests on.

import Link from 'next/link';
import { useHeir } from './provider';
import { Back, Tabs } from './tabs';
import { activeMember } from '@/heir/household';
import { memberProgress } from '@/heir/progress';
import { STAGES, levelInfo, needsRefresh, nextStep, recited } from '@/heir/levels';
import { Explain } from './explain';
import { Stone } from './stone';
import { unitsFor } from '@/heir/lesson';
import { RelatedVerses } from './related';
import { relatedFor } from '@/heir/related';
import { strongUntilFor } from '@/heir/keep';
import type { Item } from '@/heir/types';
import { partMemories } from '@/heir/memory';
import { itemStats, itemStrength, practisedToday, strengthBand } from '@/heir/item-stats';

export function ItemScreen({ item, collectionTitle, unit, back = '/heir/courses' }: { item: Item; collectionTitle: string; unit: string; back?: string }) {
  const { household, progress, now, labs } = useHeir();
  const me = activeMember(household);
  const mine = memberProgress(progress, me?.id);
  const learned = unitsFor(item, me?.track ?? 'adult').every((u) => mine.units.includes(u.key));
  const level = mine.levels[item.id] ?? 0;
  const dim = needsRefresh(mine, item.id, now);
  const next = learned ? nextStep(item, me?.track ?? 'adult', mine, now) : null;
  const strong = learned ? strongUntilFor(item, mine, me?.track ?? 'adult') : null;
  const today = learned && practisedToday(mine, item.id, now);
  const strength = learned && !today ? itemStrength(mine, item.id, now, partMemories(mine.log, mine.partSnap)) : null;
  const stats = learned ? itemStats(item, mine, me?.track ?? 'adult') : null;
  const noun = unit === 'Question' ? 'answer' : unit === 'Verse' ? 'verse' : 'words';
  const date = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
  const ago = (d: Date) => { const days = Math.round((new Date(now).setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86_400_000); return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`; };

  return (
    <>
      <main className="hr-page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <Back href={back} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>{collectionTitle} · {unit === 'Question' ? 'Q' : unit === 'Verse' || unit === 'Commandment' ? `${unit} ` : 'Part '}{item.number}</span>
        </div>

        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p className="serif" style={{ margin: 0, fontSize: 20, lineHeight: 1.35, fontWeight: 600 }}>{item.prompt}</p>
          <p className="serif" style={{ margin: 0, fontSize: 24, lineHeight: 1.45 }}>{item.text}</p>
          {learned && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--well)', borderRadius: 16, padding: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Stone level={level} size={44} dim={dim} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontWeight: 600 }}>{level ? `${levelInfo(level)!.name} · ${levelInfo(level)!.counts}` : recited(item, me?.track ?? 'adult', mine.log) ? STAGES[0].name : 'Practiced'}</span>
                    {dim && <span style={{ fontSize: 14, color: 'var(--miss)' }}>Due for a refresh</span>}
                    {strong && !dim && <span style={{ fontSize: 14, color: 'var(--muted)' }}>{strong.getTime() <= now.getTime() ? 'Worth a review now' : `Strong until about ${strong.toLocaleDateString('en-US', { month: 'long', year: strong.getFullYear() === now.getFullYear() ? undefined : 'numeric' })}`}</span>}
                  </span>
                </div>
                {today ? (
                  <div className="hr-ring" style={{ ['--v' as string]: 100 }}><b className="serif" style={{ fontSize: 20 }}>Today</b><span>practised</span></div>
                ) : strength !== null && (
                  <div className="hr-ring" data-band={strengthBand(strength)} style={{ ['--v' as string]: Math.round(strength * 100) }}><b className="serif">{Math.round(strength * 100)}%</b><span>strength</span></div>
                )}
              </div>
              {stats && (
                <div className="hr-kv">
                  {stats.learnedAt && <div><span>Learned</span><span>{date(stats.learnedAt)}</span></div>}
                  {stats.practised > 0 && <div><span>Practised</span><span>{stats.practised} time{stats.practised === 1 ? '' : 's'} · {stats.right} right</span></div>}
                  {stats.last && <div><span>Last time</span><span>{ago(stats.last)}{stats.lastRight === false ? ' · a slip' : ''}</span></div>}
                  {stats.oftenMissed && <div><span>Often missed</span><span>“{stats.oftenMissed}”</span></div>}
                  {stats.due && <div><span>Next review</span><span>{stats.due.getTime() <= now.getTime() ? 'Now' : date(stats.due)}</span></div>}
                </div>
              )}
              {next && <span style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.45 }}>{level === 0 && !recited(item, me?.track ?? 'adult', mine.log) ? 'Next' : 'Next stone'}: {next}.</span>}
              <Link href={`/heir/lesson?mode=item&item=${encodeURIComponent(item.id)}`} className="hr-btn">Practice</Link>
              <span className="hr-btn-note">A mix of steps, chosen by how well you know it</span>
              <Link href={`/heir/lesson?mode=keep&items=${encodeURIComponent(item.id)}`} className="hr-btn quiet" style={{ background: 'var(--card)', color: 'var(--ink)' }}>Review</Link>
              <span className="hr-btn-note">Type or say the whole {noun} from memory</span>
            </div>
          )}
          {labs && !item.reviewed && <div><span className="hr-tag" style={{ background: 'transparent', border: '1px solid var(--edge)' }}>Not yet reviewed</span></div>}
        </section>

        <Explain item={item} />

        {item.meaning.length > 0 && (
          <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span className="hr-label">What it means</span>
            {item.meaning.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: i ? '1px solid var(--line)' : 0, paddingTop: i ? 14 : 0 }}>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{m.question}</span>
                <span style={{ fontSize: 16, lineHeight: 1.5 }}><b>{m.answer}.</b> {m.explain}</span>
              </div>
            ))}
          </section>
        )}

        <RelatedVerses item={item} />

        {item.connected.length > 0 && relatedFor(item).length === 0 && (
          <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="hr-label">Connected Scripture</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {item.connected.map((r) => <span key={r} className="hr-tag" style={{ fontSize: 14, padding: '7px 12px' }}>{r}</span>)}
            </div>
          </section>
        )}
      </main>
      <Tabs />
    </>
  );
}

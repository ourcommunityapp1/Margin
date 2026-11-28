'use client';

// One question or verse: the answer, how strong it is and how it has gone, Practice (a mix of steps) and Review (the whole
// answer from memory), what it means, and the Scripture it rests on.

import Link from 'next/link';
import { useHeir } from './provider';
import { Back, Tabs } from './tabs';
import { activeMember } from '@/heir/household';
import { memberProgress } from '@/heir/progress';
import { levelShown, needsRefresh } from '@/heir/levels';
import { tierOf } from '@/heir/tiers';
import { Explain } from './explain';
import { ItemPlanButton } from './plan-button';
import { Stone } from './stone';
import { unitsFor } from '@/heir/lesson';
import { RelatedVerses } from './related';
import { relatedFor } from '@/heir/related';
import { courseItems, courses, isVerse } from '@/heir/content';
import type { Item } from '@/heir/types';
import { partMemories } from '@/heir/memory';
import { itemStats, itemStrength, recitedPerfectly, strengthBand, strengthSeries, timesPracticed, wordCards, type WordCard } from '@/heir/item-stats';

export function ItemScreen({ item, collectionTitle, unit, back = '/heir/courses' }: { item: Item; collectionTitle: string; unit: string; back?: string }) {
  const { household, progress, now, labs } = useHeir();
  const me = activeMember(household);
  const mine = memberProgress(progress, me?.id);
  const owner = courses.find((c) => courseItems(c).some((i) => i.id === item.id));
  const learned = unitsFor(item, me?.track ?? 'adult').every((u) => mine.units.includes(u.key));
  const level = levelShown(mine, item, me?.track ?? 'adult');
  const dim = needsRefresh(mine, item.id, now);
  const strength = learned ? itemStrength(mine, item.id, now, partMemories(mine.log, mine.partSnap)) : null;
  const stats = learned ? itemStats(item, mine, me?.track ?? 'adult') : null;
  const cards = learned ? wordCards(item, me?.track ?? 'adult', mine.log) : [];
  const perfect = learned ? recitedPerfectly(item, me?.track ?? 'adult', mine.log) : 0;
  const practised = timesPracticed(item, mine.log);
  const series = learned ? strengthSeries(item, mine.log, now) : [];
  const noun = unit === 'Question' ? 'answer' : unit === 'Verse' ? 'verse' : 'words';
  const date = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });

  return (
    <>
      <main className="hr-page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 0 }}>
          <Back href={back} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>{unit === 'Verse' ? item.prompt : `${collectionTitle} · ${unit === 'Question' ? 'Q' : unit === 'Commandment' ? `${unit} ` : 'Part '}${item.number}`}</span>
        </div>

        {/* The passage sits open on the page, with the two actions straight under it. */}
        <section className="hr-item-passage" aria-label="Passage">
          {unit === 'Question'
            ? <p className="serif hr-item-q">{item.prompt}</p>
            : unit === 'Verse' ? null : <span className="hr-label">{item.prompt}</span>}
          <p className="serif hr-item-text">{item.text}</p>
          {labs && !item.reviewed && <div><span className="hr-tag" style={{ background: 'transparent', border: '1px solid var(--edge)' }}>Not yet reviewed</span></div>}
        </section>

        {owner && <ItemPlanButton item={item} course={owner} />}

        {!learned && owner && (
          <div className="hr-actions">
            <Link href={`/heir/lesson?mode=learn&item=${encodeURIComponent(item.id)}&course=${owner.id}&from=${encodeURIComponent(`/heir/item/${item.id}`)}`} className="hr-btn">Learn it · 2 min</Link>
          </div>
        )}

        {learned && (
          <section className="hr-card hr-status" aria-label="How it is going">
            <div className="hr-status-top">
              {strength !== null
                ? <div className="hr-ring" data-band={strengthBand(strength)} style={{ ['--v' as string]: Math.round(strength * 100), width: 92, height: 92 }}><b className="serif">{Math.round(strength * 100)}%</b></div>
                : <Stone level={level} size={56} dim={dim} />}
              <span className="hr-status-text">
                <b>{level ? `${tierOf(level)!.stone} · ${tierOf(level)!.name}` : 'Not learned yet'}</b>
                {dim ? <span style={{ color: 'var(--miss)' }}>Due for a refresh</span> : null}
              </span>
            </div>
            {stats && (
              <>
                <div className="hr-status-nums">
                  <div><b className="serif">{perfect}</b><span>recited perfectly</span></div>
                  <div><b className="serif">{practised}</b><span>times practised</span></div>
                  <div><b className="serif">{stats.learnedAt ? date(stats.learnedAt) : '–'}</b><span>learned</span></div>
                </div>
                {stats.oftenMissed && <div className="hr-kv"><div><span>Often missed</span><span>“{stats.oftenMissed}”</span></div></div>}
              </>
            )}
          </section>
        )}

        {learned && (
          <div className="hr-actions">
            <Link href={`/heir/lesson?mode=item&item=${encodeURIComponent(item.id)}&from=${encodeURIComponent(`/heir/item/${item.id}`)}`} className="hr-btn">Practice</Link>
            <Link href={`/heir/lesson?mode=keep&items=${encodeURIComponent(item.id)}&from=${encodeURIComponent(`/heir/item/${item.id}`)}`} className="hr-btn hr-btn-outline" aria-label={`Review: type or say the whole ${noun} from memory`}>Review</Link>
          </div>
        )}

        {learned && cards.some((c) => c.band !== 'none') && (
          <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} aria-label="Word by word">
            <span className="hr-label">Word by word</span>
            <div className="hr-words">{cards.map((c, i) => <WordChip key={i} card={c} />)}</div>
            <div className="hr-words-legend"><span><i data-b="red" />Missed a lot</span><span><i data-b="yellow" />Often</span><span><i data-b="light" />Pretty good</span><span><i data-b="dark" />Consistent</span><span><i data-b="none" />Not tried yet</span></div>
          </section>
        )}

        {learned && series.length >= 2 && (
          <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-label="Strength over time">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="hr-label">Strength over time</span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>85% is the target</span>
            </div>
            <StrengthLine series={series} />
          </section>
        )}

        {!isVerse(item) && <Explain item={item} />}

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

const wordTitle = (c: WordCard) => (c.tries ? `${c.misses} miss${c.misses === 1 ? '' : 'es'} in ${c.tries} ${c.tries === 1 ? 'try' : 'tries'}` : 'Not tried yet');
function WordChip({ card }: { card: WordCard }) {
  return <span className="hr-wc" data-b={card.band} title={wordTitle(card)}>{card.word}</span>;
}

// The model's chance of recalling it, day by day (or week by week), with the 85% target as a dashed line.
function StrengthLine({ series }: { series: { at: number; chance: number }[] }) {
  const w = 320, h = 150, L = 30, R = 8, T = 12, B = 26;
  const x = (i: number) => L + ((w - L - R) * i) / (series.length - 1), y = (v: number) => T + (h - T - B) * (1 - v);
  const d = series.map((q, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(q.chance).toFixed(1)}`).join('');
  const fill = `${d}L${x(series.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`;
  const last = series[series.length - 1];
  const day = (t: number) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="hr-pg-step" role="img" aria-label={`Strength over time, now ${Math.round(last.chance * 100)}%`}>
      <defs><linearGradient id="hr-sl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b9e3b0" stopOpacity=".4" /><stop offset="1" stopColor="#b9e3b0" stopOpacity=".03" /></linearGradient></defs>
      {[0, 0.5, 1].map((v) => <g key={v}><line x1={L} x2={w - R} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,.1)" /><text x={L - 5} y={y(v) + 4} textAnchor="end">{Math.round(v * 100)}%</text></g>)}
      <line x1={L} x2={w - R} y1={y(0.85)} y2={y(0.85)} stroke="#F3D8B6" strokeOpacity=".6" strokeDasharray="4 4" />
      <path d={fill} fill="url(#hr-sl)" />
      <path d={d} fill="none" stroke="#b9e3b0" strokeWidth="2" strokeLinejoin="round" />
      <circle cx={x(series.length - 1)} cy={y(last.chance)} r="4.5" fill="#b9e3b0" stroke="var(--card, #1a2027)" strokeWidth="2" />
      <text className="n" x={x(series.length - 1) - 8} y={y(last.chance) - 9} textAnchor="end">{Math.round(last.chance * 100)}%</text>
      <text x={L} y={h - 6}>{day(series[0].at)}</text><text x={w - R} y={h - 6} textAnchor="end">Now</text>
    </svg>
  );
}


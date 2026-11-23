'use client';

// An item's related verses: each can be practiced by typing it from memory. The text isn't stored in the app: it's
// fetched from the verse service when a learner opens one, and kept only on their own phone for next time.
// Recalling them all, once it's understood, makes it Mastered.

import { useState } from 'react';
import { useHeir } from './provider';
import { activeMember } from '@/heir/household';
import { memberProgress, recallRelated } from '@/heir/progress';
import { settle, understanding } from '@/heir/levels';
import { allItems } from '@/heir/content';
import { relatedFor, verseCount } from '@/heir/related';
import { sameWords } from '@/heir/words';
import type { Item } from '@/heir/types';

const CACHE = 'heir-verses-v1';
type Cached = { text: string; version: string };
const memory = new Map<string, Cached>();

function readCache(): Record<string, Cached> {
  try { return JSON.parse(localStorage.getItem(CACHE) ?? '{}'); } catch { return {}; }
}

async function verseFor(passage: string): Promise<Cached> {
  const hit = memory.get(passage) ?? readCache()[passage];
  if (hit) return hit;
  const r = await fetch(`/api/heir/verse?ref=${encodeURIComponent(passage)}`);
  if (!r.ok) throw new Error('unavailable');
  const body = (await r.json()) as { text?: string; version?: string };
  if (!body.text) throw new Error('empty');
  const got = { text: body.text, version: body.version ?? 'NASB' };
  memory.set(passage, got);
  try { localStorage.setItem(CACHE, JSON.stringify({ ...readCache(), [passage]: got })); } catch { /* private mode: fetched again next time */ }
  return got;
}

function Practice({ passage, onRecalled }: { passage: string; onRecalled: () => void }) {
  const [verse, setVerse] = useState<Cached | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'failed'>('idle');
  const [typed, setTyped] = useState('');
  const [shown, setShown] = useState(false);
  const [miss, setMiss] = useState(false);

  const open = async () => {
    setState('loading');
    try { setVerse(await verseFor(passage)); setState('idle'); } catch { setState('failed'); }
  };
  if (!verse) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button type="button" className="hr-btn" onClick={open} disabled={state === 'loading'}>{state === 'loading' ? 'Loading…' : 'Recall it'}</button>
        {state === 'failed' && <span style={{ fontSize: 14, color: 'var(--miss)' }}>The verse couldn’t be loaded. Check your connection and try again.</span>}
      </div>
    );
  }
  const check = () => {
    if (sameWords(typed, verse.text)) onRecalled(); else setMiss(true);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{ fontSize: 15, color: 'var(--muted)' }}>Type {passage} from memory, then check it.</span>
      <textarea value={typed} onChange={(e) => { setTyped(e.target.value); setMiss(false); }} rows={4} aria-label={`${passage}, from memory`}
        style={{ width: '100%', font: 'inherit', fontSize: 17, lineHeight: 1.4, padding: 12, borderRadius: 14, border: '1px solid var(--edge)', background: 'var(--well)', color: 'var(--ink)' }} />
      {miss && <span style={{ fontSize: 14, color: 'var(--miss)' }}>Not quite. Check the words and try again.</span>}
      {shown && <p className="serif" style={{ margin: 0, fontSize: 19, lineHeight: 1.45 }}>{verse.text} <span style={{ fontSize: 13, color: 'var(--muted)' }}>({passage}, {verse.version})</span></p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="hr-btn" style={{ background: 'var(--well)', color: 'var(--ink)' }} onClick={() => setShown((s) => !s)}>{shown ? 'Hide it' : 'Show it'}</button>
        <button type="button" className="hr-btn" onClick={check} disabled={!typed.trim()}>Check</button>
      </div>
    </div>
  );
}

export function RelatedVerses({ item }: { item: Item }) {
  const { household, progress, updateProgress } = useHeir();
  const me = activeMember(household);
  const [open, setOpen] = useState<string | null>(null);
  const passages = relatedFor(item);
  if (!me || !passages.length) return null;
  const mine = memberProgress(progress, me.id);
  const done = passages.filter((p) => mine.related?.[p]).length;
  const u = understanding(item, mine);

  const recalled = (passage: string) => {
    const at = new Date();
    updateProgress((all) => ({ ...all, [me.id]: settle(recallRelated(memberProgress(all, me.id), passage, at), allItems(), me.track, at).progress }));
    setOpen(null);
  };

  return (
    <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} aria-label="Related verses">
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="hr-label">Related verses</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{done} of {passages.length} recalled</span>
      </span>
      <span style={{ fontSize: 14, lineHeight: 1.45, color: 'var(--muted)' }}>
        {u >= 3 ? 'Mastered: you understand this and know everything it rests on.' : u === 2 ? 'Recall each one from memory to master it.' : 'Recall each one from memory. Once you’ve also explained it in your own words, it’s mastered.'}
      </span>
      {passages.map((p) => {
        const ok = !!mine.related?.[p];
        return (
          <div key={p} style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600 }}>{p}{verseCount(p) > 1 ? ` · ${verseCount(p)} verses` : ''}</span>
              {ok
                ? <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--good)' }}>Recalled</span>
                : <button type="button" className="hr-tag" style={{ fontSize: 14, padding: '7px 12px', cursor: 'pointer' }} onClick={() => setOpen(open === p ? null : p)}>{open === p ? 'Close' : 'Practice'}</button>}
            </span>
            {open === p && !ok && <Practice passage={p} onRecalled={() => recalled(p)} />}
          </div>
        );
      })}
    </section>
  );
}

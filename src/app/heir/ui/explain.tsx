'use client';

// "In your own words": the understanding track's middle step. Explaining something, rather than recognizing a right
// answer, is what shows it's understood (self-explanation). Write it out, compare it with the notes, and say honestly
// whether you had the main idea. Nothing written is saved: only that it was done, and when.

import { useState } from 'react';
import { useHeir } from './provider';
import { activeMember } from '@/heir/household';
import { markExplained, memberProgress } from '@/heir/progress';
import { UNDERSTANDING, understanding } from '@/heir/levels';
import type { Item } from '@/heir/types';

export function Explain({ item }: { item: Item }) {
  const { household, progress, updateProgress } = useHeir();
  const me = activeMember(household);
  const [text, setText] = useState('');
  const [comparing, setComparing] = useState(false);
  const [notYet, setNotYet] = useState(false);
  if (!me || !item.meaning.length) return null;
  const mine = memberProgress(progress, me.id);
  const u = understanding(item, mine);
  const step = u ? UNDERSTANDING[u - 1] : null;

  const done = () => {
    const at = new Date();
    updateProgress((all) => ({ ...all, [me.id]: markExplained(memberProgress(all, me.id), item.id, at) }));
    setComparing(false);
    setText('');
  };

  return (
    <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} aria-label="In your own words">
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span className="hr-label">In your own words</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: u ? 'var(--good)' : 'var(--muted)' }}>{step ? step.name : 'Understanding'}</span>
      </span>
      {u >= 2 ? (
        <span style={{ fontSize: 14, lineHeight: 1.45, color: 'var(--muted)' }}>
          {u >= 3 ? 'Mastered: you’ve explained it, and recalled every verse it rests on.' : 'Understood: you’ve explained it in your own words. Recall its related verses to master it.'}
        </span>
      ) : (
        <>
          <span style={{ fontSize: 14, lineHeight: 1.45, color: 'var(--muted)' }}>Explain what this means as if to a child. Then compare it with the notes and decide honestly whether you had the main idea.</span>
          <textarea value={text} onChange={(e) => { setText(e.target.value); setNotYet(false); }} rows={4} aria-label="What it means, in your own words" readOnly={comparing}
            style={{ width: '100%', font: 'inherit', fontSize: 17, lineHeight: 1.4, padding: 12, borderRadius: 14, border: '1px solid var(--edge)', background: 'var(--well)', color: 'var(--ink)' }} />
          {comparing ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--well)', borderRadius: 14, padding: '12px 14px' }}>
                <span className="hr-label" style={{ fontSize: 12 }}>The notes</span>
                {item.meaning.map((m, i) => (
                  <span key={i} style={{ fontSize: 15, lineHeight: 1.5 }}><b>{m.answer}.</b> {m.explain}</span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="hr-btn" style={{ background: 'var(--well)', color: 'var(--ink)' }} onClick={() => { setComparing(false); setNotYet(true); }}>Not yet</button>
                <button type="button" className="hr-btn" onClick={done}>I had the main idea</button>
              </div>
            </>
          ) : (
            <button type="button" className="hr-btn" disabled={text.trim().split(/\s+/).length < 5} onClick={() => setComparing(true)}>Compare with the notes</button>
          )}
          {notYet && <span style={{ fontSize: 14, color: 'var(--muted)' }}>Read the notes again, then try it once more another day.</span>}
        </>
      )}
    </section>
  );
}

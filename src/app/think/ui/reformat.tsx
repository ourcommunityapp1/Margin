'use client';

// Reformat: a full-screen carousel of large, readable versions of the note. The Original comes
// first, then three arrangements chosen to fit this note. Swipe to compare, then use one. The
// note's own words are never replaced, so the original is always one tap away.

import { useEffect, useRef, useState } from 'react';
import { post } from '@/think/client/session';
import { faithfulVersions, localVersions } from '@/think/reformat';
import { noteText, type Layout, type Note } from '@/think/types';
import { CloseIcon, iconButton } from './bits';

export function ReformatView({ note, onClose, onUse }: { note: Note; onClose(): void; onUse(layout: Layout | null): void }) {
  const [versions, setVersions] = useState<Layout[] | null>(null);
  const [source, setSource] = useState<'ai' | 'local'>('ai');
  const [index, setIndex] = useState(0);
  const rail = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stop = new AbortController();
    const text = noteText(note);
    post<{ versions: Layout[]; source: 'ai' | 'local' }>('reformat', { paragraphs: note.paragraphs, title: note.title }, stop.signal)
      // Checked again here: every sentence must be found in the note.
      .then((r) => { setVersions(faithfulVersions(r.versions ?? [], text)); setSource(r.source); })
      .catch(() => { if (!stop.signal.aborted) { setVersions(localVersions(note.paragraphs)); setSource('local'); } });
    return () => stop.abort();
    // Asked once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const original: Layout = { label: 'Original', blocks: note.paragraphs.map((v) => ({ v })) };
  const cards = [original, ...(versions ?? [])];
  const total = cards.length + (versions === null ? 1 : 0);
  const at = Math.min(index, total - 1);
  const shown = cards[at];
  const current = note.layout?.label ?? 'Original';

  const onScroll = () => {
    const el = rail.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    const n = Math.round(el.scrollLeft / (first.offsetWidth + 12));
    if (n !== index && n >= 0 && n < total) setIndex(n);
  };

  return (
    <div className="dt-fade fixed inset-0 z-40 flex justify-center bg-[var(--well)]" role="dialog" aria-modal="true" aria-label="Reformat">
      <div className="flex h-full w-full max-w-[480px] flex-col">
        <div className="dt-top flex shrink-0 items-center gap-1 px-3">
          <button aria-label="Close" onClick={onClose} className={iconButton}><CloseIcon /></button>
          <span className="flex-1 text-center text-[15px] font-semibold">{shown?.label ?? 'Finding shapes…'}</span>
          <span className="w-11 text-center text-[13px] text-[var(--muted)]">{at + 1}/{total}</span>
        </div>

        <div ref={rail} onScroll={onScroll} className="dt-rail mt-1 flex min-h-0 flex-1 snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-9 pb-6 pt-2">
          {cards.map((c) => (
            <article key={c.label} className="flex shrink-0 grow-0 basis-full snap-center flex-col gap-[14px] overflow-y-auto rounded-[22px] bg-[var(--paper)] px-6 py-[26px] shadow-[0_10px_30px_rgba(28,27,25,0.12)]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[var(--accent)]">{c.label}{c.label === current ? ' · current' : ''}</span>
              <h2 className="serif m-0 text-[26px] font-medium leading-[1.2]">{note.title || 'Untitled'}</h2>
              {c.blocks.map((b, i) => (
                <div key={i} className="flex flex-col gap-1">
                  {b.k && <span className="text-[12px] font-semibold uppercase tracking-[0.5px] text-[var(--muted)]">{b.k}</span>}
                  <span className="serif text-[17px] leading-[1.55] text-[var(--body)]">{b.v}</span>
                </div>
              ))}
            </article>
          ))}
          {versions === null && (
            <article className="flex shrink-0 grow-0 basis-full snap-center flex-col items-center justify-center gap-3 rounded-[22px] bg-[var(--paper)] px-6 text-center shadow-[0_10px_30px_rgba(28,27,25,0.12)]" role="status">
              <span className="serif text-[19px] leading-[1.45] text-[var(--muted)]">Finding three shapes that fit this note&hellip;</span>
              <span className="text-[12px] text-[var(--muted)]">Only your own sentences, rearranged.</span>
            </article>
          )}
        </div>

        <div className="flex shrink-0 justify-center gap-[6px]" aria-hidden="true">
          {Array.from({ length: total }, (_, k) => (
            <span key={k} className={`h-[6px] rounded-[3px] ${k === at ? 'w-[18px] bg-[var(--ink)]' : 'w-[6px] bg-[#B9B3A8]'}`} />
          ))}
        </div>

        <div className="dt-bottom flex shrink-0 flex-col items-center gap-2 px-5 pt-4">
          <button
            disabled={!shown}
            onClick={() => shown && (shown.label === current ? onClose() : onUse(shown.label === 'Original' ? null : shown))}
            className="h-[52px] w-full rounded-[26px] bg-[var(--ink)] text-[15px] font-medium text-[var(--paper)] disabled:opacity-40">
            {!shown ? 'One moment…' : shown.label === current ? `Keep ${shown.label === 'Original' ? 'the original' : 'this format'}` : shown.label === 'Original' ? 'Back to the original' : 'Use this format'}
          </button>
          <span className="text-center text-[12px] text-[var(--muted)]">
            {versions !== null && versions.length === 0
              ? 'This note is too short to rearrange yet.'
              : source === 'local' && versions !== null
                ? 'Basic arrangements \u00B7 your original is one tap away'
                : 'Swipe to compare · your original is always one tap away'}
          </span>
        </div>
      </div>
    </div>
  );
}

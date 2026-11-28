'use client';

// The Suggestions sheet. It opens only when tapped, never on its own. First comes the one next
// move the coach recommends (most often: keep going). Then up to three prompts that each point
// at the note's own words, small fixes, real links, and one tip.

import { useEffect, useState } from 'react';
import { canReframe, groundedPrompts, looksDark, nextMove, stuckFallback, type Stuck } from '@/think/coach';
import { ApiError, post } from '@/think/client/session';
import { noteText, type Link, type Note, type Prompt, type Suggestions } from '@/think/types';
import { card, sectionLabel, Sheet } from './bits';
import type { CoachCache } from './note-screen';

const NOTHING: Suggestions = { quiet: false, perspective: null, prompts: [], fixes: [], tip: null };
const QUIET: Suggestions = { ...NOTHING, quiet: true };
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function PromptCard({ p, onShow }: { p: Prompt; onShow(quote: string): void }) {
  return (
    <button onClick={() => onShow(p.quote)} className={`${card} flex flex-col gap-[6px] text-left`}>
      <span>{p.text}</span>
      <span className="serif text-[14px] italic leading-[1.4] text-[var(--muted)]">&ldquo;{p.quote}&rdquo;</span>
    </button>
  );
}

export function SuggestionsSheet(props: {
  note: Note;
  goals: string[];
  ai: boolean;
  cache: CoachCache | null;
  rereadSinceChange: boolean;
  onCache(c: CoachCache): void;
  onClose(): void;
  onKeepGoing(): void;
  onShow(quote: string, paragraph?: number): void;
  onReadOver(): void;
  onReformat(): void;
}) {
  const { note, goals, ai, cache, onCache, onShow } = props;
  const text = noteText(note);
  const dark = looksDark(text);
  const [data, setData] = useState<Suggestions | null>(cache?.data ?? (dark ? QUIET : ai ? null : NOTHING));
  const [links, setLinks] = useState<Link[] | null>(cache?.links ?? null);
  const [error, setError] = useState('');
  const [stuck, setStuck] = useState<'closed' | 'ask' | 'loading' | 'shown'>('closed');
  const [stuckPrompts, setStuckPrompts] = useState<Prompt[]>([]);

  // Nothing is asked of the AI until the sheet is open.
  useEffect(() => {
    if (cache || dark || !ai) return;
    const stop = new AbortController();
    post<Suggestions>('suggest', { text, title: note.title, goals, unclear: note.unclear }, stop.signal)
      .then((r) => {
        // Checked again here: every prompt must quote the note.
        const safe: Suggestions = r.quiet ? QUIET : {
          ...r,
          prompts: groundedPrompts(r.prompts ?? [], text, 3),
          fixes: groundedPrompts(r.fixes ?? [], text, 2),
          tip: r.tip ? groundedPrompts([r.tip], text, 1)[0] ?? null : null,
        };
        setData(safe);
        onCache({ text, data: safe, links: null });
        if (safe.quiet) return;
        post<{ links: Link[] }>('links', { text, title: note.title }, stop.signal)
          .then((l) => { setLinks(l.links); onCache({ text, data: safe, links: l.links }); })
          .catch(() => setLinks([]));
      })
      .catch((e) => {
        if (stop.signal.aborted) return;
        setData(NOTHING);
        setError(e instanceof ApiError ? e.message : 'Couldn’t reach the coach. Check your connection.');
      });
    return () => stop.abort();
    // Asked once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const askStuck = async (kind: Stuck) => {
    setStuck('loading');
    let found: Prompt[] = [];
    if (ai) {
      try {
        const r = await post<Suggestions>('suggest', { text, title: note.title, goals, stuck: kind });
        found = r.quiet ? [] : groundedPrompts(r.prompts ?? [], text, 2);
      } catch { /* fall back to the note's own last words */ }
    }
    setStuckPrompts(found.length ? found : stuckFallback(kind, note.paragraphs));
    setStuck('shown');
  };

  // Dark content: the coach quietly steps back. The note is saved either way.
  if (data?.quiet) {
    return (
      <Sheet title="Suggestions" onClose={props.onClose}>
        <p className="serif m-0 pb-6 text-[18px] leading-[1.5] text-[var(--body)]">Nothing to suggest right now. Your note is saved.</p>
      </Sheet>
    );
  }

  const move = nextMove({ paragraphs: note.paragraphs, rereadSinceChange: props.rereadSinceChange });
  const act = move.kind === 'come_back'
    ? { label: 'Take me there', run: () => onShow(move.spot!.quote, move.spot!.paragraph) }
    : move.kind === 'read_over'
      ? { label: 'Read from the top', run: props.onReadOver }
      : { label: 'Keep talking', run: props.onKeepGoing };
  const heard: Prompt[] = note.unclear.map((u) => ({ text: `I wasn’t sure I heard “${u.word}” right. Is that the word you said?`, quote: u.context }));
  const fixes = [...heard, ...(data?.fixes ?? [])];

  return (
    <Sheet title="Suggestions" onClose={props.onClose} tall>
      <section className="flex flex-col gap-3 rounded-[14px] bg-[var(--accent-wash)] px-[14px] py-[14px]">
        <p className="m-0 text-[16px] font-medium leading-[1.4] text-[var(--accent-deep)]">{move.line}</p>
        <button onClick={act.run} className="h-11 self-start rounded-[22px] bg-[var(--ink)] px-5 text-[14px] font-medium text-[var(--paper)]">{act.label}</button>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className={sectionLabel}>Think it through</h2>
          {data?.perspective && <span className="text-[12px] font-medium text-[var(--accent)]">Reading this as: {capital(data.perspective)}</span>}
        </div>
        {!data && <p className="m-0 py-1 text-[14px] text-[var(--muted)]" role="status">Reading your note&hellip;</p>}
        {data?.prompts.map((p) => <PromptCard key={p.text} p={p} onShow={onShow} />)}
        {data && !data.prompts.length && (
          <p className="m-0 text-[14px] leading-[1.45] text-[var(--muted)]">
            {error || (ai ? 'Nothing worth asking yet. Keep going.' : 'Prompts are off: there is no AI key on the server.')}
          </p>
        )}

        {stuck === 'closed' && (
          <div className="flex gap-2 pt-1">
            <button onClick={() => setStuck('ask')} className="h-11 rounded-[22px] border border-[var(--rule)] px-4 text-[14px]">Stuck?</button>
            {canReframe(note.paragraphs) && <button onClick={props.onReformat} className="h-11 rounded-[22px] border border-[var(--rule)] px-4 text-[14px]">Reframe</button>}
          </div>
        )}
        {stuck === 'ask' && (
          <div className="flex flex-col gap-2 pt-1">
            <p className="m-0 text-[14px] text-[var(--muted)]">What kind of stuck?</p>
            <button onClick={() => askStuck('point')} className={`${card} min-h-11 text-left`}>Not sure what I&rsquo;m trying to say</button>
            <button onClick={() => askStuck('thought')} className={`${card} min-h-11 text-left`}>Stuck on one thought</button>
          </div>
        )}
        {stuck === 'loading' && <p className="m-0 py-1 text-[14px] text-[var(--muted)]" role="status">Looking at where it stalls&hellip;</p>}
        {stuck === 'shown' && stuckPrompts.map((p) => <PromptCard key={p.text} p={p} onShow={onShow} />)}
      </section>

      {fixes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className={sectionLabel}>Small fixes</h2>
          {fixes.map((p) => <PromptCard key={p.text + p.quote} p={p} onShow={onShow} />)}
        </section>
      )}

      {ai && data && !error && (links === null || links.length > 0) && (
        <section className="flex flex-col gap-[6px]">
          <h2 className={sectionLabel}>Go further</h2>
          {links === null && <p className="m-0 text-[14px] text-[var(--muted)]" role="status">Looking for something worth reading&hellip;</p>}
          {links?.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between gap-[10px] text-[14px] text-[var(--ink)] no-underline">
              <strong className="font-semibold">{l.title}</strong>
              <span className="shrink-0 text-[12px] text-[var(--accent)]">{l.domain} &#8599;</span>
            </a>
          ))}
        </section>
      )}

      {data?.tip && (
        <section className="flex flex-col gap-1 pb-2">
          <h2 className={sectionLabel}>Tip</h2>
          <button onClick={() => onShow(data.tip!.quote)} className="text-left text-[14px] leading-[1.45]">
            {data.tip.text} <span className="serif italic text-[var(--muted)]">&ldquo;{data.tip.quote}&rdquo;</span>
          </button>
        </section>
      )}
    </Sheet>
  );
}

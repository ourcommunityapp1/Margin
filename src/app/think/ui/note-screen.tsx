'use client';

// One note, in three states. Talking: the orb breathes, the live transcript sits just above it,
// and settled words join the page with punctuation and paragraph spacing only. Typing: the same
// page with a keyboard. At rest: the page to read, with Reformat and Suggestions waiting until
// they are tapped.

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { pauseReaction, REREAD_SENTENCES } from '@/think/coach';
import { createDictation, pickEngine, type Dictation } from '@/think/client/dictation';
import { newId, post } from '@/think/client/session';
import { addSpeech, addUnclear, isEmpty, snapshot, withLayout, withTypedText } from '@/think/note';
import { withInferredTitle, withUserTitle } from '@/think/title';
import { newNote, noteText, type Folder, type Layout, type Link as ReadingLink, type Note, type Suggestions, type Unclear } from '@/think/types';
import { acceptFormatting, containsWords, fallbackTitle, lightFormat, splitForReread, wordCount } from '@/think/words';
import { BackIcon, CheckIcon, iconButton, KeyboardIcon, LinesIcon, longDate, NewNoteIcon, Orb, Quiet, Sheet, SparkIcon } from './bits';
import { useThink } from './provider';
import { ReformatView } from './reformat';
import { SuggestionsSheet } from './suggestions';

type Mode = 'rest' | 'talk' | 'type';
type Panel = null | 'suggest' | 'reformat' | 'folder' | 'trail';
export interface CoachCache { text: string; data: Suggestions; links: ReadingLink[] | null }
interface Mark { paragraph: number; quote: string; key: number }

// How many unformatted words pile up before they are punctuated, and how long a breath is.
const FLUSH_WORDS = 40;
const FLUSH_AFTER_MS = 1800;
// A new title is worked out each time the note has grown by about this many words.
const TITLE_EVERY_WORDS = 60;
const LIVE_LINE_WORDS = 22;

const tail = (text: string, words: number) => {
  const all = text.trim().split(/\s+/).filter(Boolean);
  return (all.length > words ? '… ' : '') + all.slice(-words).join(' ');
};

export function NoteScreen({ id, fresh, folder }: { id: string; fresh: boolean; folder: string | null }) {
  const { store, status, profile } = useThink();
  const router = useRouter();

  const [note, setNote] = useState<Note | null>(null);
  const [missing, setMissing] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [mode, setMode] = useState<Mode>('rest');
  const [listening, setListening] = useState(false);
  const [settling, setSettling] = useState('');
  const [interim, setInterim] = useState('');
  const [waiting, setWaiting] = useState(0);
  const [reread, setReread] = useState(false);
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState('');
  const [panel, setPanel] = useState<Panel>(null);
  const [mark, setMark] = useState<Mark | null>(null);
  const [coach, setCoach] = useState<CoachCache | null>(null);
  const [rereadSinceChange, setRereadSinceChange] = useState(false);
  const [unsaved, setUnsaved] = useState(false);

  const noteRef = useRef<Note | null>(null);
  const modeRef = useRef<Mode>('rest');
  const listeningRef = useRef(false);
  const rereadRef = useRef(false);
  const pending = useRef('');
  const inFlight = useRef<string | null>(null);
  const flushing = useRef<Promise<void> | null>(null);
  const breakNext = useRef(false);
  const freshStart = useRef(false);
  const lastActivity = useRef(0);
  const dictation = useRef<Dictation | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titledAt = useRef(0);
  const endRef = useRef<HTMLDivElement | null>(null);

  // ---- saving ----------------------------------------------------------------------------------

  const saveNow = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const n = noteRef.current;
    if (!n || isEmpty(n)) return;
    await store.saveNote(n);
    setUnsaved(!store.synced());
  }, [store]);

  const update = useCallback((change: (n: Note) => Note, opts: { text?: boolean } = {}) => {
    const before = noteRef.current;
    if (!before) return;
    const changed = change(before);
    if (changed === before) return;
    const next = { ...changed, updatedAt: new Date().toISOString() };
    noteRef.current = next;
    setNote(next);
    if (opts.text) setRereadSinceChange(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { saveNow(); }, 700);
  }, [saveNow]);

  const refreshLive = useCallback(() => {
    setSettling([inFlight.current ?? '', pending.current].join(' ').replace(/\s+/g, ' ').trim());
  }, []);

  // ---- punctuation and paragraphs ---------------------------------------------------------------

  // Take the words heard so far and add them to the page, punctuated and spaced. The result is
  // checked here as well as on the server: if a single word differs, the plain local formatting
  // is used instead.
  const flush = useCallback((): Promise<void> => {
    if (flushing.current) return flushing.current;
    const raw = pending.current.trim();
    const n = noteRef.current;
    if (!raw || !n) return Promise.resolve();
    pending.current = '';
    inFlight.current = raw;
    const joinable = !freshStart.current && !raw.includes('\n\n');
    freshStart.current = false;
    // A title is worked out while the user hasn't made it their own, as the note grows.
    const words = wordCount(noteText(n)) + wordCount(raw);
    const wantTitle = !n.titleEdited && words >= 8 && (!n.title || words - titledAt.current >= TITLE_EVERY_WORDS);
    const run = (async () => {
      let proposed: string[] = lightFormat(raw);
      let continues = false;
      let title = '';
      if (status.ai) {
        try {
          const r = await post<{ paragraphs: string[]; continues: boolean; title: string }>('format', {
            text: raw, before: n.paragraphs[n.paragraphs.length - 1] ?? '', noteSoFar: wantTitle ? noteText(n) : undefined, wantTitle,
          });
          proposed = r.paragraphs;
          continues = !!r.continues && joinable;
          title = r.title ?? '';
        } catch {
          // Offline or the AI is down: the words still go on the page, with plain spacing.
        }
      }
      const checked = acceptFormatting(raw, proposed);
      if (wantTitle) {
        titledAt.current = words;
        // With no AI title, the opening words stand in, but never replace a title already found.
        if (!title && !n.title) title = fallbackTitle([noteText(n), checked.paragraphs.join(' ')].join(' ').trim());
      }
      update((cur) => withInferredTitle(addSpeech(cur, raw, checked.paragraphs, checked.accepted && continues), title), { text: true });
    })().finally(() => {
      inFlight.current = null;
      flushing.current = null;
      refreshLive();
    });
    flushing.current = run;
    refreshLive();
    return run;
  }, [status.ai, update, refreshLive]);

  const flushAll = useCallback(async () => {
    for (let i = 0; i < 6 && (flushing.current || pending.current.trim()); i++) await flush();
  }, [flush]);

  // ---- listening -------------------------------------------------------------------------------

  const stopListening = useCallback(async () => {
    const d = dictation.current;
    dictation.current = null;
    listeningRef.current = false;
    setListening(false);
    setInterim('');
    if (d) await d.stop();
    await flushAll();
  }, [flushAll]);

  const startListening = useCallback(async () => {
    if (dictation.current) return;
    const engine = pickEngine(status.speech);
    if (!engine) {
      setNotice('This browser can’t listen. Type instead.');
      modeRef.current = 'type';
      setMode('type');
      setDraft(noteRef.current ? noteText(noteRef.current) : '');
      return;
    }
    if (engine === 'browser' && status.speech) setNotice('Using this browser’s built-in speech recognition.');
    const d = createDictation(engine, {
      onInterim: setInterim,
      onFinal(text: string, unclear: Unclear[]) {
        const piece = text.trim();
        if (!piece) return;
        // After a long pause the next words start a new paragraph instead of joining the last.
        if (pending.current) pending.current += (breakNext.current ? '\n\n' : ' ') + piece;
        else { pending.current = piece; freshStart.current = breakNext.current; }
        breakNext.current = false;
        if (unclear.length) update((n) => addUnclear(n, unclear));
        refreshLive();
        if (wordCount(pending.current) >= FLUSH_WORDS) flush();
      },
      onActivity() {
        lastActivity.current = Date.now();
        if (rereadRef.current) { rereadRef.current = false; setReread(false); }
      },
      onNotice: setNotice,
      onWaiting: setWaiting,
    });
    dictation.current = d;
    lastActivity.current = Date.now();
    const ok = await d.start();
    if (!ok) { dictation.current = null; return; }
    listeningRef.current = true;
    setListening(true);
  }, [status.speech, update, refreshLive, flush]);

  const enter = useCallback(async (next: Mode) => {
    if (next !== 'talk') await stopListening();
    rereadRef.current = false;
    setReread(false);
    if (next === 'type') {
      // Typing edits the original words; a chosen format steps aside first (and is kept).
      const n = noteRef.current;
      if (n?.layout) {
        await store.addVersion(snapshot(n, newId(), 'edit'));
        update((cur) => withLayout(cur, null));
      }
      setDraft(noteRef.current ? noteText(noteRef.current) : '');
    }
    modeRef.current = next;
    setMode(next);
    if (next === 'talk') { setNotice(''); await startListening(); }
    if (next === 'rest') await saveNow();
  }, [stopListening, startListening, saveNow, store, update]);

  // While talking: punctuate at each breath, and after a long pause bring the last few sentences
  // back into focus. No question appears; the coach waits until Suggestions is tapped.
  useEffect(() => {
    if (mode !== 'talk') return;
    const t = setInterval(() => {
      const silentMs = Date.now() - lastActivity.current;
      const n = noteRef.current;
      const hasText = !!n?.paragraphs.length || !!pending.current.trim() || !!inFlight.current;
      if (pending.current.trim() && silentMs >= FLUSH_AFTER_MS) flush();
      const reaction = pauseReaction({ mode: 'talk', listening: listeningRef.current, silentMs, hasText });
      if (reaction === 'reread' && !rereadRef.current) {
        rereadRef.current = true;
        breakNext.current = true;
        setReread(true);
        flush();
      }
    }, 400);
    return () => clearInterval(t);
  }, [mode, flush]);

  // Keep the newest words in view while talking.
  const paragraphCount = note?.paragraphs.length ?? 0;
  useEffect(() => {
    if (mode === 'talk') endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [mode, paragraphCount, reread]);

  // ---- loading and leaving ---------------------------------------------------------------------

  useEffect(() => {
    let live = true;
    Promise.all([store.note(id), store.folders()]).then(([found, f]) => {
      if (!live) return;
      setFolders(f);
      if (found) {
        noteRef.current = found;
        titledAt.current = wordCount(noteText(found));
        setNote(found);
        return;
      }
      if (!fresh) { setMissing(true); return; }
      const made = { ...newNote(id), folderId: f.some((x) => x.id === folder) ? folder : null };
      noteRef.current = made;
      setNote(made);
      // A new note starts listening straight away.
      modeRef.current = 'talk';
      setMode('talk');
      startListening();
    });
    return () => { live = false; };
    // Runs once for this note.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const onHide = () => { saveNow(); };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
      dictation.current?.stop();
      dictation.current = null;
      saveNow();
    };
  }, [saveNow]);

  const leave = async () => {
    await stopListening();
    await saveNow();
    router.push('/think');
  };

  const done = async () => {
    await enter('rest');
    if (noteRef.current && isEmpty(noteRef.current)) router.push('/think');
  };

  // ---- typing ----------------------------------------------------------------------------------

  const onType = (text: string) => {
    setDraft(text);
    update((n) => withTypedText(n, text), { text: true });
    // The title keeps up with typed notes too, by length rather than by pauses.
    const n = noteRef.current;
    if (!n || n.titleEdited) return;
    const words = wordCount(text);
    if (words < 12 || (n.title && words - titledAt.current < TITLE_EVERY_WORDS)) return;
    titledAt.current = words;
    if (!status.ai) { update((cur) => withInferredTitle(cur, fallbackTitle(text))); return; }
    post<{ title: string }>('title', { text })
      .then((r) => update((cur) => withInferredTitle(cur, r.title)))
      .catch(() => update((cur) => withInferredTitle(cur, fallbackTitle(text))));
  };

  // ---- formats ---------------------------------------------------------------------------------

  const chooseLayout = async (layout: Layout | null) => {
    const n = noteRef.current;
    if (!n) return;
    if ((n.layout?.label ?? null) !== (layout?.label ?? null)) {
      await store.addVersion(snapshot(n, newId(), layout ? 'reformat' : 'revert'));
      update((cur) => withLayout(cur, layout));
      await saveNow();
    }
    setPanel(null);
  };

  // Point at the user's own words: scroll to them and let them glow for a moment.
  const show = (quote: string, paragraph?: number) => {
    const n = noteRef.current;
    setPanel(null);
    if (!n) return;
    const shown = n.layout ? n.layout.blocks.map((b) => b.v) : n.paragraphs;
    const at = !n.layout && paragraph !== undefined ? paragraph : shown.findIndex((p) => containsWords(p, quote));
    if (at >= 0) setMark({ paragraph: at, quote, key: Date.now() });
  };

  useEffect(() => {
    if (!mark) return;
    document.getElementById(`dt-p-${mark.paragraph}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const t = setTimeout(() => setMark(null), 3400);
    return () => clearTimeout(t);
  }, [mark]);

  // ---- render ----------------------------------------------------------------------------------

  if (missing) {
    return (
      <main className="dt-screen dt-top items-start gap-4 px-7">
        <button aria-label="Back to library" onClick={() => router.push('/think')} className={`${iconButton} -ml-4`}><BackIcon /></button>
        <p className="serif m-0 text-[20px]">That note isn&rsquo;t here.</p>
      </main>
    );
  }
  if (!note) return <div className="dt-screen" aria-busy="true" />;

  const text = noteText(note);
  const folderName = folders.find((f) => f.id === note.folderId)?.name ?? 'Unsorted';
  const cached = coach && coach.text === text && !coach.data.quiet ? coach : null;
  const count = cached
    ? cached.data.prompts.length + cached.data.fixes.length + note.unclear.length + (cached.data.tip ? 1 : 0) + (cached.links?.length ?? 0)
    : note.unclear.length;
  const talking = mode === 'talk';
  const focus = talking && reread ? splitForReread(note.paragraphs, REREAD_SENTENCES) : null;
  const liveSettled = tail(settling, LIVE_LINE_WORDS);
  const liveNow = tail(interim, LIVE_LINE_WORDS);

  const paragraph = (p: string, i: number) => {
    const marked = mark?.paragraph === i;
    const at = marked ? p.toLowerCase().indexOf(mark.quote.toLowerCase()) : -1;
    return (
      <p key={marked ? `${i}-${mark.key}` : i} id={`dt-p-${i}`} className={`m-0 whitespace-pre-wrap ${marked && at < 0 ? 'dt-mark' : ''}`}>
        {marked && at >= 0
          ? <>{p.slice(0, at)}<mark key={mark.key} className="dt-mark bg-transparent text-inherit">{p.slice(at, at + mark.quote.length)}</mark>{p.slice(at + mark.quote.length)}</>
          : p}
      </p>
    );
  };

  return (
    <main className="dt-screen">
      {/* Top bar */}
      <div className="dt-top flex items-center gap-1 px-3">
        <button aria-label="Back to library" onClick={leave} className={iconButton}><BackIcon /></button>
        {mode === 'rest' ? (
          <>
            <span className="flex-1" />
            <button onClick={() => setPanel('reformat')} disabled={!note.paragraphs.length}
              className="flex h-11 items-center gap-[6px] rounded-[22px] border border-[var(--rule)] px-3 text-[14px] disabled:opacity-40">
              <LinesIcon />Reformat
            </button>
            <button onClick={() => setPanel('suggest')} disabled={!note.paragraphs.length}
              className="flex h-11 items-center gap-[6px] rounded-[22px] bg-[var(--accent-wash)] px-3 text-[14px] font-medium text-[var(--accent-deep)] disabled:opacity-40">
              <SparkIcon />Suggestions{count > 0 ? ` · ${count}` : ''}
            </button>
            <button aria-label="New note" onClick={() => router.push(`/think/note/${newId()}?new=1`)} className={iconButton}><NewNoteIcon /></button>
          </>
        ) : (
          <>
            <button onClick={() => setPanel('folder')} className="h-11 flex-1 text-center text-[13px] text-[var(--muted)]">{folderName}</button>
            {mode === 'type'
              ? <button onClick={done} className="h-11 w-11 shrink-0 text-[15px] font-semibold text-[var(--accent)]">Done</button>
              : <span className="h-11 w-11 shrink-0" />}
          </>
        )}
      </div>

      {/* The page */}
      <div className={`flex flex-col gap-[14px] px-7 pt-2 ${talking ? 'pb-[340px]' : 'pb-[150px]'}`}>
        <span className="text-[12px] text-[var(--muted)]">
          {longDate(note.createdAt)}
          {mode === 'rest' && <> &middot; <button onClick={() => setPanel('folder')} className="-my-3 py-3 underline decoration-[var(--rule)] underline-offset-2">{folderName}</button></>}
        </span>
        <label className="flex flex-col gap-1">
          <span className="sr-only">Title</span>
          <input
            value={note.title}
            onChange={(e) => update((n) => withUserTitle(n, e.target.value))}
            placeholder={mode === 'rest' ? 'Untitled' : ''}
            className={`serif w-full border-0 bg-transparent p-0 text-[28px] font-medium leading-[1.2] placeholder:text-[var(--faint)] ${note.titleEdited || mode === 'rest' ? 'text-[var(--ink)]' : 'text-[var(--faint)]'}`}
          />
          {mode !== 'rest' && !note.titleEdited && (
            <span className="flex items-center gap-[6px] text-[12px] text-[var(--accent)]">
              <SparkIcon size={12} stroke={2} />
              Title fills in as you {talking ? 'talk' : 'write'}{' \u00B7 '}tap to make it yours
            </span>
          )}
        </label>

        {mode === 'rest' && note.layout && (
          <div className="flex items-center gap-2 text-[12px]">
            <span className="font-semibold uppercase tracking-[0.8px] text-[var(--accent)]">{note.layout.label}</span>
            <button onClick={() => chooseLayout(null)} className="-my-3 py-3 text-[var(--muted)] underline decoration-[var(--rule)] underline-offset-2">Back to original</button>
          </div>
        )}

        {mode === 'type' ? (
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => onType(e.target.value)}
            placeholder="Write it as it comes."
            aria-label="Note"
            className="serif min-h-[52dvh] w-full resize-none border-0 bg-transparent p-0 text-[18px] leading-[1.6] text-[var(--body)] placeholder:text-[var(--faint)]"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
        ) : note.layout && mode === 'rest' ? (
          <div className="flex flex-col gap-[14px]">
            {note.layout.blocks.map((b, i) => (
              <div key={i} className="flex flex-col gap-1">
                {b.k && <span className="text-[12px] font-semibold uppercase tracking-[0.5px] text-[var(--muted)]">{b.k}</span>}
                <div className="serif text-[18px] leading-[1.6] text-[var(--body)]">{paragraph(b.v, i)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="dt-words serif flex flex-col gap-[14px] text-[18px] leading-[1.6] text-[var(--body)]"
            onClick={mode === 'rest' ? () => enter('type') : undefined}
          >
            {focus ? (
              <>
                {focus.before.map((p, i) => <p key={`b${i}`} className="m-0 text-[var(--faint)]">{p}</p>)}
                {focus.focus.map((p, i) => <p key={`f${i}`} className="m-0 text-[var(--ink)]">{p}</p>)}
              </>
            ) : note.paragraphs.map(paragraph)}
          </div>
        )}

        {mode === 'rest' && note.paragraphs.length > 0 && (
          <button onClick={() => setPanel('trail')} className="-mx-1 h-11 self-start px-1 text-[12px] text-[var(--muted)] underline decoration-[var(--rule)] underline-offset-2">What the app touched</button>
        )}
        {mode === 'rest' && unsaved && <Quiet>Saved on this device. It will sync when you&rsquo;re back online.</Quiet>}
        {mode !== 'talk' && notice && <Quiet>{notice}</Quiet>}
        <div ref={endRef} />
      </div>

      {/* Talking: the live transcript just above a breathing orb */}
      {talking && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex justify-center">
          <div
            className="dt-bottom flex w-full max-w-[480px] flex-col items-center justify-end gap-[26px] px-7 [--pb:40px] transition-[height] duration-500"
            style={{ height: reread ? 190 : 330, background: 'linear-gradient(to bottom, rgba(247,245,240,0), #F7F5F0 30%)' }}
          >
            <p aria-live="polite" className={`m-0 text-center text-[19px] leading-[1.45] transition-opacity duration-500 ${reread ? 'opacity-0' : 'opacity-100'}`}>
              {liveSettled || liveNow ? (
                <>
                  <span className="text-[var(--faint)]">{liveSettled}</span>{liveSettled && liveNow ? ' ' : ''}{liveNow}
                  <span className="dt-caret ml-[3px] inline-block h-5 w-[2px] bg-[var(--accent)] align-[-3px]" />
                </>
              ) : (
                <span className="text-[var(--faint)]">
                  {notice || (!listening ? 'Paused. Tap the orb to keep talking.' : waiting ? 'Writing that down…' : note.paragraphs.length ? 'Listening…' : 'Just talk. I’m listening.')}
                </span>
              )}
            </p>
            <div className="pointer-events-auto flex w-full items-center justify-between">
              <button aria-label="Switch to keyboard" onClick={() => enter('type')} className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[var(--rule)] bg-white">
                <KeyboardIcon />
              </button>
              <button aria-label={listening ? 'Pause listening' : 'Keep talking'} aria-pressed={listening} onClick={() => (listening ? stopListening() : startListening())}
                className={`flex h-[84px] w-[84px] items-center justify-center rounded-full ${listening ? '' : 'dt-orb-still'}`}>
                <Orb size={84} breathing={listening} swirl />
              </button>
              <button aria-label="Done" onClick={done} className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[var(--ink)] text-[var(--paper)]">
                <CheckIcon />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* At rest or typing: a small orb to keep talking */}
      {!talking && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex justify-center">
          <div className="dt-bottom flex w-full max-w-[480px] justify-center [--pb:40px]">
            <button aria-label="Keep talking" onClick={() => enter('talk')} className="pointer-events-auto h-[60px] w-[60px] rounded-full shadow-[0_6px_18px_rgba(122,78,36,0.3)]">
              <Orb size={60} breathing={false} />
            </button>
          </div>
        </div>
      )}

      {panel === 'suggest' && (
        <SuggestionsSheet
          note={note}
          goals={profile?.goals ?? []}
          ai={status.ai}
          cache={coach && coach.text === text ? coach : null}
          rereadSinceChange={rereadSinceChange}
          onCache={(c) => {
            setCoach(c);
            if (c.data.perspective && c.data.perspective !== note.perspective) update((n) => ({ ...n, perspective: c.data.perspective }));
          }}
          onClose={() => setPanel(null)}
          onKeepGoing={() => { setPanel(null); enter('talk'); }}
          onShow={show}
          onReadOver={() => { setPanel(null); setRereadSinceChange(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          onReformat={() => setPanel('reformat')}
        />
      )}

      {panel === 'reformat' && <ReformatView note={note} onClose={() => setPanel(null)} onUse={chooseLayout} />}

      {panel === 'folder' && (
        <Sheet title="Folder" onClose={() => setPanel(null)}>
          <div className="flex flex-col pb-2">
            {[{ id: null as string | null, name: 'Unsorted' }, ...folders].map((f) => (
              <button key={f.id ?? 'none'} onClick={() => { update((n) => ({ ...n, folderId: f.id })); setPanel(null); }}
                className="flex h-12 items-center justify-between border-b border-[var(--line)] text-left text-[16px]">
                {f.name}{note.folderId === f.id && <span className="text-[var(--accent)]"><CheckIcon size={18} /></span>}
              </button>
            ))}
            <button
              onClick={async () => {
                if (!window.confirm('Delete this note for good?')) return;
                await stopListening();
                noteRef.current = null;
                await store.deleteNote(note.id).catch(() => {});
                router.push('/think');
              }}
              className="mt-4 h-12 text-left text-[15px] text-[#9A3B2A]">Delete this note</button>
          </div>
        </Sheet>
      )}

      {panel === 'trail' && (
        <Sheet title="What the app touched" onClose={() => setPanel(null)}>
          <div className="flex flex-col gap-4 pb-2 text-[15px] leading-[1.5]">
            <p className="serif m-0 text-[19px] leading-[1.5]">No ideas, sentences or words were added. You did this.</p>
            <ul className="m-0 flex list-none flex-col p-0">
              {[
                ['Punctuation marks added', note.trail.punctuation],
                ['Paragraph breaks added', Math.max(0, note.trail.paragraphs - 1)],
                ['Unclear words raised as questions', note.trail.flagged],
              ].map(([label, n]) => (
                <li key={label} className="flex justify-between border-b border-[var(--line)] py-3"><span>{label}</span><span className="font-semibold">{n}</span></li>
              ))}
              <li className="flex justify-between py-3"><span>Arrangement</span><span className="font-semibold">{note.layout ? note.layout.label : 'Original'}</span></li>
            </ul>
            <Quiet>
              Every formatting pass is checked word for word against what you said; if anything differs, it is thrown away.
              {note.layout ? ' The current arrangement uses only your own sentences, and your original is one tap away.' : ''}
              {' '}Anything you typed is left exactly as you typed it.
            </Quiet>
          </div>
        </Sheet>
      )}
    </main>
  );
}

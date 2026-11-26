'use client';

// The exercises. Each one reports a result once; the lesson shows the feedback and moves on.
// Typing steps keep their words near the top of the card, so the phone keyboard never hides them.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Item, Track } from '@/heir/types';
import type { Step } from '@/heir/lesson';
import { unitText } from '@/heir/lesson';
import { getCollection, getItem, isVerse, itemLabel, itemNoun } from '@/heir/content';
import { useHeir } from './provider';
import { activeMember } from '@/heir/household';
import { speechHints } from '@/heir/speech';
import { canRecord, cloudSpeechBroken, markCloudSpeechBroken, startRecording, transcribe, type Recording } from './cloud-speech';
import { checkOrder, closeWord, firstLetter, gradeSpoken, NEARLY, SPOKEN_PASS, TYPED_PASS, wordMatches } from '@/heir/grade';

// `slip`: right, but not cleanly (a spelling slip, a missed word), so the praise should be quieter.
// `missedAt`: positions (0-based) of the words missed or shown, in the step's text. Kept with the answer, never what was typed.
export interface Outcome { ok: boolean; close?: boolean; slip?: boolean; hints?: number; misses?: number; missedAt?: number[]; note?: string; reveal?: ReactNode }
export type Report = (o: Outcome) => void;

// Splits "God," into the word to type and the punctuation around it.
const parts = (token: string) => {
  const m = token.match(/^([“‘"'(]*)(.*?)([.,;:!?”’")]*)$/);
  return { before: m?.[1] ?? '', core: m?.[2] ?? token, after: m?.[3] ?? '' };
};
const quoteList = (list: string[]) => list.map((w) => `“${parts(w).core}”`).join(', ');
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

// The words that come before the part being practiced: plain, bold, the start of the sentence.
const Lead = ({ text }: { text: string }) => (text ? <strong className="hr-lead">{text} </strong> : null);
const Answer = ({ lead, text }: { lead?: string; text: string }) => <p className="hr-say-text" style={{ fontSize: 19 }}><Lead text={lead ?? ''} />{text}</p>;

// The lesson's buttons live in one place: a bar fixed to the bottom of the screen (above the keyboard while typing),
// so there's only ever one main button, always in the same spot. Feedback replaces the bar with its own Continue.
export function Dock({ children, row }: { children: ReactNode; row?: boolean }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => { Promise.resolve().then(() => setEl(document.getElementById('hr-dock'))); }, []);
  return el ? createPortal(<div className={`hr-dock-in${row ? ' row' : ''}`}>{children}</div>, el) : null;
}

// What comes before the part being practiced (the verse or answer up to the lead-in), quiet, so a later phrase is
// learned in its place. Long openings fade at the top; the words nearest the phrase stay readable.
export function Context({ text }: { text: string }) {
  if (!text) return null;
  return <p className={`hr-context${text.length > 150 ? ' long' : ''}`} aria-label="Earlier in the passage">{text}</p>;
}

export function Cue({ item, step, title, tag }: { item: Item; step: Step; title: string; tag?: string | null }) {
  // A verse's prompt is its reference, already shown large below, so the label names the course instead.
  const label = isVerse(item) ? title.replace(item.prompt, getCollection(item.collection)?.title ?? '') : title;
  return (
    <div className="hr-cue">
      <span className="hr-label" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {tag !== undefined ? tag && <span className="hr-tag">{tag}</span> : step.review && <span className="hr-tag">Review</span>}
        {label}
      </span>
      <p className="serif" style={{ margin: 0, fontSize: 25, lineHeight: 1.3, fontWeight: 500 }}>{item.prompt}</p>
    </div>
  );
}

export function Intro({ item, track, step, onNext }: { item: Item; track: Track; step: Extract<Step, { kind: 'intro' }>; onNext(): void }) {
  const u = step.unit;
  const c = item.chunks[track];
  const before = c.slice(0, u.start).join(' ');
  const { text } = unitText(item, track, u);
  const after = c.slice(u.end).join(' ');
  return (
    <>
      <div className="hr-cue">
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="hr-new">{u.part > 1 ? 'Next part' : isVerse(item) ? `New ${itemNoun(item, 1)}` : 'New question'}</span>
          <span className="hr-label">{isVerse(item) ? getCollection(item.collection)?.title : itemLabel(item)}{u.of > 1 ? ` · Part ${u.part} of ${u.of}` : ''}</span>
        </span>
        <p className="serif" style={{ margin: 0, fontSize: 24, lineHeight: 1.3, fontWeight: 600 }}>{item.prompt}</p>
      </div>
      <p className="hr-say-text">
        {before && <span style={{ color: 'var(--muted)', opacity: 0.6 }}>{before} </span>}
        <span>{text}</span>
        {after && <span style={{ color: 'var(--muted)', opacity: 0.6 }}> {after}</span>}
      </p>
      <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)' }}>
        {u.of > 1 ? 'This lesson covers the darker words. ' : ''}Read it aloud once, slowly.
      </p>
      <Dock><button type="button" className="hr-btn" onClick={onNext}>Continue</button></Dock>
    </>
  );
}

export function Order({ step, onReport }: { step: Extract<Step, { kind: 'order' }>; onReport: Report }) {
  const [picked, setPicked] = useState<number[]>([]);
  const answer = step.tiles.join(' ');
  const check = () => {
    const r = checkOrder(picked.map((i) => step.bank[i]), step.tiles);
    const note = r.ok ? undefined
      : r.extra.length ? `${quoteList(r.extra)} ${plural(r.extra.length, 'isn’t', 'aren’t')} part of this answer.`
      : r.missing.length ? `${r.missing.length} ${plural(r.missing.length, step.pieces ? 'phrase is' : 'word is', step.pieces ? 'phrases are' : 'words are')} missing.`
      : `${r.outOfPlace} ${plural(r.outOfPlace, step.pieces ? 'phrase is' : 'word is', step.pieces ? 'phrases are' : 'words are')} out of order.`;
    onReport({ ok: r.ok, close: r.close, note, reveal: <Answer lead={step.lead} text={answer} /> });
  };
  const tileClass = `hr-tile${step.pieces ? ' piece' : ''}`;
  // The answer keeps one place per tile from the start, and a placed tile leaves a dashed gap in the bank, so nothing
  // shifts as you go: what's left to place is solid, what's placed is in the answer, and gaps show where tiles were.
  const bankRef = useRef<HTMLDivElement>(null);
  const [answerHeight, setAnswerHeight] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (step.pieces || !bankRef.current) return;
    const h = bankRef.current.getBoundingClientRect().height;
    Promise.resolve().then(() => setAnswerHeight(Math.max(112, h + 24)));
  }, [step.pieces, step.bank]);
  return (
    <>
      <p className="hr-instruction">{step.pieces ? 'Put the phrases in order' : 'Put the words in order'}</p>
      <div className={`hr-answer${step.pieces ? ' pieces' : ''}`} aria-label="Your answer" style={answerHeight ? { minHeight: answerHeight } : undefined}>
        {step.lead && <span className="hr-lead" style={{ alignSelf: step.pieces ? 'flex-start' : 'center' }}>{step.lead}</span>}
        {picked.map((i, at) => (
          <button key={`${i}-${at}`} type="button" className={`${tileClass} placed`} onClick={() => setPicked((p) => p.filter((_, k) => k !== at))} aria-label={`${step.bank[i]} (tap to take back)`}>{step.bank[i]}</button>
        ))}
        {(step.pieces || step.slots) && step.tiles.slice(picked.length).map((t, k) => (
          step.pieces
            ? <span key={`slot-${k}`} className="hr-slot piece" aria-hidden="true" />
            : <span key={`slot-${k}`} className="hr-slot" aria-hidden="true" style={{ width: `${Math.max(3, t.length) + 2.2}ch` }} />
        ))}
      </div>
      <div ref={bankRef} className={`hr-bank${step.pieces ? ' pieces' : ''}`} aria-label="Word bank">
        {step.bank.map((t, i) => {
          const used = picked.includes(i);
          return <button key={i} type="button" className={tileClass} data-used={used} disabled={used} aria-hidden={used} onClick={() => setPicked((p) => [...p, i])}>{t}</button>;
        })}
      </div>
      <Dock><button type="button" className="hr-btn" disabled={!picked.length} onClick={check}>Check</button></Dock>
    </>
  );
}

// Answer options. Picking one answers at once, then shows which was right: green with a tick for the right answer,
// red with a cross for a wrong pick. Before that, nothing is coloured, so a pick never looks like a mistake.
function Choices({ options, answer, onPick, serif }: { options: string[]; answer: string; onPick(o: string): void; serif?: boolean }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const stateOf = (o: string) => (!chosen ? undefined : o === answer ? 'right' : o === chosen ? 'wrong' : 'other');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {options.map((o) => (
        <button key={o} type="button" className="hr-choice" data-state={stateOf(o)} aria-pressed={chosen === o} disabled={!!chosen}
          style={{ textAlign: 'left', ...(serif ? { fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: 18 } : {}) }}
          onClick={() => { setChosen(o); onPick(o); }}>
          <span style={{ flex: 1 }}>{o}</span>
          {stateOf(o) === 'right' && <span className="hr-choice-mark" aria-label="Right">✓</span>}
          {stateOf(o) === 'wrong' && <span className="hr-choice-mark" aria-label="Not this one">✕</span>}
        </button>
      ))}
    </div>
  );
}

export function Meaning({ step, onReport }: { step: Extract<Step, { kind: 'meaning' }>; onReport: Report }) {
  const q = step.question;
  return (
    <>
      <p className="serif" style={{ margin: 0, fontSize: 22, lineHeight: 1.35, fontWeight: 600 }}>{q.question}</p>
      <Choices options={step.options} answer={q.answer} onPick={(o) => onReport({ ok: o === q.answer, note: o === q.answer ? undefined : `The answer: ${q.answer}.`, reveal: <p style={{ margin: 0, lineHeight: 1.5 }}>{q.explain}</p> })} />
    </>
  );
}

export function Next({ step, onReport }: { step: Extract<Step, { kind: 'next' }>; onReport: Report }) {
  return (
    <>
      <p className="hr-instruction">What comes next?</p>
      <p className="hr-passage"><Lead text={step.lead} /><span className="hr-hidden-word next" style={{ width: '3em' }} /></p>
      <Choices serif options={step.options} answer={step.answer} onPick={(o) => onReport({ ok: o === step.answer, reveal: <Answer lead={step.lead} text={step.answer} /> })} />
    </>
  );
}

export function Match({ step, onReport }: { step: Extract<Step, { kind: 'match' }>; onReport: Report }) {
  const item = getItem(step.itemId);
  const verse = item ? isVerse(item) : false;
  return (
    <>
      <span className="hr-label">{verse ? 'Which verse is this?' : 'Which question does this answer?'}</span>
      <p className="hr-say-text">{step.text}</p>
      <Choices options={step.options} answer={step.answer} onPick={(o) => onReport({ ok: o === step.answer, note: o === step.answer ? undefined : verse ? `It’s ${step.answer}.` : `It answers: ${step.answer}` })} />
    </>
  );
}

export function Spot({ step, onReport }: { step: Extract<Step, { kind: 'spot' }>; onReport: Report }) {
  const tokens = step.text.split(' ');
  const [tapped, setTapped] = useState<number | null>(null);
  const wrong = parts(tokens[step.wrongIndex]).core, right = parts(step.rightWord).core;
  const reveal = <p className="hr-say-text" style={{ fontSize: 19 }}>{step.correctText.split(' ').map((t, i) => <span key={i}>{i === step.wrongIndex ? <strong>{t}</strong> : t}{' '}</span>)}</p>;
  return (
    <>
      <p className="hr-instruction">One word is wrong. Tap it.</p>
      <p className="hr-passage">
        {tokens.map((t, i) => (
          <span key={i}>
            <button type="button" className="hr-word" aria-pressed={tapped === i} data-state={tapped === null ? undefined : i === step.wrongIndex ? 'right' : tapped === i ? 'wrong' : undefined} disabled={tapped !== null}
              onClick={() => { setTapped(i); onReport({ ok: i === step.wrongIndex, note: `“${wrong}” should be “${right}”.`, reveal }); }}>{t}</button>{' '}
          </span>
        ))}
      </p>
    </>
  );
}

export function Blanks({ step, onReport }: { step: Extract<Step, { kind: 'blanks' }>; onReport: Report }) {
  const tokens = step.text.split(' ');
  const [values, setValues] = useState<Record<number, string>>({});
  const [hints, setHints] = useState(0);
  const refs = useRef<Record<number, HTMLInputElement | null>>({});
  useEffect(() => { refs.current[step.blanks[0]]?.focus({ preventScroll: true }); }, [step.blanks]);

  const check = () => {
    const right = step.blanks.filter((i) => wordMatches(values[i] ?? '', parts(tokens[i]).core));
    const near = step.blanks.filter((i) => closeWord(values[i] ?? '', parts(tokens[i]).core));
    const missed = step.blanks.filter((i) => !right.includes(i) && !near.includes(i));
    const reveal = <p className="hr-say-text" style={{ fontSize: 19 }}><Lead text={step.lead} />{tokens.map((t, i) => <span key={i}>{step.blanks.includes(i) ? <strong>{t}</strong> : t}{' '}</span>)}</p>;
    if (!missed.length) {
      onReport({ ok: true, slip: near.length > 0, hints, misses: 0, missedAt: [], note: near.length ? `Check the spelling: ${quoteList(near.map((i) => tokens[i]))}.` : undefined, reveal: near.length ? reveal : undefined });
      return;
    }
    onReport({ ok: false, hints, misses: missed.length, missedAt: missed, close: missed.length === 1 && step.blanks.length > 1, note: `${plural(missed.length, 'The missing word was', 'The missing words were')} ${quoteList(missed.map((i) => tokens[i]))}.`, reveal });
  };
  const hint = () => {
    setHints((h) => h + 1);
    setValues((v) => {
      const next = { ...v };
      for (const i of step.blanks) {
        const core = parts(tokens[i]).core;
        if (!wordMatches(v[i] ?? '', core)) next[i] = core.slice(0, Math.min(core.length - 1, (v[i]?.length ?? 0) + 1) || 1);
      }
      return next;
    });
  };
  return (
    <>
      <p className="hr-instruction">Fill in the missing words</p>
      <p className="hr-passage">
        <Lead text={step.lead} />
        {tokens.map((t, i) => {
          if (!step.blanks.includes(i)) return <span key={i}>{t} </span>;
          const { before, core, after } = parts(t);
          const at = step.blanks.indexOf(i);
          return (
            <span key={i}>{before}
              <input type="text" className="hr-blank" name={`heir-blank-${at}`} aria-label={`Missing word ${at + 1}`} autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
                enterKeyHint={at === step.blanks.length - 1 ? 'done' : 'next'}
                ref={(el) => { refs.current[i] = el; }} style={{ width: `${Math.max(3, core.length) + 1.5}ch` }}
                value={values[i] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [i]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  const nextI = step.blanks[at + 1];
                  if (nextI !== undefined) refs.current[nextI]?.focus(); else check();
                }} />
              {after}{' '}
            </span>
          );
        })}
      </p>
      <Dock row>
        <button type="button" className="hr-btn" style={{ background: 'var(--well)', color: 'var(--ink)', flex: 1 }} onClick={hint}>Hint</button>
        <button type="button" className="hr-btn" style={{ flex: 2 }} onClick={check} disabled={step.blanks.some((i) => !(values[i] ?? '').trim())}>Check</button>
      </Dock>
    </>
  );
}

// The keyboard target sits on top of the words (invisible), so the words stay in view while typing.
export function Letters({ step, onReport }: { step: Extract<Step, { kind: 'letters' }>; onReport: Report }) {
  const tokens = step.text.split(' ');
  const [shown, setShown] = useState(0);
  const [misses, setMisses] = useState(0);
  const [hints, setHints] = useState(0);
  const [shake, setShake] = useState(0);
  // Where the wrong letters and shown words were, in the text.
  const slips = useRef<number[]>([]);
  const [focused, setFocused] = useState(false);
  const reported = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus({ preventScroll: true }); }, []);

  const finish = (m: number, h: number) => {
    if (reported.current) return;
    reported.current = true;
    const allowed = Math.max(1, Math.floor(tokens.length / 10));
    const ok = m + h <= allowed;
    onReport({ ok, slip: ok && m + h > 0, close: !ok && m + h <= allowed + 2, hints: h, misses: m, missedAt: [...new Set(slips.current)].sort((a, b) => a - b), note: m ? `${m} wrong ${plural(m, 'letter', 'letters')}${h ? `, ${h} ${plural(h, 'word', 'words')} shown` : ''}.` : h ? `${h} ${plural(h, 'word', 'words')} shown.` : undefined, reveal: m || h ? <Answer lead={step.lead} text={step.text} /> : undefined });
  };
  const advance = (m: number, h: number) => {
    const n = shown + 1;
    setShown(n);
    if (n >= tokens.length) { input.current?.blur(); finish(m, h); }
  };
  const press = (ch: string) => {
    if (shown >= tokens.length) return;
    if (ch.toLowerCase() === firstLetter(tokens[shown])) advance(misses, hints);
    else { slips.current.push(shown); setMisses(misses + 1); setShake((s) => s + 1); }
  };
  return (
    <>
      <p className="hr-instruction">Type the first letter of each word</p>
      <div style={{ position: 'relative' }} onClick={() => input.current?.focus()}>
        <p key={shake} className={`hr-passage${shake ? ' hr-shake' : ''}`} aria-live="polite">
          <Lead text={step.lead} />
          {tokens.map((t, i) => i < shown
            ? <span key={i}>{t} </span>
            : <span key={i}><span className={`hr-hidden-word${i === shown ? ' next' : ''}`} style={{ width: `${Math.max(2, parts(t).core.length) * 0.55}em` }} />{' '}</span>)}
        </p>
        <input ref={input} type="text" className="hr-ghost-input" name="heir-letters" aria-label="Type the first letter of the next word"
          autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} inputMode="text"
          value="" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onChange={(e) => { const ch = e.target.value.slice(-1); if (ch.trim()) press(ch); }} />
      </div>
      {!focused && shown < tokens.length && <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)' }}>Tap the words to bring up the keyboard.</p>}
      <button type="button" className="hr-btn quiet" disabled={shown >= tokens.length}
        onPointerDown={(e) => e.preventDefault()} onClick={() => { slips.current.push(shown); setHints(hints + 1); advance(misses, hints + 1); }}>Show the next word</button>
    </>
  );
}

function Heard({ lead, text, heard, moved }: { lead?: string; text: string; heard: boolean[]; moved: boolean[] }) {
  const tokens = text.split(' ');
  return <p className="hr-say-text" style={{ fontSize: 19 }}><Lead text={lead ?? ''} />{tokens.map((t, i) => <span key={i} className={heard[i] ? 'hr-heard' : moved[i] ? 'hr-moved' : 'hr-missed'}>{t}{' '}</span>)}</p>;
}

function scored(text: string, lead: string, said: string, pass: number, verb: string): Outcome {
  const r = gradeSpoken(text, said);
  const tokens = text.split(' ');
  const moved = tokens.filter((_, i) => r.moved[i]);
  const missing = r.heard.filter((h, i) => !h && !r.moved[i]).length;
  const notes: string[] = [];
  if (moved.length === 2) notes.push(`You swapped ${quoteList(moved).replace(', ', ' and ')}.`);
  else if (moved.length) notes.push(`${quoteList(moved)} ${plural(moved.length, 'was', 'were')} in a different place.`);
  if (missing) notes.push(`${missing} ${plural(missing, 'word', 'words')} ${verb}${moved.length ? '' : '. They’re underlined'}.`);
  return {
    ok: r.score >= pass,
    misses: missing + moved.length,
    missedAt: tokens.map((_, i) => i).filter((i) => !r.heard[i]),
    slip: r.score >= pass && notes.length > 0,
    close: r.score < pass && r.score >= NEARLY,
    note: notes.join(' ') || undefined,
    reveal: notes.length ? <Heard lead={lead} text={text} heard={r.heard} moved={r.moved} /> : undefined,
  };
}

const ContinueFrom = ({ lead }: { lead: string }) => lead
  ? <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)' }}>Start after <span className="hr-lead" style={{ fontSize: 18, color: 'var(--ink)' }}>{lead}</span></p>
  : null;

export function Type({ step, onReport }: { step: Extract<Step, { kind: 'type' }>; onReport: Report }) {
  const [value, setValue] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { area.current?.focus({ preventScroll: true }); }, []);
  return (
    <>
      <p className="hr-instruction">Type it from memory</p>
      <ContinueFrom lead={step.lead} />
      <textarea ref={area} className="hr-typed" name="heir-typed" rows={3} placeholder="Your answer" autoCapitalize="sentences" autoCorrect="off" autoComplete="off" spellCheck={false}
        aria-label="Your answer" value={value} onChange={(e) => { setValue(e.target.value); document.getElementById('hr-dock')?.scrollIntoView({ block: 'nearest' }); }} />
      <Dock><button type="button" className="hr-btn" disabled={!value.trim()} onClick={() => onReport(scored(step.text, step.lead, value, TYPED_PASS, 'missing or misspelled'))}>Check</button></Dock>
    </>
  );
}

interface Recognition {
  continuous: boolean; interimResults: boolean; lang: string;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
const recognizer = (): (new () => Recognition) | undefined => {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

export function Say({ step, onReport, onCantSpeak }: { step: Extract<Step, { kind: 'say' }>; onReport: Report; onCantSpeak(): void }) {
  // A signed-in adult is heard by ElevenLabs Scribe (rare words as hints). Children, signed-out use, browsers that can't
  // record and any failed upload use the browser's own recognizer; a child's voice never leaves the device.
  const { household, accounts, email } = useHeir();
  const adult = activeMember(household)?.track === 'adult';
  const [useCloud, setUseCloud] = useState(() => !!(accounts && email) && adult && canRecord() && !cloudSpeechBroken());
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState('');
  const recording = useRef<Recording | null>(null);
  const [mode, setMode] = useState<'mic' | 'self'>(() => (recognizer() || (!!(accounts && email) && adult && canRecord() && !cloudSpeechBroken()) ? 'mic' : 'self'));
  const [listening, setListening] = useState(false);
  const [said, setSaid] = useState('');
  const [revealed, setRevealed] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const finals = useRef('');
  const done = useRef(false);
  useEffect(() => () => { rec.current?.abort(); recording.current?.cancel(); }, []);

  const grade = () => {
    if (done.current) return;
    const text = finals.current.trim();
    if (!text) return;
    done.current = true;
    onReport(scored(step.text, step.lead, text, SPOKEN_PASS, 'weren’t heard'));
  };
  const startBrowser = () => {
    const Ctor = recognizer();
    if (!Ctor) { setMode('self'); return; }
    const r = new Ctor();
    r.continuous = true; r.interimResults = true; r.lang = 'en-US';
    finals.current = '';
    r.onresult = (e) => {
      let fin = '', live = '';
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) fin += `${res[0].transcript} `; else live += `${res[0].transcript} `;
      }
      finals.current = `${fin}${live}`;
      setSaid(`${fin}${live}`);
    };
    // A refused (or missing) microphone is the same as "Can't speak now": every later speaking step this session becomes typing.
    r.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') onCantSpeak(); };
    r.onend = () => { setListening(false); grade(); };
    rec.current = r;
    try { r.start(); setListening(true); } catch { setMode('self'); }
  };
  const stopCloud = async () => {
    const r = recording.current;
    if (!r) return;
    recording.current = null;
    setListening(false); setChecking(true);
    const audio = await r.stop();
    const text = await transcribe(audio, speechHints(step.text));
    setChecking(false);
    if (text === null) {
      // Couldn't check it: try the browser's recognizer from here on.
      markCloudSpeechBroken(); setUseCloud(false);
      setNotice('Couldn’t check that. Tap and say it again.');
      if (!recognizer()) setMode('self');
      return;
    }
    if (!text.trim()) { setNotice('I didn’t catch anything. Tap and say it again.'); return; }
    finals.current = text; setSaid(text); grade();
  };
  const startCloud = async () => {
    setNotice(''); setSaid('');
    try { recording.current = await startRecording(() => { void stopCloud(); }); setListening(true); }
    catch (e) {
      if (e instanceof DOMException && ['NotAllowedError', 'SecurityError', 'NotFoundError'].includes(e.name)) { onCantSpeak(); return; }
      setUseCloud(false); if (recognizer()) startBrowser(); else setMode('self');
    }
  };
  const start = () => (useCloud ? void startCloud() : startBrowser());
  const stop = () => (useCloud ? void stopCloud() : rec.current?.stop());

  return (
    <>
      <p className="hr-instruction">Say it from memory</p>
      <ContinueFrom lead={step.lead} />
      {mode === 'mic' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center' }}>
          <button type="button" className="hr-mic" data-on={listening} disabled={checking} aria-label={listening ? 'Stop and check' : 'Start speaking'} onClick={listening ? stop : start}>
            {listening
              ? <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
              : <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>}
          </button>
          <span style={{ fontSize: 15, color: 'var(--muted)' }}>{checking ? 'Checking what you said…' : listening ? 'Listening. Tap again when you’re done.' : notice || 'Tap, then say the answer.'}</span>
          {said && <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5, color: 'var(--muted)' }}>{said}</p>}
        </div>
      ) : !revealed ? (
        <>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5 }}>Say it aloud without looking. Then check yourself.</p>
          <Dock><button type="button" className="hr-btn" onClick={() => setRevealed(true)}>Show the words</button></Dock>
        </>
      ) : (
        <>
          <Answer lead={step.lead} text={step.text} />
          <Dock row>
            <button type="button" className="hr-btn" style={{ background: 'var(--well)', color: 'var(--ink)', flex: 1 }} onClick={() => onReport({ ok: false })}>I missed some</button>
            <button type="button" className="hr-btn" style={{ flex: 1 }} onClick={() => onReport({ ok: true })}>I said it all</button>
          </Dock>
        </>
      )}
      <button type="button" className="hr-btn quiet" style={{ marginTop: 'auto' }} onClick={() => { rec.current?.abort(); recording.current?.cancel(); onCantSpeak(); }}>Can’t speak now, type it</button>
    </>
  );
}

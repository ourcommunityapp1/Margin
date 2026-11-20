'use client';

// The exercises. Each one reports a result once; the lesson shows the feedback and moves on.
// Typing steps keep their words near the top of the card, so the phone keyboard never hides them.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Item, Track } from '@/heir/types';
import type { Step } from '@/heir/lesson';
import { unitText } from '@/heir/lesson';
import { itemLabel } from '@/heir/content';
import { checkOrder, closeWord, firstLetter, gradeSpoken, NEARLY, SPOKEN_PASS, TYPED_PASS, wordMatches } from '@/heir/grade';

export interface Outcome { ok: boolean; close?: boolean; hints?: number; note?: string; reveal?: ReactNode }
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

export function Cue({ item, step, title }: { item: Item; step: Step; title: string }) {
  return (
    <div className="hr-cue">
      <span className="hr-label" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {step.review && <span className="hr-tag">Review</span>}
        {title}
      </span>
      <p className="serif" style={{ margin: 0, fontSize: 20, lineHeight: 1.35, fontWeight: 600 }}>{item.prompt}</p>
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
        <span className="hr-label">New · {itemLabel(item)}{u.of > 1 ? ` · Part ${u.part} of ${u.of}` : ''}</span>
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
      <button type="button" className="hr-btn" style={{ marginTop: 'auto' }} onClick={onNext}>Continue</button>
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
      : `${r.outOfPlace} ${plural(r.outOfPlace, step.pieces ? 'phrase is' : 'word is', step.pieces ? 'phrases are' : 'words are')} out of order.`;
    onReport({ ok: r.ok, close: r.close, note, reveal: <Answer lead={step.lead} text={answer} /> });
  };
  const tileClass = `hr-tile${step.pieces ? ' piece' : ''}`;
  return (
    <>
      <p style={{ margin: 0, fontWeight: 600 }}>{step.pieces ? 'Put the phrases in order' : 'Put the words in order'}</p>
      <div className="hr-answer" aria-label="Your answer" style={step.pieces ? { flexDirection: 'column', flexWrap: 'nowrap' } : undefined}>
        {step.lead && <span className="hr-lead" style={{ alignSelf: step.pieces ? 'flex-start' : 'center' }}>{step.lead}</span>}
        {picked.map((i, at) => (
          <button key={`${i}-${at}`} type="button" className={tileClass} onClick={() => setPicked((p) => p.filter((_, k) => k !== at))}>{step.bank[i]}</button>
        ))}
      </div>
      <div className="hr-bank" aria-label="Word bank" style={step.pieces ? { flexDirection: 'column', alignItems: 'stretch' } : undefined}>
        {step.bank.map((t, i) => {
          const used = picked.includes(i);
          return <button key={i} type="button" className={tileClass} data-used={used} disabled={used} aria-hidden={used} onClick={() => setPicked((p) => [...p, i])}>{t}</button>;
        })}
      </div>
      <button type="button" className="hr-btn" style={{ marginTop: 'auto' }} disabled={picked.length !== step.tiles.length} onClick={check}>Check</button>
    </>
  );
}

function Choices({ options, onPick, serif }: { options: string[]; onPick(o: string): void; serif?: boolean }) {
  const [chosen, setChosen] = useState<string | null>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {options.map((o) => (
        <button key={o} type="button" className="hr-choice" aria-pressed={chosen === o} disabled={!!chosen}
          style={{ textAlign: 'left', ...(serif ? { fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: 18 } : {}) }}
          onClick={() => { setChosen(o); onPick(o); }}>{o}</button>
      ))}
    </div>
  );
}

export function Meaning({ step, onReport }: { step: Extract<Step, { kind: 'meaning' }>; onReport: Report }) {
  const q = step.question;
  return (
    <>
      <p className="serif" style={{ margin: 0, fontSize: 22, lineHeight: 1.35, fontWeight: 600 }}>{q.question}</p>
      <Choices options={step.options} onPick={(o) => onReport({ ok: o === q.answer, note: o === q.answer ? undefined : `The answer: ${q.answer}.`, reveal: <p style={{ margin: 0, lineHeight: 1.5 }}>{q.explain}</p> })} />
    </>
  );
}

export function Next({ step, onReport }: { step: Extract<Step, { kind: 'next' }>; onReport: Report }) {
  return (
    <>
      <p style={{ margin: 0, fontWeight: 600 }}>What comes next?</p>
      <p className="hr-passage"><Lead text={step.lead} /><span className="hr-hidden-word next" style={{ width: '3em' }} /></p>
      <Choices serif options={step.options} onPick={(o) => onReport({ ok: o === step.answer, reveal: <Answer lead={step.lead} text={step.answer} /> })} />
    </>
  );
}

export function Match({ step, onReport }: { step: Extract<Step, { kind: 'match' }>; onReport: Report }) {
  return (
    <>
      <span className="hr-label">Which question does this answer?</span>
      <p className="hr-say-text">{step.text}</p>
      <Choices options={step.options} onPick={(o) => onReport({ ok: o === step.answer, note: o === step.answer ? undefined : `It answers: ${step.answer}` })} />
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
      <p style={{ margin: 0, fontWeight: 600 }}>One word is wrong. Tap it.</p>
      <p className="hr-passage">
        {tokens.map((t, i) => (
          <span key={i}>
            <button type="button" className="hr-word" aria-pressed={tapped === i} disabled={tapped !== null}
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
      onReport({ ok: true, hints, note: near.length ? `Check the spelling: ${quoteList(near.map((i) => tokens[i]))}.` : undefined, reveal: near.length ? reveal : undefined });
      return;
    }
    onReport({ ok: false, hints, close: missed.length === 1 && step.blanks.length > 1, note: `${plural(missed.length, 'The missing word was', 'The missing words were')} ${quoteList(missed.map((i) => tokens[i]))}.`, reveal });
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
      <p style={{ margin: 0, fontWeight: 600 }}>Fill in the missing words</p>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
        <button type="button" className="hr-btn" style={{ background: 'var(--well)', color: 'var(--ink)' }} onClick={hint}>Hint</button>
        <button type="button" className="hr-btn" onClick={check} disabled={step.blanks.some((i) => !(values[i] ?? '').trim())}>Check</button>
      </div>
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
  const [focused, setFocused] = useState(false);
  const reported = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus({ preventScroll: true }); }, []);

  const finish = (m: number, h: number) => {
    if (reported.current) return;
    reported.current = true;
    const allowed = Math.max(1, Math.floor(tokens.length / 10));
    const ok = m + h <= allowed;
    onReport({ ok, close: !ok && m + h <= allowed + 2, hints: h, note: m ? `${m} wrong ${plural(m, 'letter', 'letters')}${h ? `, ${h} ${plural(h, 'word', 'words')} shown` : ''}.` : h ? `${h} ${plural(h, 'word', 'words')} shown.` : undefined, reveal: m || h ? <Answer lead={step.lead} text={step.text} /> : undefined });
  };
  const advance = (m: number, h: number) => {
    const n = shown + 1;
    setShown(n);
    if (n >= tokens.length) { input.current?.blur(); finish(m, h); }
  };
  const press = (ch: string) => {
    if (shown >= tokens.length) return;
    if (ch.toLowerCase() === firstLetter(tokens[shown])) advance(misses, hints);
    else { setMisses(misses + 1); setShake((s) => s + 1); }
  };
  return (
    <>
      <p style={{ margin: 0, fontWeight: 600 }}>Type the first letter of each word</p>
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
        onPointerDown={(e) => e.preventDefault()} onClick={() => { setHints(hints + 1); advance(misses, hints + 1); }}>Show the next word</button>
    </>
  );
}

function Heard({ lead, text, heard }: { lead?: string; text: string; heard: boolean[] }) {
  const tokens = text.split(' ');
  return <p className="hr-say-text" style={{ fontSize: 19 }}><Lead text={lead ?? ''} />{tokens.map((t, i) => <span key={i} className={heard[i] ? 'hr-heard' : 'hr-missed'}>{t}{' '}</span>)}</p>;
}

function scored(text: string, lead: string, said: string, pass: number, verb: string): Outcome {
  const r = gradeSpoken(text, said);
  const missed = r.heard.filter((h) => !h).length;
  return {
    ok: r.score >= pass,
    close: r.score < pass && r.score >= NEARLY,
    note: missed ? `${missed} ${plural(missed, 'word', 'words')} ${verb}. They’re underlined.` : undefined,
    reveal: missed ? <Heard lead={lead} text={text} heard={r.heard} /> : undefined,
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
      <p style={{ margin: 0, fontWeight: 600 }}>Type it from memory</p>
      <ContinueFrom lead={step.lead} />
      <textarea ref={area} className="hr-typed" name="heir-typed" rows={4} autoCapitalize="sentences" autoCorrect="off" autoComplete="off" spellCheck={false}
        aria-label="Your answer" value={value} onChange={(e) => setValue(e.target.value)} />
      <button type="button" className="hr-btn" disabled={!value.trim()} onClick={() => onReport(scored(step.text, step.lead, value, TYPED_PASS, 'missing or misspelled'))}>Check</button>
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
  const [mode, setMode] = useState<'mic' | 'self'>(() => (recognizer() ? 'mic' : 'self'));
  const [listening, setListening] = useState(false);
  const [said, setSaid] = useState('');
  const [revealed, setRevealed] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const finals = useRef('');
  const done = useRef(false);
  useEffect(() => () => rec.current?.abort(), []);

  const grade = () => {
    if (done.current) return;
    const text = finals.current.trim();
    if (!text) return;
    done.current = true;
    onReport(scored(step.text, step.lead, text, SPOKEN_PASS, 'weren’t heard'));
  };
  const start = () => {
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
    r.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') setMode('self'); };
    r.onend = () => { setListening(false); grade(); };
    rec.current = r;
    try { r.start(); setListening(true); } catch { setMode('self'); }
  };
  const stop = () => rec.current?.stop();

  return (
    <>
      <p style={{ margin: 0, fontWeight: 600 }}>Say it from memory</p>
      <ContinueFrom lead={step.lead} />
      {mode === 'mic' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center' }}>
          <button type="button" className="hr-mic" data-on={listening} aria-label={listening ? 'Stop and check' : 'Start speaking'} onClick={listening ? stop : start}>
            {listening
              ? <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
              : <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>}
          </button>
          <span style={{ fontSize: 15, color: 'var(--muted)' }}>{listening ? 'Listening. Tap again when you’re done.' : 'Tap, then say the answer.'}</span>
          {said && <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5, color: 'var(--muted)' }}>{said}</p>}
        </div>
      ) : !revealed ? (
        <>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5 }}>Say it aloud without looking. Then check yourself.</p>
          <button type="button" className="hr-btn" onClick={() => setRevealed(true)}>Show the words</button>
        </>
      ) : (
        <>
          <Answer lead={step.lead} text={step.text} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button type="button" className="hr-btn" style={{ background: 'var(--well)', color: 'var(--ink)' }} onClick={() => onReport({ ok: false })}>I missed some</button>
            <button type="button" className="hr-btn" onClick={() => onReport({ ok: true })}>I said it all</button>
          </div>
        </>
      )}
      <button type="button" className="hr-btn quiet" style={{ marginTop: 'auto' }} onClick={() => { rec.current?.abort(); onCantSpeak(); }}>Can’t speak now, type it</button>
    </>
  );
}

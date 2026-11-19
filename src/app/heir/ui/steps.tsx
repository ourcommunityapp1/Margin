'use client';

// The exercises. Each one reports a result once; the lesson shows the feedback and moves on.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Item, Track } from '@/heir/types';
import type { Step } from '@/heir/lesson';
import { unitText } from '@/heir/lesson';
import { itemLabel } from '@/heir/content';
import { firstLetter, gradeSpoken, SPOKEN_PASS, wordMatches } from '@/heir/grade';
import { sameWords } from '@/heir/words';

export type Report = (ok: boolean, hints: number, reveal?: ReactNode) => void;

// Words before this part of a long answer, kept short.
const tail = (lead: string, n = 8) => {
  const w = lead.split(' ').filter(Boolean);
  return w.length > n ? `…${w.slice(-n).join(' ')}` : lead;
};

// Splits "God," into the word to type and the punctuation around it.
const parts = (token: string) => {
  const m = token.match(/^([“‘"'(]*)(.*?)([.,;:!?”’")]*)$/);
  return { before: m?.[1] ?? '', core: m?.[2] ?? token, after: m?.[3] ?? '' };
};

export function Cue({ item, step, title }: { item: Item; step: Step; title: string }) {
  const lead = 'lead' in step ? step.lead : '';
  return (
    <div className="hr-cue">
      <span className="hr-label" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {step.review && <span className="hr-tag">Review</span>}
        {title}
      </span>
      <p className="serif" style={{ margin: 0, fontSize: 20, lineHeight: 1.35, fontWeight: 600 }}>{item.prompt}</p>
      {lead && <p className="serif" style={{ margin: 0, fontSize: 18, lineHeight: 1.4, color: 'var(--muted)' }}>{tail(lead)}</p>}
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
  const check = () => onReport(sameWords(picked.map((i) => step.bank[i]).join(' '), answer), 0, <p className="hr-say-text" style={{ fontSize: 19 }}>{answer}</p>);
  const tileClass = `hr-tile${step.pieces ? ' piece' : ''}`;
  return (
    <>
      <p style={{ margin: 0, fontWeight: 600 }}>{step.pieces ? 'Put the phrases in order' : 'Put the words in order'}</p>
      <div className="hr-answer" aria-label="Your answer" style={step.pieces ? { flexDirection: 'column', flexWrap: 'nowrap' } : undefined}>
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
      <button type="button" className="hr-btn" style={{ marginTop: 'auto' }} disabled={!picked.length} onClick={check}>Check</button>
    </>
  );
}

export function Meaning({ step, onReport }: { step: Extract<Step, { kind: 'meaning' }>; onReport: Report }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const q = step.question;
  return (
    <>
      <p className="serif" style={{ margin: 0, fontSize: 22, lineHeight: 1.35, fontWeight: 600 }}>{q.question}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {step.options.map((o) => (
          <button key={o} type="button" className="hr-choice" aria-pressed={chosen === o} style={{ textAlign: 'left' }} disabled={!!chosen}
            onClick={() => {
              setChosen(o);
              onReport(o === q.answer, 0, <>{o !== q.answer && <p style={{ margin: 0, fontWeight: 600 }}>{q.answer}</p>}<p style={{ margin: 0, lineHeight: 1.5 }}>{q.explain}</p></>);
            }}>{o}</button>
        ))}
      </div>
    </>
  );
}

export function Blanks({ step, onReport }: { step: Extract<Step, { kind: 'blanks' }>; onReport: Report }) {
  const tokens = step.text.split(' ');
  const [values, setValues] = useState<Record<number, string>>({});
  const [hints, setHints] = useState(0);
  const refs = useRef<Record<number, HTMLInputElement | null>>({});
  useEffect(() => { refs.current[step.blanks[0]]?.focus(); }, [step.blanks]);

  const check = () => {
    const ok = step.blanks.every((i) => wordMatches(values[i] ?? '', parts(tokens[i]).core));
    onReport(ok, hints, <p className="hr-say-text" style={{ fontSize: 19 }}>{tokens.map((t, i) => <span key={i}>{step.blanks.includes(i) ? <strong>{t}</strong> : t}{' '}</span>)}</p>);
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
        {tokens.map((t, i) => {
          if (!step.blanks.includes(i)) return <span key={i}>{t} </span>;
          const { before, core, after } = parts(t);
          const at = step.blanks.indexOf(i);
          return (
            <span key={i}>{before}
              <input type="text" className="hr-blank" aria-label={`Missing word ${at + 1}`} autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
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
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button type="button" className="hr-btn" onClick={check} disabled={step.blanks.some((i) => !(values[i] ?? '').trim())}>Check</button>
        <button type="button" className="hr-btn quiet" onClick={hint}>Hint</button>
      </div>
    </>
  );
}

export function Letters({ step, onReport }: { step: Extract<Step, { kind: 'letters' }>; onReport: Report }) {
  const tokens = step.text.split(' ');
  const [shown, setShown] = useState(0);
  const [misses, setMisses] = useState(0);
  const [hints, setHints] = useState(0);
  const [shake, setShake] = useState(0);
  const reported = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);

  const finish = (m: number, h: number) => {
    if (reported.current) return;
    reported.current = true;
    const allowed = Math.max(1, Math.floor(tokens.length / 10));
    onReport(m + h <= allowed, h, <p className="hr-say-text" style={{ fontSize: 19 }}>{step.text}</p>);
  };
  const advance = (m: number, h: number) => {
    const n = shown + 1;
    setShown(n);
    if (n >= tokens.length) finish(m, h);
  };
  const press = (ch: string) => {
    if (shown >= tokens.length) return;
    if (ch.toLowerCase() === firstLetter(tokens[shown])) advance(misses, hints);
    else { setMisses(misses + 1); setShake((s) => s + 1); }
  };
  return (
    <>
      <p style={{ margin: 0, fontWeight: 600 }}>Type the first letter of each word</p>
      <p key={shake} className={`hr-passage${shake ? ' hr-shake' : ''}`} aria-live="polite">
        {tokens.map((t, i) => i < shown
          ? <span key={i}>{t} </span>
          : <span key={i}><span className={`hr-hidden-word${i === shown ? ' next' : ''}`} style={{ width: `${Math.max(2, parts(t).core.length) * 0.55}em` }} />{' '}</span>)}
      </p>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <input ref={input} type="text" className="hr-letters-input" aria-label="Next first letter" autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
          value="" placeholder={shown < tokens.length ? 'Type here' : ''} onChange={(e) => { const ch = e.target.value.slice(-1); if (ch.trim()) press(ch); }} />
        <button type="button" className="hr-btn quiet" disabled={shown >= tokens.length} onClick={() => { setHints(hints + 1); advance(misses, hints + 1); }}>Show the next word</button>
      </div>
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

function Heard({ text, heard }: { text: string; heard: boolean[] }) {
  const tokens = text.split(' ');
  return <p className="hr-say-text" style={{ fontSize: 19 }}>{tokens.map((t, i) => <span key={i} className={heard[i] ? 'hr-heard' : 'hr-missed'}>{t}{' '}</span>)}</p>;
}

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
    const r = gradeSpoken(step.text, text);
    onReport(r.score >= SPOKEN_PASS, 0, <>{r.score < 1 && <p style={{ margin: 0, fontSize: 14 }}>Underlined words weren’t heard.</p>}<Heard text={step.text} heard={r.heard} /></>);
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
          <p className="hr-say-text">{step.text}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button type="button" className="hr-btn" style={{ background: 'var(--well)', color: 'var(--ink)' }} onClick={() => onReport(false, 0)}>I missed some</button>
            <button type="button" className="hr-btn" onClick={() => onReport(true, 0)}>I said it all</button>
          </div>
        </>
      )}
      <button type="button" className="hr-btn quiet" style={{ marginTop: 'auto' }} onClick={() => { rec.current?.abort(); onCantSpeak(); }}>Can’t speak now</button>
    </>
  );
}

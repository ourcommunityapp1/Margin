'use client';

// "When you lie down": a relaxed review before sleep. Each question is read aloud; you answer aloud or in a
// whisper; the answer follows; you say honestly whether you had it. Then a prayer and Psalm 4:8, the window
// dims, and that's all. No scores, no timers to beat, no "next lesson".

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHeir } from './provider';
import { useCourse } from './course';
import { RoundWindow } from './glass/round';
import { partWindow } from './glass/light';
import { getItem, itemLabel } from '@/heir/content';
import { bedtimePicks } from '@/heir/planner';
import { finishNight, memberProgress, type NightAnswer } from '@/heir/progress';

const VOICE_KEY = 'heir-night-voice';
const WAIT_MS = 7000;

function speak(text: string, on: boolean) {
  if (!on || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.88;
  window.speechSynthesis.speak(u);
}

export function NightRunner() {
  const router = useRouter();
  const { ready, updateProgress, progress } = useHeir();
  const { me, items, course, mine, track } = useCourse();
  const [picks, setPicks] = useState<string[] | null>(null);
  const [at, setAt] = useState(0);
  const [stage, setStage] = useState<'listen' | 'check' | 'goodnight'>('listen');
  const [answers, setAnswers] = useState<{ itemId: string; answer: NightAnswer }[]>([]);
  const [voice, setVoice] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The questions are fixed when the night begins, so answering doesn't reshuffle them.
  useEffect(() => {
    if (!ready || picks) return;
    Promise.resolve().then(() => {
      let on = true;
      try { on = localStorage.getItem(VOICE_KEY) !== 'off'; } catch { /* private mode */ }
      setVoice(on);
      setPicks(bedtimePicks(mine, new Set(items.map((i) => i.id)), new Date()));
    });
  }, [ready, picks, mine, items]);

  const item = picks && picks[at] ? getItem(picks[at]) : null;

  // Listen: read the question, wait, then show (and read) the answer.
  useEffect(() => {
    if (!item || stage !== 'listen') return;
    speak(item.prompt, voice);
    timer.current = setTimeout(() => { setStage('check'); speak(item.text, voice); }, WAIT_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [item, stage, voice]);
  useEffect(() => () => { if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel(); }, []);

  const light = useMemo(() => partWindow(course, track, mine, new Date()), [course, track, mine]);

  if (!ready || !me || !picks) return <main className="hr-night" aria-busy="true" />;

  if (!picks.length) {
    return (
      <main className="hr-night">
        <div className="hr-night-center">
          <p className="serif" style={{ fontSize: 22, lineHeight: 1.45, margin: 0 }}>Nothing to go over tonight. Rest well.</p>
          <span className="serif" style={{ fontSize: 17, opacity: 0.8 }}>“In peace I will both lie down and sleep.” <span className="hr-night-ref">Psalm 4:8</span></span>
          <Link href="/heir" className="hr-night-ghost">Goodnight</Link>
        </div>
      </main>
    );
  }

  const answer = (a: NightAnswer) => {
    const next = [...answers, { itemId: picks[at], answer: a }];
    setAnswers(next);
    if (at + 1 < picks.length) { setAt(at + 1); setStage('listen'); return; }
    updateProgress((p) => ({ ...p, [me.id]: finishNight(memberProgress(p, me.id), next, new Date()) }));
    setStage('goodnight');
  };
  const toggleVoice = () => {
    const v = !voice;
    setVoice(v);
    try { localStorage.setItem(VOICE_KEY, v ? 'on' : 'off'); } catch { /* private mode */ }
    if (!v && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  };
  void progress;

  const top = (
    <div className="hr-night-top">
      <span>When you lie down{stage !== 'goodnight' ? ` · ${at + 1} of ${picks.length}` : ''}</span>
      <Link href="/heir" aria-label="Close" className="hr-night-x"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></Link>
    </div>
  );

  if (stage === 'goodnight') {
    const notYet = answers.filter((a) => a.answer === 'not-yet').map((a) => itemLabel(getItem(a.itemId)!));
    return (
      <main className="hr-night hr-night-end">
        <div className="hr-night-window dim"><RoundWindow base={light.base} lit={light.lit} share={light.share} size={170} /></div>
        <div className="hr-night-center" style={{ gap: 20 }}>
          <p className="serif" style={{ margin: 0, fontStyle: 'italic', fontSize: 20, lineHeight: 1.5, color: '#D8CFBF' }}>Lord, keep these words in my heart as I sleep, and let me wake still holding them.</p>
          <span style={{ width: 40, height: 1, background: 'rgba(232,184,103,0.5)' }} />
          <p className="serif" style={{ margin: 0, fontSize: 18, lineHeight: 1.5 }}>“In peace I will both lie down and sleep; for you alone, O Lord, make me dwell in safety.”</p>
          <span className="hr-night-ref">Psalm 4:8</span>
        </div>
        <div className="hr-night-bottom">
          <span style={{ fontSize: 13, color: '#6F6B86' }}>{answers.length} gone over{notYet.length ? ` · ${notYet.join(', ')} again in the morning` : ''}</span>
          <button type="button" className="hr-night-ghost" onClick={() => router.push('/heir')}>Goodnight</button>
        </div>
      </main>
    );
  }

  return (
    <main className="hr-night">
      {top}
      {stage === 'listen' ? (
        <>
          <div className="hr-night-window"><RoundWindow base={light.base} lit={light.lit} share={light.share} size={170} /></div>
          <div className="hr-night-center">
            <span className="hr-night-ref">{item ? itemLabel(item) : ''}</span>
            <h1 className="serif" style={{ margin: 0, fontSize: 32, fontWeight: 400, lineHeight: 1.2 }}>{item?.prompt}</h1>
            <span className="hr-night-wave" aria-hidden="true">{Array.from({ length: 7 }, (_, k) => <span key={k} style={{ animationDelay: `${k * 0.12}s` }} />)}</span>
            <p style={{ margin: 0, fontSize: 15, color: '#A9A6C4', lineHeight: 1.5 }}>Answer aloud, or in a whisper.<br />The answer comes in a moment.</p>
          </div>
          <div className="hr-night-bottom">
            <button type="button" className="hr-night-ghost wide" onClick={() => { setStage('check'); if (item) speak(item.text, voice); }}>Show the answer now</button>
            <button type="button" className="hr-night-voice" onClick={toggleVoice}>Read aloud · {voice ? 'on' : 'off'}</button>
          </div>
        </>
      ) : (
        <>
          <div className="hr-night-answer">
            <span style={{ fontSize: 13, color: '#8E8AA8', fontWeight: 600 }}>{item ? `${itemLabel(item)} · ${item.prompt}` : ''}</span>
            <p className="serif" style={{ margin: 0, fontSize: 26, lineHeight: 1.4, fontWeight: 300 }}>{item?.text}</p>
          </div>
          <div className="hr-night-bottom">
            <span className="serif" style={{ fontSize: 20 }}>Did you have it?</span>
            <div className="hr-night-choices">
              <button type="button" className="yes" onClick={() => answer('yes')}>Yes</button>
              <button type="button" onClick={() => answer('partly')}>Partly</button>
              <button type="button" onClick={() => answer('not-yet')}>Not yet</button>
            </div>
            <span style={{ fontSize: 12, color: '#6F6B86' }}>“Not yet” just comes back in the morning.</span>
          </div>
        </>
      )}
    </main>
  );
}

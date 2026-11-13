// Listening. Two ways to turn speech into words, behind one small interface:
//
//  - 'recorder': records the microphone and sends each stretch of speech (cut at a breath) to
//    ElevenLabs through /api/think/transcribe. Used when the server has a key.
//  - 'browser': the browser's built-in speech recognition, which also gives the in-progress
//    line word by word. The fallback when there is no key.
//
// Both report raw words. Punctuation and paragraphs are added later, by a pass that is checked
// to change nothing else.

import type { Unclear } from '../types.ts';
import { ApiError, postAudio } from './session.ts';

export type Engine = 'recorder' | 'browser';

export interface DictationEvents {
  // The words being heard right now, not yet settled. Empty when there are none.
  onInterim(text: string): void;
  // Settled words to add to the note.
  onFinal(text: string, unclear: Unclear[]): void;
  // The speaker is making sound (used to tell a pause from speech).
  onActivity(): void;
  // Something the user should quietly know: the microphone is blocked, a stretch was lost.
  onNotice(message: string): void;
  // Number of recorded stretches still being turned into words.
  onWaiting?(count: number): void;
}

export interface Dictation {
  start(): Promise<boolean>;
  // Stops listening and resolves once every word heard so far has been delivered.
  stop(): Promise<void>;
}

interface Recognition extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

const recognitionCtor = (): (new () => Recognition) | undefined => {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

export const browserRecognitionAvailable = () => !!recognitionCtor();
export const recorderAvailable = () =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

export function pickEngine(serverHasSpeech: boolean): Engine | null {
  if (serverHasSpeech && recorderAvailable()) return 'recorder';
  if (browserRecognitionAvailable()) return 'browser';
  return null;
}

const MIC_BLOCKED = 'The microphone is off for this site. Turn it on in your browser settings, or type instead.';

function browserDictation(ev: DictationEvents): Dictation {
  const Ctor = recognitionCtor()!;
  let rec: Recognition | null = null;
  let wanted = false;
  const open = () => {
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = navigator.language || 'en-US';
    r.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const text = res[0].transcript.trim();
        if (!text) continue;
        if (res.isFinal) ev.onFinal(text, []); else interim += (interim ? ' ' : '') + text;
      }
      ev.onActivity();
      ev.onInterim(interim);
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        wanted = false;
        ev.onNotice(MIC_BLOCKED);
      }
    };
    // Browsers end recognition after a silence; keep listening until told to stop.
    r.onend = () => {
      ev.onInterim('');
      if (!wanted) return;
      try { rec = open(); rec.start(); } catch { wanted = false; }
    };
    return r;
  };
  return {
    async start() {
      wanted = true;
      try { rec = open(); rec.start(); return true; } catch { wanted = false; return false; }
    },
    async stop() {
      wanted = false;
      const r = rec;
      rec = null;
      if (!r) return;
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        r.addEventListener('end', done, { once: true });
        try { r.stop(); } catch { resolve(); }
        setTimeout(done, 1200);
      });
    },
  };
}

// How the recorder decides where one stretch of speech ends.
const VOICE_LEVEL = 0.018;     // loudness that counts as speech
const BREATH_MS = 1100;        // silence that ends a stretch
const LONG_STRETCH_MS = 20_000; // past this, cut at the next short gap
const SHORT_GAP_MS = 350;
const HARD_LIMIT_MS = 40_000;

function recorderDictation(ev: DictationEvents): Dictation {
  let stream: MediaStream | null = null;
  let audio: AudioContext | null = null;
  let recorder: MediaRecorder | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let startedAt = 0;
  let lastVoice = 0;
  let voiced = false;
  let waiting = 0;
  // Stretches are transcribed in the order they were spoken.
  let queue: Promise<void> = Promise.resolve();

  const send = (blob: Blob) => {
    waiting++;
    ev.onWaiting?.(waiting);
    queue = queue.then(async () => {
      try {
        const r = await postAudio<{ text: string; unclear: Unclear[] }>('transcribe', blob);
        if (r.text) ev.onFinal(r.text, r.unclear ?? []);
      } catch (e) {
        ev.onNotice(e instanceof ApiError ? `${e.message} That stretch wasn’t written down.` : 'A stretch of speech couldn’t be sent. Check your connection.');
      } finally {
        waiting--;
        ev.onWaiting?.(waiting);
      }
    });
  };

  const begin = () => {
    if (!stream) return;
    const chunks: Blob[] = [];
    const r = new MediaRecorder(stream);
    const hadVoice = () => voicedAtStop;
    let voicedAtStop = false;
    r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    r.onstop = () => { if (hadVoice() && chunks.length) send(new Blob(chunks, { type: r.mimeType || chunks[0].type })); };
    (r as MediaRecorder & { cut?: () => void }).cut = () => { voicedAtStop = voiced; r.stop(); };
    recorder = r;
    voiced = false;
    startedAt = Date.now();
    r.start();
  };

  const cut = (restart: boolean) => {
    const r = recorder as (MediaRecorder & { cut?: () => void }) | null;
    recorder = null;
    if (r && r.state !== 'inactive') r.cut?.();
    if (restart) begin();
  };

  return {
    async start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      } catch {
        ev.onNotice(MIC_BLOCKED);
        return false;
      }
      audio = new AudioContext();
      const analyser = audio.createAnalyser();
      analyser.fftSize = 1024;
      audio.createMediaStreamSource(stream).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      begin();
      timer = setInterval(() => {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const now = Date.now();
        if (Math.sqrt(sum / buf.length) > VOICE_LEVEL) {
          voiced = true;
          lastVoice = now;
          ev.onActivity();
        }
        const quiet = now - lastVoice;
        const length = now - startedAt;
        if (voiced && (quiet >= BREATH_MS || (length >= LONG_STRETCH_MS && quiet >= SHORT_GAP_MS) || length >= HARD_LIMIT_MS)) cut(true);
        // Nothing but silence: start over so the next stretch doesn't carry a long quiet lead-in.
        else if (!voiced && length >= 8000) cut(true);
      }, 100);
      return true;
    },
    async stop() {
      if (timer) clearInterval(timer);
      timer = null;
      const last = recorder;
      const stopped = last && last.state !== 'inactive'
        ? new Promise<void>((resolve) => last.addEventListener('stop', () => resolve(), { once: true }))
        : Promise.resolve();
      cut(false);
      await stopped;
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      await audio?.close().catch(() => {});
      audio = null;
      await queue;
    },
  };
}

export function createDictation(engine: Engine, events: DictationEvents): Dictation {
  return engine === 'recorder' ? recorderDictation(events) : browserDictation(events);
}

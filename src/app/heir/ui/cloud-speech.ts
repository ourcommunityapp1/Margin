// "Say it from memory" through ElevenLabs Scribe, for a signed-in adult: record the answer, send it to /api/heir/transcribe
// with the person's sign-in token and the answer's rare words as hints, get the words back. Nothing is kept. Children,
// signed-out use, browsers that can't record, and any failed upload use the browser's own recognizer instead.

import { cloud } from './cloud';

export const canRecord = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

// Once an upload fails, the rest of this visit uses the browser's recognizer (the phone app does the same for the session).
const BROKEN = 'heir-cloud-speech-broken';
export const cloudSpeechBroken = () => { try { return sessionStorage.getItem(BROKEN) === '1'; } catch { return false; } };
export const markCloudSpeechBroken = () => { try { sessionStorage.setItem(BROKEN, '1'); } catch { /* private mode: this step still falls back */ } };

const MAX_MS = 120_000; // two minutes, the most an answer needs

export interface Recording { stop(): Promise<Blob>; cancel(): void }

/** Starts the microphone. Rejects when it is refused or missing. */
export async function startRecording(onLimit: () => void): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported(t));
  const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const release = () => stream.getTracks().forEach((t) => t.stop());
  const limit = setTimeout(onLimit, MAX_MS);
  rec.start();
  return {
    stop: () => new Promise<Blob>((resolve) => {
      clearTimeout(limit);
      rec.onstop = () => { release(); resolve(new Blob(chunks, { type: rec.mimeType || type || 'audio/webm' })); };
      if (rec.state !== 'inactive') rec.stop(); else { release(); resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' })); }
    }),
    cancel: () => { clearTimeout(limit); rec.onstop = null; if (rec.state !== 'inactive') rec.stop(); release(); },
  };
}

/** The words said, or null when they couldn't be checked (signed out, no connection, speech to text off, a slow reply). */
export async function transcribe(audio: Blob, hints: string[]): Promise<string | null> {
  const db = cloud();
  if (!db) return null;
  const token = (await db.auth.getSession()).data.session?.access_token;
  if (!token) return null;
  const q = hints.map((h) => `k=${encodeURIComponent(h)}`).join('&');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25_000);
  try {
    const res = await fetch(`/api/heir/transcribe${q ? `?${q}` : ''}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': audio.type || 'audio/webm' }, body: audio, signal: ctl.signal });
    if (!res.ok) return null;
    const json = (await res.json()) as { text?: string };
    return typeof json.text === 'string' ? json.text : null;
  } catch { return null; } finally { clearTimeout(timer); }
}

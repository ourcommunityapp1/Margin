// Changes to a note, as pure functions: adding a formatted stretch of speech, choosing a
// format, going back to the original. Each keeps the user's words exactly as they are.

import type { Layout, Note, NoteVersion, Unclear } from './types.ts';
import { containsWords, punctuationCount, wordsOf } from './words.ts';

// Add a stretch of speech that has been punctuated and spaced. `raw` is what was heard;
// `paragraphs` is the same words, formatted (already checked by acceptFormatting).
export function addSpeech(n: Note, raw: string, paragraphs: string[], continues: boolean): Note {
  if (!paragraphs.length) return n;
  const all = [...n.paragraphs];
  const added = [...paragraphs];
  if (continues && all.length) all[all.length - 1] = `${all[all.length - 1]} ${added.shift()}`;
  all.push(...added);
  return {
    ...n,
    paragraphs: all,
    // A chosen format keeps growing with the new words, as plain paragraphs at its end.
    layout: n.layout ? { ...n.layout, blocks: [...n.layout.blocks, ...paragraphs.map((v) => ({ v }))] } : null,
    transcript: n.transcript ? `${n.transcript} ${raw.trim()}` : raw.trim(),
    trail: {
      ...n.trail,
      punctuation: n.trail.punctuation + Math.max(0, punctuationCount(paragraphs.join(' ')) - punctuationCount(raw)),
      paragraphs: n.trail.paragraphs + added.length,
    },
  };
}

export function addUnclear(n: Note, unclear: Unclear[]): Note {
  if (!unclear.length) return n;
  return { ...n, unclear: [...n.unclear, ...unclear].slice(-12), trail: { ...n.trail, flagged: n.trail.flagged + unclear.length } };
}

// Typed text: paragraphs are whatever the user separated with a blank line.
export function withTypedText(n: Note, text: string): Note {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  // A flagged word the user has since typed over no longer needs asking about.
  const words = wordsOf(text);
  const unclear = n.unclear.filter((u) => containsWords(words, u.word));
  return { ...n, paragraphs, layout: null, unclear };
}

// The note as it stands, kept so it can always be brought back.
export function snapshot(n: Note, id: string, reason: NoteVersion['reason'], now = new Date()): NoteVersion {
  return {
    id, noteId: n.id, label: n.layout?.label ?? 'Original', title: n.title,
    paragraphs: n.paragraphs, layout: n.layout, reason, createdAt: now.toISOString(),
  };
}

// Choosing a format replaces how the note is shown. The words themselves stay in `paragraphs`,
// so going back to the original is always possible: pass null.
export const withLayout = (n: Note, layout: Layout | null): Note => ({ ...n, layout });

export const isEmpty = (n: Note) => !n.paragraphs.length && !n.title.trim();

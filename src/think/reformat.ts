// Reformat arranges the user's own sentences; it never writes new ones. A version is only shown
// if every sentence in it can be found, word for word, in the note.

import type { Block, Layout } from './types.ts';
import { containsWords, sentencesOf, wordsOf } from './words.ts';

export const MAX_LABEL_WORDS = 5;

// Why a version was turned away, or null when it is faithful to the note.
export function unfaithful(version: Layout, text: string): string | null {
  const hay = wordsOf(text);
  if (!version.blocks.length) return 'empty';
  for (const b of version.blocks) {
    if (b.k && wordsOf(b.k).length > MAX_LABEL_WORDS) return `label too long: ${b.k}`;
    if (!wordsOf(b.v).length) return 'empty block';
    for (const s of sentencesOf(b.v)) {
      if (wordsOf(s).length && !containsWords(hay, s)) return `not in the note: ${s}`;
    }
  }
  return null;
}

export function faithfulVersions(versions: Layout[], text: string, max = 3): Layout[] {
  const seen = new Set<string>();
  return versions
    .filter((v) => v && typeof v.label === 'string' && Array.isArray(v.blocks))
    .map((v) => ({
      label: v.label.trim(),
      blocks: v.blocks.map((b): Block => ({ ...(b.k?.trim() ? { k: b.k.trim() } : {}), v: String(b.v ?? '').trim() })),
    }))
    .filter((v) => {
      if (!v.label || seen.has(v.label.toLowerCase()) || unfaithful(v, text)) return false;
      seen.add(v.label.toLowerCase());
      return true;
    })
    .slice(0, max);
}

// Arrangements that need no model, used when the AI isn't available. Plain, but honest.
export function localVersions(paragraphs: string[]): Layout[] {
  const sentences = sentencesOf(paragraphs.join('\n'));
  const out: Layout[] = [];
  if (sentences.length >= 2) out.push({ label: 'Line by line', blocks: sentences.map((v) => ({ v })) });
  if (paragraphs.length >= 2) {
    out.push({
      label: 'Last thought first',
      blocks: [
        { k: 'Where I ended', v: paragraphs[paragraphs.length - 1] },
        ...paragraphs.slice(0, -1).map((v, i): Block => (i === 0 ? { k: 'How I got there', v } : { v })),
      ],
    });
  }
  const questions = sentences.filter((s) => /\?["'”’)]*$/.test(s));
  const rest = sentences.filter((s) => !questions.includes(s));
  if (questions.length && rest.length) {
    out.push({ label: 'Questions first', blocks: [{ k: 'Questions', v: questions.join(' ') }, { k: 'The rest', v: rest.join(' ') }] });
  }
  return out.slice(0, 3);
}

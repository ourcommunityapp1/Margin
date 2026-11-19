// Checks that content is safe to learn from. Run by the tests, so a broken item can't ship.

import type { Collection, Item, Track } from './types.ts';
import { normalizeWord } from './words.ts';

export function itemProblems(item: Item): string[] {
  const p: string[] = [];
  const where = (s: string) => `${item.id}: ${s}`;
  if (!item.prompt.trim()) p.push(where('empty prompt'));
  if (!item.text.trim()) p.push(where('empty text'));
  if (item.text !== item.text.trim() || /\s{2,}/.test(item.text)) p.push(where('text has stray spaces'));
  for (const track of ['adult', 'child'] as Track[]) {
    const chunks = item.chunks[track];
    if (!chunks?.length) { p.push(where(`no ${track} chunks`)); continue; }
    if (chunks.some((c) => !c.trim() || c !== c.trim())) p.push(where(`${track} chunk is empty or has stray spaces`));
    // The pieces must rebuild the exact text: no word added, dropped or changed.
    if (chunks.join(' ') !== item.text) p.push(where(`${track} chunks do not rebuild the text`));
  }
  if (item.chunks.child.length < item.chunks.adult.length) p.push(where('child chunks should be at least as many (and as small) as adult chunks'));
  const lower = item.text.toLowerCase();
  for (const m of item.meaning) {
    if (!lower.includes(m.phrase.toLowerCase())) p.push(where(`meaning phrase "${m.phrase}" is not in the text`));
    const options = [m.answer, ...m.distractors].map((o) => o.trim().toLowerCase());
    if (new Set(options).size !== 4) p.push(where(`meaning question about "${m.phrase}" has repeated options`));
    if (!m.explain.trim()) p.push(where(`meaning question about "${m.phrase}" has no explanation`));
  }
  return p;
}

export function collectionProblems(c: Collection): string[] {
  const p = c.items.flatMap(itemProblems);
  c.items.forEach((item, i) => {
    if (item.collection !== c.id) p.push(`${item.id}: belongs to ${item.collection}, listed in ${c.id}`);
    if (item.number !== i + 1) p.push(`${item.id}: numbered ${item.number}, expected ${i + 1}`);
  });
  const ids = c.items.map((i) => i.id);
  if (new Set(ids).size !== ids.length) p.push(`${c.id}: repeated item ids`);
  return p;
}

// Every word in the text, for exercises that need the word list. Kept here so tests cover it.
export function itemWords(item: Item): string[] {
  return item.text.split(/\s+/).filter((w) => normalizeWord(w));
}

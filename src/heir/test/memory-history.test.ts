import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyProgress, finishSession } from '../progress.ts';
import { unitsFor } from '../lesson.ts';
import { getItem } from '../content/index.ts';
import { itemWords } from '../measures.ts';
import { memoryDates, wordsHistory } from '../memory-history.ts';

const intro = (itemId: string) => ({ itemId, kind: 'intro' as const, correct: true, hints: 0, ms: 1, review: false });
const type = (itemId: string, part: string) => ({ itemId, kind: 'type' as const, correct: true, hints: 0, ms: 1, review: true, part, of: 1, words: 10, misses: 0, missed: [] });

test('words in memory over time: counts from the day a question first held a stone, weekly, ending at today’s number', () => {
  const item = getItem('wsc-1')!;
  const part = unitsFor(item, 'adult')[0];
  let p = finishSession(emptyProgress(), { results: [intro(item.id), type(item.id, part.key)], learned: unitsFor(item, 'adult'), now: new Date(2026, 10, 1, 9) });
  // Same day: recited but not yet remembered.
  assert.equal(memoryDates([item], 'adult', p.log).size, 0);
  p = finishSession(p, { results: [type(item.id, part.key)], now: new Date(2026, 10, 9, 9) });
  const dates = memoryDates([item], 'adult', p.log);
  assert.equal(new Date(dates.get(item.id)!).getDate(), 9);
  const now = new Date(2026, 10, 23, 9);
  const w = itemWords(item, 'adult');
  const h = wordsHistory([item], 'adult', p, now, w);
  assert.ok(h.length >= 3);
  assert.equal(h.at(-1)!.words, w, 'ends at today’s number');
  assert.equal(h[0].words, 0, 'starts at zero before it counted');
  assert.ok(h.every((x, i) => i === 0 || x.words >= h[i - 1].words), 'never goes down');
  assert.deepEqual(wordsHistory([item], 'adult', emptyProgress(), now, 0), [], 'nothing yet: no chart');
});

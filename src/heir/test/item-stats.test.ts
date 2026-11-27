import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyProgress, finishSession } from '../progress.ts';
import { unitsFor } from '../lesson.ts';
import { getItem } from '../content/index.ts';
import { itemStats, itemStrength, practisedToday, strengthBand } from '../item-stats.ts';
import { partMemories } from '../memory.ts';

test('a question’s stats: learned, answers, last time, the word most often missed', () => {
  const item = getItem('wsc-4')!;
  const part = unitsFor(item, 'adult')[0];
  let p = finishSession(emptyProgress(), { results: [{ itemId: item.id, kind: 'intro', correct: true, hints: 0, ms: 1, review: false }], learned: unitsFor(item, 'adult'), now: new Date(2026, 10, 10, 12) });
  // "God is a Spirit, infinite, ..." : word 4 ("infinite,") missed twice.
  for (const [d, ok] of [[12, false], [15, false], [18, true]] as const) {
    p = finishSession(p, { results: [{ itemId: item.id, kind: 'type', correct: ok, hints: 0, ms: 1, review: true, part: part.key, of: 1, misses: ok ? 0 : 1, words: 10, missed: ok ? [] : [4] }], now: new Date(2026, 10, d, 9) });
  }
  const s = itemStats(item, p, 'adult');
  assert.equal(s.practised, 3);
  assert.equal(s.right, 1);
  assert.equal(s.lastRight, true);
  assert.equal(s.learnedAt?.getDate(), 10);
  assert.ok(s.oftenMissed && /^[A-Za-z]+$/.test(s.oftenMissed), `a bare word, got ${s.oftenMissed}`);
  assert.ok(practisedToday(p, item.id, new Date(2026, 10, 18, 20)));
  assert.ok(!practisedToday(p, item.id, new Date(2026, 10, 19, 8)));
  const st = itemStrength(p, item.id, new Date(2026, 10, 20, 9), partMemories(p.log, p.partSnap));
  assert.ok(st !== null && st > 0 && st <= 1);
  assert.equal(strengthBand(0.9), 'strong');
  assert.equal(strengthBand(0.75), 'fading');
  assert.equal(strengthBand(0.5), 'weak');
});

import { wordCards, recitedPerfectly, timesPracticed, strengthSeries } from '../item-stats.ts';

test('the passage word by word: colours follow how often each word is missed; times recited perfectly and practised', () => {
  const item = getItem('wsc-4')!;
  const part = unitsFor(item, 'adult')[0];
  const words = item.chunks.adult.join(' ').split(/\s+/);
  const tk = (day: number, correct: boolean, missed: number[] = []) => ({ id: `t${day}${missed.join('')}`, at: new Date(2026, 10, day, 9).toISOString(), itemId: item.id, kind: 'type' as const, correct, hints: 0, ms: 1, review: true, part: part.key, of: unitsFor(item, 'adult').length, words: words.length, misses: missed.length, missed });
  // Word 3 missed on four of six typed answers; word 5 once; the rest never.
  const log = [tk(2, true), tk(3, false, [3]), tk(4, false, [3, 5]), tk(5, false, [3]), tk(6, false, [3]), tk(7, true), tk(8, true)];
  const cards = wordCards(item, 'adult', log);
  assert.equal(cards.length, words.length);
  assert.equal(cards[3].band, 'red', 'missed again and again');
  assert.ok(['light', 'yellow'].includes(cards[5].band), 'missed once in seven');
  assert.equal(cards[0].band, 'dark', 'never missed in seven tries');
  assert.equal(cards[3].misses, 4);
  assert.equal(wordCards(item, 'adult', []).every((c) => c.band === 'none'), true, 'nothing tried: no colour');
  // An answer with misses but no positions is unknown: it does not colour anything.
  assert.equal(wordCards(item, 'adult', [{ ...tk(2, false), misses: 3, missed: undefined } as never]).every((c) => c.band === 'none'), true);
  assert.equal(recitedPerfectly(item, 'adult', log), 3, 'the three clean typed answers');
  assert.equal(timesPracticed(item, log), 7);
  const series = strengthSeries(item, log, new Date(2026, 10, 10, 9));
  assert.ok(series.length >= 8 && series.every((x) => x.chance >= 0 && x.chance <= 1), 'a point a day');
});

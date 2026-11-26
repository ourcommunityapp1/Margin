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

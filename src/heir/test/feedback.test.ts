import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bandFor, mainWordShare, BAND_WORDS } from '../feedback.ts';

test('feedback bands: generous words, strict grade untouched', () => {
  const t = 'God is a Spirit, infinite, eternal, and unchangeable'.split(' ');
  assert.equal(mainWordShare(t, t.map(() => true)), 1);
  // Missing only the small words still keeps nearly all the meaning.
  const smallMissed = t.map((w) => !['is', 'a', 'and'].includes(w.replace(/,/g, '')));
  assert.ok(mainWordShare(t, smallMissed) > 0.85);
  // Missing main words costs much more.
  const mainMissed = t.map((w) => !['Spirit,', 'infinite,', 'eternal,'].includes(w));
  assert.ok(mainWordShare(t, mainMissed) < 0.6);
  assert.equal(bandFor({ ok: true }), 'perfect');
  assert.equal(bandFor({ ok: true, slip: true }), 'pass');
  assert.equal(bandFor({ ok: false, share: 0.8 }), 'good');
  assert.equal(bandFor({ ok: false, share: 0.6 }), 'growing');
  assert.equal(bandFor({ ok: false, share: 0.3 }), 'learning');
  assert.equal(bandFor({ ok: false, close: true }), 'growing');
  assert.equal(bandFor({ ok: false }), 'learning');
  // A generous band never turns a miss into a pass: only `ok` (the strict grade) gives perfect or pass.
  assert.notEqual(bandFor({ ok: false, share: 0.99 }), 'pass');
  assert.equal(BAND_WORDS.learning, 'No problem, you’re still learning.');
});

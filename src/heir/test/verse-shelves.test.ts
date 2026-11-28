import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getItem, isVerse } from '../content/index.ts';
import { VERSE_SHELVES } from '../content/verse-shelves.ts';

test('every verse on a shelf is a real verse in the app, and none is repeated on the same shelf', () => {
  for (const sh of VERSE_SHELVES) {
    assert.ok(sh.ids.length >= 5 && sh.ids.length <= 10, `${sh.id} has ${sh.ids.length}`);
    assert.equal(new Set(sh.ids).size, sh.ids.length);
    for (const id of sh.ids) { const it = getItem(id); assert.ok(it && isVerse(it), `${sh.id}: ${id}`); }
  }
});

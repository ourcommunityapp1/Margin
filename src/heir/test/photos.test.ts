import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { DAWN, DUSK, photoFor } from '../photos.ts';

test('every photo on Today exists and is credited', () => {
  for (const p of [...DAWN, ...DUSK]) {
    assert.ok(existsSync(`public${p.file}`), `${p.file} is missing`);
    assert.ok(p.who && p.license && p.alt, `${p.file} needs a credit`);
    if (p.license.startsWith('CC')) assert.ok(p.page, `${p.file} needs a link to its page`);
  }
});

test('the photo is the same all day and changes by day', () => {
  assert.equal(photoFor(DAWN, '2026-11-26'), photoFor(DAWN, '2026-11-26'));
  const seen = new Set(Array.from({ length: 14 }, (_, i) => photoFor(DAWN, `2026-12-${String(i + 1).padStart(2, '0')}`).file));
  assert.ok(seen.size > 3);
});

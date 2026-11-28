import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passageText, proofTexts } from '../../site/bible.ts';
import { getItem } from '../content/index.ts';

test('public-domain Bible text for proof texts: exact verses, ranges, and what cannot be shown', async () => {
  const one = await passageText('Romans 3:23');
  assert.equal(one?.ref, 'Romans 3:23');
  assert.equal(one?.verses[0].text, 'for all have sinned and fall short of the glory of God,');
  const range = await passageText('Psalm 73:25–28');
  assert.equal(range?.verses.length, 4);
  assert.equal(range?.ref, 'Psalm 73:25–28');
  assert.equal(await passageText('Hezekiah 1:1'), null);
  assert.equal(await passageText('Romans 3:99'), null);
  const wsc1 = getItem('wsc-1')!;
  const { shown } = await proofTexts(wsc1.connected);
  assert.deepEqual(shown.map((s) => s.ref), ['1 Corinthians 10:31', 'Romans 11:36', 'Psalm 73:25–28']);
});

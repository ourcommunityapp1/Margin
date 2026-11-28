import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toUsfm, tidyVerse, verseFromHtml } from '../usfm.ts';
import { VERSES } from '../content/verses.ts';

test('references convert to USFM', () => {
  assert.equal(toUsfm('Psalm 73:25–28'), 'PSA.73.25-28');
  assert.equal(toUsfm('1 Corinthians 10:31'), '1CO.10.31');
  assert.equal(toUsfm('Song of Solomon 2:4'), 'SNG.2.4');
  assert.equal(toUsfm('Hezekiah 1:1'), null);
  for (const [id, v] of Object.entries(VERSES)) assert.ok(toUsfm(v.ref), `${id}: ${v.ref}`);
});

test('tidying never changes a word, a capital or a mark: only spacing', () => {
  for (const t of ['“Come to Me, all who are weary and burdened, and I will give you rest.', 'and I give them eternal life, and they will never perish;',
    'for God so loved the world,', '‘Our Father, who is in heaven,', 'The LORD’S acts of mercy']) assert.equal(tidyVerse(t), t);
  assert.equal(tidyVerse('  Jesus  wept. '), 'Jesus wept.');
});

test('passage HTML reads as plain text: LORD in the Old Testament, quoted words keep their letters in the New', () => {
  const ot = '<div><div class="q"><span class="yv-v" v="14"></span><span class="yv-vlbl">14</span>Then you will take delight in the L<span class="sc">ord</span>,</div><div class="q">For the mouth of the L<span class="sc">ord</span>has spoken.”</div></div>';
  assert.equal(verseFromHtml(ot, 'Isaiah 58:14'), 'Then you will take delight in the LORD, For the mouth of the LORD has spoken.”');
  const nt = '<div><div class="p"><span class="yv-vlbl">23</span>“B<span class="sc">ehold</span>, <span class="sc">the virgin will</span> <span class="sc">conceive</span>,” which translated means, “G<span class="sc">od with us</span>.” </div></div>';
  assert.equal(verseFromHtml(nt, 'Matthew 1:23'), '“Behold, the virgin will conceive,” which translated means, “God with us.”');
});

test('markup gaps are closed, and italic words stay', () => {
  assert.equal(verseFromHtml('<div><span class="yv-vlbl">25</span><span class="it">He</span>who was delivered over</div>', 'Romans 4:25'), 'He who was delivered over');
  assert.equal(verseFromHtml('<div><span class="yv-vlbl">10</span> <span class="wj">‘</span> <span class="wj">Your kingdom come.</span></div>', 'Matthew 6:10'), '‘Your kingdom come.');
  assert.equal(verseFromHtml('<div><span class="wj">deliver us from </span><span class="wj">evil.</span> <span class="wj">’</span></div>', 'Matthew 6:13'), 'deliver us from evil.’');
  assert.equal(verseFromHtml('<div>¶The L<span class="sc">ord</span>’<span class="sc">s</span> mercy</div>', 'Lamentations 3:22'), 'The LORD’S mercy');
});

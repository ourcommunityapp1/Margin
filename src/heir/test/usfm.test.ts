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

test('stray quotation marks are dropped, real ones kept', () => {
  assert.equal(tidyVerse('“Come to Me, all who are weary and burdened, and I will give you rest.'), 'Come to Me, all who are weary and burdened, and I will give you rest.');
  assert.equal(tidyVerse('God is spirit, and those who worship Him must worship in spirit and truth.”'), 'God is spirit, and those who worship Him must worship in spirit and truth.');
  assert.equal(tidyVerse('Jesus said, “I am the way.”'), 'Jesus said, “I am the way.”');
  assert.equal(tidyVerse('‘Come to me, all you who are weary.'), 'Come to me, all you who are weary.');
  assert.equal(tidyVerse('The LORD’s mercy endures.'), 'The LORD’s mercy endures.');
});

test('a verse that runs on in the Bible reads as a sentence on its own', () => {
  assert.equal(tidyVerse('and I give them eternal life, and they will never perish;'), 'I give them eternal life, and they will never perish.');
  assert.equal(tidyVerse('for God so loved the world,'), 'For God so loved the world.');
});

test('passage HTML reads as plain text, with LORD in capitals', () => {
  const html = '<div><div class="q"><span class="yv-v" v="14"></span><span class="yv-vlbl">14</span>Then you will take delight in the L<span class="sc">ord</span>,</div><div class="q">For the mouth of the L<span class="sc">ord</span>has spoken.”</div></div>';
  assert.equal(verseFromHtml(html), 'Then you will take delight in the LORD, For the mouth of the LORD has spoken.”');
  assert.equal(tidyVerse(verseFromHtml(html)), 'Then you will take delight in the LORD, For the mouth of the LORD has spoken.');
});

test('a quotation the verse opens is closed at its end', () => {
  assert.equal(tidyVerse('Speak to the sons of Israel, saying, ‘You must keep My Sabbaths.'), 'Speak to the sons of Israel, saying, ‘You must keep My Sabbaths.’');
  assert.equal(tidyVerse('The LORD’s mercy endures.'), 'The LORD’s mercy endures.');
});

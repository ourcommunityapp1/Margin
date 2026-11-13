import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acceptFormatting, containsWords, fallbackTitle, lightFormat, sameWords, sentencesOf, splitForReread, wordsOf } from '../words.ts';

const RAW = 'i keep telling people its the money but i dont think thats it we could make the numbers work if we really wanted to i think the real reason is that leaving feels like admitting the last five years didnt work out';

test('punctuation, capitals and paragraph breaks keep the words the same', () => {
  const formatted = 'I keep telling people it’s the money, but I don’t think that’s it. We could make the numbers work if we really wanted to.\n\nI think the real reason is that leaving feels like admitting the last five years didn’t work out.';
  assert.deepEqual(sameWords(RAW, formatted), { ok: true });
});

test('an added word is caught, and says where', () => {
  const r = sameWords('we could make the numbers work', 'We could really make the numbers work.');
  assert.equal(r.ok, false);
  assert.equal(r.at, 2);
  assert.equal(r.got, 'really');
});

test('a dropped, swapped or reordered word is caught', () => {
  assert.equal(sameWords('um i think so', 'I think so.').ok, false);
  assert.equal(sameWords('the last five years', 'The last 5 years.').ok, false);
  assert.equal(sameWords('whether to move', 'Weather to move.').ok, false);
  assert.equal(sameWords('to move or when', 'When or to move.').ok, false);
  assert.equal(sameWords('i think', 'I think. In short, yes.').ok, false);
});

test('hyphens and apostrophes do not count as word changes', () => {
  assert.deepEqual(wordsOf('It’s a well-known — half-finished — idea'), ['its', 'a', 'well', 'known', 'half', 'finished', 'idea']);
  assert.equal(sameWords('dont', 'Don’t').ok, true);
});

test('formatting that keeps the words is accepted', () => {
  const r = acceptFormatting('and then theres mom shes getting older', ['And then there’s Mom. She’s getting older']);
  assert.equal(r.accepted, true);
  assert.deepEqual(r.paragraphs, ['And then there’s Mom. She’s getting older']);
});

test('formatting that changes a word is thrown away for the plain local version', () => {
  const raw = 'i guess what im saying is maybe it isnt about weather to move but when';
  const r = acceptFormatting(raw, ['I guess what I’m saying is maybe it isn’t about whether to move, but when.']);
  assert.equal(r.accepted, false);
  assert.match(r.reason ?? '', /expected "weather", got "whether"/);
  assert.equal(sameWords(raw, r.paragraphs.join(' ')).ok, true);
});

test('formatting may never add headings, lists or labels', () => {
  const raw = 'the choice is not whether to move but when';
  for (const bad of [['## The choice', 'Is not whether to move but when.'], ['- The choice is not whether to move but when'], ['**The choice** is not whether to move but when'], ['The choice:', 'is not whether to move but when']]) {
    const r = acceptFormatting(raw, bad);
    assert.equal(r.accepted, false, bad.join(' / '));
  }
  assert.equal(acceptFormatting(raw, 'The choice is not whether to move but when.').accepted, false);
  assert.equal(acceptFormatting(raw, []).accepted, false);
});

test('local formatting only tidies spacing, capitals and long-pause breaks', () => {
  const raw = 'i keep  telling people\n\n  and then theres mom';
  const out = lightFormat(raw);
  assert.deepEqual(out, ['I keep telling people', 'And then theres mom']);
  assert.equal(sameWords(raw, out.join(' ')).ok, true);
});

test('finding a phrase by its words', () => {
  assert.equal(containsWords('Maybe it isn’t about whether to move but when', '…not whether to move, but when'), false);
  assert.equal(containsWords('Maybe it isn’t about whether to move but when', 'whether to move, but when.'), true);
  assert.equal(containsWords('anything', ''), false);
});

test('sentences split after closing punctuation, keeping an unfinished tail', () => {
  assert.deepEqual(sentencesOf('It isn’t money. Is it Mom? Maybe it’s about when'), ['It isn’t money.', 'Is it Mom?', 'Maybe it’s about when']);
});

test('rereading splits off the last few sentences without changing a word', () => {
  const paragraphs = ['One. Two. Three.', 'Four. Five'];
  const { before, focus } = splitForReread(paragraphs, 3);
  assert.deepEqual(before, ['One. Two.']);
  assert.deepEqual(focus, ['Three.', 'Four. Five']);
  assert.equal(sameWords(paragraphs.join(' '), [...before, ...focus].join(' ')).ok, true);
  assert.deepEqual(splitForReread(['Only this'], 3), { before: [], focus: ['Only this'] });
});

test('a stand-in title is the opening words, and waits until there is something to go on', () => {
  assert.equal(fallbackTitle('i keep'), '');
  assert.equal(fallbackTitle('i keep telling people it’s the money, but I don’t think so'), 'I keep telling people it’s the');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canReframe, groundedPrompts, looksDark, nextMove, pauseReaction, REREAD_AFTER_MS, stuckFallback, unfinishedSpots } from '../coach.ts';
import { faithfulVersions, localVersions, unfaithful } from '../reformat.ts';
import { containsWords } from '../words.ts';

const MOVE = [
  'I keep telling people it’s the money, but I don’t think that’s it. We could make the numbers work if we really wanted to.',
  'I think the real reason is that leaving feels like admitting the last five years didn’t work out. Like I’d be quitting on something I said out loud I’d stay for.',
  'And then there’s Mom. She’s getting older, and every time I visit I notice something new she can’t do anymore.',
  'I guess what I’m saying is maybe it isn’t about whether to move but when',
];
const finished = (n: number) => Array.from({ length: n }, (_, i) => `This is finished sentence number ${i} and it says one whole thing.`);

test('a short note gets "keep going"', () => {
  assert.equal(nextMove({ paragraphs: ['I keep telling people it’s the money but'], rereadSinceChange: false }).kind, 'keep_going');
});

test('an unfinished thought gets "come back to it", quoting the spot', () => {
  const m = nextMove({ paragraphs: MOVE, rereadSinceChange: false });
  assert.equal(m.kind, 'come_back');
  assert.equal(m.spot?.paragraph, 3);
  assert.match(m.line, /to move but when/);
  assert.equal(containsWords(MOVE.join(' '), m.spot!.quote), true);
});

test('a long, finished note that hasn’t been reread gets "read it over"', () => {
  const paragraphs = [finished(12).join(' '), finished(12).join(' ')];
  assert.equal(nextMove({ paragraphs, rereadSinceChange: false }).kind, 'read_over');
  assert.equal(nextMove({ paragraphs, rereadSinceChange: true }).kind, 'keep_going');
});

test('everything else defaults to "keep going"; stuck and reframe are never pushed', () => {
  const m = nextMove({ paragraphs: [finished(9).join(' ')], rereadSinceChange: false });
  assert.equal(m.kind, 'keep_going');
  for (const p of [[], MOVE, [finished(40).join(' ')]]) {
    assert.ok(['keep_going', 'come_back', 'read_over'].includes(nextMove({ paragraphs: p, rereadSinceChange: false }).kind));
  }
});

test('reframing waits for enough material', () => {
  assert.equal(canReframe(['Too short to reframe.']), false);
  assert.equal(canReframe(MOVE), true);
});

test('unfinished spots: open endings and trailing words, not finished sentences', () => {
  assert.deepEqual(unfinishedSpots(['All done here. Nothing left open.']), []);
  assert.equal(unfinishedSpots(['I was going to say that… Anyway, it worked out.']).length, 1);
  assert.equal(unfinishedSpots(['We stayed because', 'It was fine.'])[0].paragraph, 0);
});

test('a long pause while talking brings the words back; typing ignores pauses', () => {
  const base = { listening: true, hasText: true };
  assert.equal(pauseReaction({ ...base, mode: 'talk', silentMs: REREAD_AFTER_MS }), 'reread');
  assert.equal(pauseReaction({ ...base, mode: 'talk', silentMs: REREAD_AFTER_MS - 1 }), 'none');
  assert.equal(pauseReaction({ ...base, mode: 'type', silentMs: 10 * 60_000 }), 'none');
  assert.equal(pauseReaction({ ...base, mode: 'talk', silentMs: 60_000, hasText: false }), 'none');
  assert.equal(pauseReaction({ mode: 'talk', listening: false, hasText: true, silentMs: 60_000 }), 'none');
});

test('prompts must quote the note’s own words; at most three survive', () => {
  const text = MOVE.join('\n\n');
  const kept = groundedPrompts([
    { text: 'You named what leaving would admit. What would staying admit?', quote: 'leaving feels like admitting' },
    { text: 'What are you grateful for today?', quote: '' },
    { text: 'What is underneath this?', quote: 'the fear of failure' },
    { text: 'When, then?', quote: '“whether to move but when”' },
    { text: 'The numbers come up twice. Is a money worry still in here?', quote: 'make the numbers work' },
    { text: 'What does “anymore” cover?', quote: 'anymore' },
  ], text);
  assert.equal(kept.length, 3);
  assert.deepEqual(kept.map((p) => p.quote), ['leaving feels like admitting', 'whether to move but when', 'make the numbers work']);
});

test('flattery, therapy-speak and steering are dropped', () => {
  const text = MOVE.join(' ');
  const quote = 'the real reason';
  const kept = groundedPrompts([
    { text: 'That’s so valid. What else?', quote },
    { text: 'It sounds like you’re feeling guilty about leaving.', quote },
    { text: 'Great insight here. Say more?', quote },
    { text: 'You should talk to your mom about this.', quote },
    { text: 'Have you considered that staying is the braver choice?', quote },
  ], text);
  assert.deepEqual(kept, []);
});

test('dark content is recognised so the coach can step back', () => {
  assert.equal(looksDark('Some days I think everyone would be better off without me.'), true);
  assert.equal(looksDark('I don’t want to be here anymore'), true);
  assert.equal(looksDark('This deadline is killing me and I want to end this project.'), false);
  assert.equal(looksDark(MOVE.join(' ')), false);
});

test('stuck help hands back the user’s own last words', () => {
  for (const kind of ['point', 'thought'] as const) {
    const [p] = stuckFallback(kind, MOVE);
    assert.equal(groundedPrompts([p], MOVE.join(' ')).length, 1);
  }
  assert.deepEqual(stuckFallback('point', []), []);
});

test('a reformat version is only kept if every sentence is the user’s own', () => {
  const text = MOVE.join('\n\n');
  const ok = { label: 'As a decision', blocks: [{ k: 'The choice', v: 'whether to move but when' }, { k: 'Pulls me to stay', v: 'leaving feels like admitting the last five years didn’t work out.' }] };
  const invented = { label: 'As questions', blocks: [{ k: 'Circling', v: 'What am I actually afraid of admitting?' }] };
  const longLabel = { label: 'As a story', blocks: [{ k: 'What I really think deep down inside', v: 'And then there’s Mom.' }] };
  assert.equal(unfaithful(ok, text), null);
  assert.match(unfaithful(invented, text) ?? '', /not in the note/);
  assert.match(unfaithful(longLabel, text) ?? '', /label too long/);
  assert.deepEqual(faithfulVersions([invented, ok, longLabel, ok], text).map((v) => v.label), ['As a decision']);
});

test('the built-in arrangements are always faithful', () => {
  const versions = localVersions(MOVE);
  assert.equal(versions.length, 2);
  assert.deepEqual(localVersions(['One whole paragraph with no stops', 'And another one']).map((v) => v.label), ['Last thought first']);
  for (const v of versions) assert.equal(unfaithful(v, MOVE.join('\n\n')), null, v.label);
  assert.deepEqual(localVersions(['One']), []);
});

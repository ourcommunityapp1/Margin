import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addSpeech, addUnclear, snapshot, withLayout, withTypedText } from '../note.ts';
import { withInferredTitle, withUserTitle } from '../title.ts';
import { newNote } from '../types.ts';
import { acceptFormatting, sameWords } from '../words.ts';

const RAW = ['i keep telling people its the money but i dont think thats it', 'we could make the numbers work', 'and then theres mom shes getting older'];
const FORMATTED = [['I keep telling people it’s the money, but I don’t think that’s it.'], ['We could make the numbers work.'], ['And then there’s Mom. She’s getting older']];

test('a whole note built from speech holds exactly the words that were heard', () => {
  let n = newNote('n1');
  RAW.forEach((raw, i) => {
    const { paragraphs, accepted } = acceptFormatting(raw, FORMATTED[i]);
    assert.equal(accepted, true);
    n = addSpeech(n, raw, paragraphs, i === 1);
  });
  assert.equal(n.paragraphs.length, 2);
  assert.deepEqual(sameWords(RAW.join(' '), n.paragraphs.join(' ')), { ok: true });
  assert.deepEqual(sameWords(n.transcript, n.paragraphs.join(' ')), { ok: true });
  assert.equal(n.trail.paragraphs, 2);
  assert.equal(n.trail.punctuation, 4);
});

test('choosing a format never touches the words, and the original comes straight back', () => {
  let n = addSpeech(newNote('n1'), RAW[0], FORMATTED[0], false);
  n = addSpeech(n, RAW[2], FORMATTED[2], false);
  const original = n.paragraphs;
  const before = snapshot(n, 'v1', 'reformat');
  const formatted = withLayout(n, { label: 'As a story', blocks: [{ k: 'Now', v: FORMATTED[2][0] }] });
  assert.equal(before.label, 'Original');
  assert.deepEqual(formatted.paragraphs, original);
  assert.equal(snapshot(formatted, 'v2', 'revert').label, 'As a story');
  const reverted = withLayout(formatted, null);
  assert.equal(reverted.layout, null);
  assert.deepEqual(reverted.paragraphs, original);
});

test('talking after a reformat adds the new words to both the format and the original', () => {
  let n = addSpeech(newNote('n1'), RAW[0], FORMATTED[0], false);
  n = withLayout(n, { label: 'As a decision', blocks: [{ k: 'Not the reason', v: 'it’s the money' }] });
  n = addSpeech(n, RAW[1], FORMATTED[1], false);
  assert.equal(n.layout!.blocks.length, 2);
  assert.equal(n.paragraphs.length, 2);
});

test('the title lock holds through speech, typing and reformatting', () => {
  let n = withInferredTitle(newNote('n1'), 'The money');
  n = withUserTitle(n, 'Why I stay');
  n = addSpeech(n, RAW[0], FORMATTED[0], false);
  n = withInferredTitle(n, 'Putting off the move');
  n = withTypedText(n, 'One thought.\n\nAnother thought.');
  n = withInferredTitle(withLayout(n, null), 'Two thoughts');
  assert.equal(n.title, 'Why I stay');
  assert.deepEqual(n.paragraphs, ['One thought.', 'Another thought.']);
});

test('unclear words are counted in the trail and never change the text', () => {
  const n = addSpeech(newNote('n1'), RAW[0], FORMATTED[0], false);
  const flagged = addUnclear(n, [{ word: 'money', context: 'its the money but' }]);
  assert.equal(flagged.trail.flagged, 1);
  assert.deepEqual(flagged.paragraphs, n.paragraphs);
  assert.equal(addUnclear(n, []), n);
});

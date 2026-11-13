import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withInferredTitle, withUserTitle } from '../title.ts';

const blank = { title: '', titleEdited: false };

test('the title fills itself in, and keeps updating while untouched', () => {
  const a = withInferredTitle(blank, 'Putting off the move');
  assert.deepEqual(a, { title: 'Putting off the move', titleEdited: false });
  assert.equal(withInferredTitle(a, 'Not whether, but when.').title, 'Not whether, but when');
});

test('a title the user edited is never overwritten', () => {
  const mine = withUserTitle(withInferredTitle(blank, 'Putting off the move'), 'Mom and the move');
  assert.equal(mine.titleEdited, true);
  const after = withInferredTitle(mine, 'Something the app thought of');
  assert.equal(after.title, 'Mom and the move');
  assert.equal(after, mine);
});

test('clearing the title still counts as editing it', () => {
  const cleared = withUserTitle({ title: 'Putting off the move', titleEdited: false }, '');
  assert.equal(withInferredTitle(cleared, 'Putting off the move').title, '');
});

test('an empty or unchanged inferred title changes nothing', () => {
  const a = { title: 'Same', titleEdited: false };
  assert.equal(withInferredTitle(a, '  '), a);
  assert.equal(withInferredTitle(a, 'Same'), a);
});

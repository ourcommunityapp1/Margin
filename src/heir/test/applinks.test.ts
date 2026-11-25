import test from 'node:test';
import assert from 'node:assert/strict';
import { androidAssetLinks, appleAssociation } from '../applinks.ts';

const FP = Array.from({ length: 32 }, (_, i) => i.toString(16).padStart(2, '0')).join(':').toUpperCase();

test('Apple file needs a 10-character Team ID', () => {
  assert.equal(appleAssociation(undefined), null);
  assert.equal(appleAssociation('short'), null);
  assert.match(JSON.stringify(appleAssociation('ABCDE12345')), /ABCDE12345\.com\.katekize\.katekize/);
});

test('Android file needs valid fingerprints', () => {
  assert.equal(androidAssetLinks(''), null);
  assert.equal(androidAssetLinks('nope'), null);
  assert.ok(JSON.stringify(androidAssetLinks(FP.toLowerCase())).includes(FP));
  assert.notEqual(androidAssetLinks(`${FP}, ${FP}`), null);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openStore } from '../store.ts';

const context = (token: string) =>
  Buffer.from(JSON.stringify({ siteID: 'site', token, edgeURL: 'https://blobs.test', uncachedEdgeURL: 'https://blobs.test' })).toString('base64');

test('on Netlify each call uses the request’s Blobs credentials, which expire', async () => {
  const sent: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    sent.push(new Headers(init?.headers).get('authorization') ?? '');
    return new Response(null, { status: 404 });
  }) as typeof fetch;
  try {
    process.env.NETLIFY_BLOBS_CONTEXT = context('first-request');
    const store = await openStore('renewed-credentials');
    assert.equal(store.kind, 'blobs');
    assert.equal(await store.get('clips/a.mp3'), null);
    // A later request on the same warm server brings new credentials.
    process.env.NETLIFY_BLOBS_CONTEXT = context('later-request');
    assert.equal(await store.has('clips/a.mp3'), false);
    assert.deepEqual(sent, ['Bearer first-request', 'Bearer later-request']);
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.NETLIFY_BLOBS_CONTEXT;
  }
});

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { allowance, clipId, clipKey, forgetCached, makeClip, type VoiceDeps } from '../clips.ts';
import { ElevenLabsError, elevenLabs, type ElevenLabs, type ModelInfo, type Plan } from '../elevenlabs.ts';
import { mp3Response, voiceSample } from '../server.ts';
import { CHOICES, VOICES, voiceFor } from '../voices.ts';
import { fileStore } from '../../server/store.ts';

const MODELS: ModelInfo[] = [
  { id: 'eleven_v4', tts: true, rate: 1 },
  { id: 'eleven_v4_turbo', tts: true, rate: 0.5 },
  { id: 'eleven_multilingual_v2', tts: true, rate: 1 },
  { id: 'eleven_flash_v2_5', tts: true, rate: 0.5 },
];

function fakeApi(o: { plan?: Plan | Error; models?: ModelInfo[] | Error; fail?: (model: string) => Error | null } = {}) {
  const calls: { text: string; voice: string; model: string }[] = [];
  const api: ElevenLabs = {
    models: async () => { if (o.models instanceof Error) throw o.models; return o.models ?? MODELS; },
    plan: async () => { if (o.plan instanceof Error) throw o.plan; return o.plan ?? { tier: 'creator', limit: 100_000, used: 10_000, resetsAt: 1_800_000_000 }; },
    speak: async (text, voice, model) => {
      const err = o.fail?.(model);
      if (err) throw err;
      calls.push({ text, voice, model });
      return new TextEncoder().encode(`mp3:${model}:${text}`);
    },
  };
  return { api, calls };
}

const deps = (api: ElevenLabs | null, extra: Partial<VoiceDeps> = {}): VoiceDeps => ({
  store: fileStore(mkdtempSync(path.join(tmpdir(), 'margin-voice-'))), api, share: 0.05, fallbackCredits: 1500, durable: true, ...extra,
});

beforeEach(() => forgetCached());

test('a clip is the same text in the same voice from the same kind of model', () => {
  assert.equal(clipId('In the  beginning\n', VOICES.bsb.id, 'quick'), clipId('In the beginning', VOICES.bsb.id, 'quick'));
  assert.notEqual(clipId('Amen.', VOICES.host.id, 'quick'), clipId('Amen.', VOICES.host.id, 'ahead'));
  assert.notEqual(clipId('Amen.', VOICES.henry.id, 'ahead'), clipId('Amen.', VOICES.spurgeon.id, 'ahead'));
  assert.equal(voiceFor('jerome'), voiceFor('augustine'), 'minor Fathers share a voice');
});

test('a voice the listener chose reads instead of the default; one not on the list is ignored', async () => {
  const { api, calls } = fakeApi();
  const d = deps(api);
  const brian = CHOICES.find((c) => c.name === 'Brian')!;
  const chosen = await makeClip(d, { text: 'Grace to you.', speaker: 'bsb', kind: 'scripture', voiceId: brian.id });
  const usual = await makeClip(d, { text: 'Grace to you.', speaker: 'bsb', kind: 'scripture' });
  assert.ok(chosen.ok && usual.ok && !usual.cached && chosen.id !== usual.id, 'each voice is its own clip');
  assert.deepEqual(calls.map((c) => c.voice), [brian.id, VOICES.bsb.id]);
  const named = await makeClip(d, { text: 'Grace to you.', speaker: 'bsb', kind: 'scripture', voiceId: VOICES.bsb.id });
  assert.ok(named.ok && named.cached && usual.ok && named.id === usual.id, 'choosing the default voice is the default clip');
  const stranger = await makeClip(d, { text: 'Grace to you.', speaker: 'bsb', kind: 'scripture', voiceId: 'notAVoiceOnTheList000' });
  assert.ok(stranger.ok && stranger.cached && usual.ok && stranger.id === usual.id);
  assert.equal(calls.length, 2);
  for (const v of Object.values(VOICES)) assert.ok(CHOICES.some((c) => c.id === v.id), `${v.name} can be chosen again`);
  assert.equal(new Set(CHOICES.map((c) => c.id)).size, CHOICES.length);
});

test('a voice sample is fetched once and served as audio, in byte ranges too', async () => {
  const store = fileStore(mkdtempSync(path.join(tmpdir(), 'margin-sample-')));
  let fetched = 0;
  const get = (async () => { fetched++; return new Response(new Uint8Array([1, 2, 3, 4, 5]), { headers: { 'content-type': 'text/plain' } }); }) as unknown as typeof fetch;
  const first = await voiceSample(store, CHOICES[0], get);
  const again = await voiceSample(store, CHOICES[0], get);
  assert.deepEqual([...first!], [1, 2, 3, 4, 5]);
  assert.deepEqual([...again!], [1, 2, 3, 4, 5]);
  assert.equal(fetched, 1);
  const whole = mp3Response(new Request('https://margin.test/s'), first!, 'private');
  assert.equal(whole.headers.get('content-type'), 'audio/mpeg');
  assert.equal(whole.headers.get('content-length'), '5');
  const part = mp3Response(new Request('https://margin.test/s', { headers: { range: 'bytes=1-2' } }), first!, 'private');
  assert.equal(part.status, 206);
  assert.equal(part.headers.get('content-range'), 'bytes 1-2/5');
  assert.deepEqual([...new Uint8Array(await part.arrayBuffer())], [2, 3]);
  const tail = mp3Response(new Request('https://margin.test/s', { headers: { range: 'bytes=-2' } }), first!, 'private');
  assert.deepEqual([...new Uint8Array(await tail.arrayBuffer())], [4, 5]);
  assert.equal(mp3Response(new Request('https://margin.test/s', { headers: { range: 'bytes=9-' } }), first!, 'private').status, 416);
  const missing = (async () => new Response('gone', { status: 404 })) as unknown as typeof fetch;
  assert.equal(await voiceSample(store, CHOICES[1], missing), null);
  assert.equal(await store.has(`samples/${CHOICES[1].id}.mp3`), false, 'a failed fetch isn’t kept');
});

test('what someone is waiting for gets v4 Turbo, what is made ahead gets v4; a clip is made once', async () => {
  const { api, calls } = fakeApi();
  const d = deps(api);
  const first = await makeClip(d, { text: 'The LORD is my shepherd; I shall not want.', speaker: 'bsb', kind: 'scripture' });
  assert.ok(first.ok && !first.cached && first.model === 'eleven_v4_turbo' && first.credits === 21, 'half a credit a character');
  const again = await makeClip(d, { text: 'The LORD is my shepherd; I shall not want.', speaker: 'bsb', kind: 'scripture' });
  assert.ok(again.ok && again.cached);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].voice, 'C9fbwSpEaejywLWx722Z');
  const ahead = await makeClip(d, { text: 'He makes me lie down in green pastures.', speaker: 'bsb', kind: 'scripture', when: 'ahead' });
  assert.ok(ahead.ok && ahead.model === 'eleven_v4' && ahead.credits === 39);
  const answer = await makeClip(d, { text: 'Paul means a gift, not a wage.', speaker: 'host', kind: 'answer', when: 'ahead' });
  assert.ok(answer.ok && answer.model === 'eleven_v4_turbo', 'answers are always awaited');
  assert.ok(await d.store.has(clipKey(first.ok ? first.id : '')));
});

test('a clip made by either model is reused, the fuller reading first', async () => {
  const { api, calls } = fakeApi();
  const d = deps(api);
  const made = await makeClip(d, { text: 'He restores my soul.', speaker: 'bsb', kind: 'scripture', when: 'ahead' });
  const now = await makeClip(d, { text: 'He restores my soul.', speaker: 'bsb', kind: 'scripture' });
  assert.ok(made.ok && now.ok && now.cached && now.id === made.id, 'the v4 clip serves a request that is wanted now');
  const quick = await makeClip(d, { text: 'Selah.', speaker: 'host', kind: 'intro' });
  const later = await makeClip(d, { text: 'Selah.', speaker: 'host', kind: 'intro', when: 'ahead' });
  assert.ok(quick.ok && later.ok && later.cached && later.id === quick.id, 'nor is a Turbo clip paid for again');
  assert.equal(calls.length, 2);
});

test('Margin stops at its share of the plan, minus a small reserve, and says so', async () => {
  const { api, calls } = fakeApi({ plan: { limit: 20_000, used: 0, resetsAt: 1 } });
  const d = deps(api);
  const a = await allowance(d);
  assert.equal(a.credits, 1000 - 300);
  const long = 'x'.repeat(650);
  assert.ok((await makeClip(d, { text: long, speaker: 'henry', kind: 'comment', when: 'ahead' })).ok);
  const over = await makeClip(d, { text: 'y'.repeat(100), speaker: 'henry', kind: 'comment', when: 'ahead' });
  assert.ok(!over.ok && over.status === 402);
  assert.equal(calls.length, 1, 'nothing was sent once the allowance was used');
  assert.equal((await allowance(d)).spent, 650);
  const cached = await makeClip(d, { text: long, speaker: 'henry', kind: 'comment', when: 'ahead' });
  assert.ok(cached.ok && cached.cached, 'clips already made still play');
});

test('never past what is left on the plan itself', async () => {
  const { api } = fakeApi({ plan: { limit: 1_000_000, used: 999_990, resetsAt: 1 } });
  const r = await makeClip(deps(api), { text: 'A sentence longer than ten characters.', speaker: 'host', kind: 'intro' });
  assert.ok(!r.ok && r.status === 402);
});

test('when the key can’t read the plan, the fixed allowance applies', async () => {
  const { api } = fakeApi({ plan: new ElevenLabsError(401, 'missing_permissions', 'missing user_read') });
  const d = deps(api, { fallbackCredits: 50 });
  assert.equal((await allowance(d)).credits, 50);
  assert.ok((await makeClip(d, { text: 'x'.repeat(40), speaker: 'host', kind: 'intro', when: 'ahead' })).ok);
  const r = await makeClip(d, { text: 'z'.repeat(40), speaker: 'host', kind: 'intro', when: 'ahead' });
  assert.ok(!r.ok && r.status === 402);
});

test('a model the account lacks is skipped; one that fails falls through to the next', async () => {
  const listed = fakeApi({ models: MODELS.filter((m) => !m.id.startsWith('eleven_v4')) });
  const r1 = await makeClip(deps(listed.api), { text: 'He restores my soul.', speaker: 'bsb', kind: 'scripture', when: 'ahead' });
  assert.ok(r1.ok && r1.model === 'eleven_multilingual_v2');
  forgetCached();
  const r2 = await makeClip(deps(listed.api), { text: 'He restores my soul.', speaker: 'host', kind: 'answer' });
  assert.ok(r2.ok && r2.model === 'eleven_flash_v2_5');

  forgetCached();
  const unknown = fakeApi({
    models: new ElevenLabsError(401, 'missing_permissions', 'missing models_read'),
    fail: (m) => (m.startsWith('eleven_v4') ? new ElevenLabsError(400, 'model_not_found', 'no such model') : null),
  });
  const du = deps(unknown.api);
  const r3 = await makeClip(du, { text: 'He leads me beside quiet waters.', speaker: 'bsb', kind: 'scripture', when: 'ahead' });
  assert.ok(r3.ok && r3.model === 'eleven_multilingual_v2');
  const r4 = await makeClip(du, { text: 'He leads me beside quiet waters.', speaker: 'bsb', kind: 'scripture' });
  assert.ok(r4.ok && r4.cached, 'the fallback clip is reused');
  const r5 = await makeClip(du, { text: 'Your rod and Your staff, they comfort me.', speaker: 'bsb', kind: 'scripture' });
  assert.ok(r5.ok && r5.model === 'eleven_flash_v2_5');
});

test('an exhausted account, a bad voice or no key means the device voice', async () => {
  const broke = fakeApi({ fail: () => new ElevenLabsError(401, 'quota_exceeded', 'This request exceeds your quota') });
  const r1 = await makeClip(deps(broke.api), { text: 'Selah.', speaker: 'host', kind: 'intro' });
  assert.ok(!r1.ok && r1.status === 402);
  const badVoice = fakeApi({ fail: () => new ElevenLabsError(400, 'voice_not_found', 'A voice with that ID was not found') });
  const r2 = await makeClip(deps(badVoice.api), { text: 'Selah.', speaker: 'host', kind: 'intro' });
  assert.ok(!r2.ok && r2.status === 503);
  const r3 = await makeClip(deps(null), { text: 'Selah.', speaker: 'host', kind: 'intro' });
  assert.ok(!r3.ok && r3.status === 503);
  const r4 = await makeClip(deps(null), { text: ' ', speaker: 'host', kind: 'intro' });
  assert.ok(!r4.ok && r4.status === 400);
});

test('without lasting storage for the tally, no new clips are made; made ones still play', async () => {
  const { api, calls } = fakeApi();
  const d = deps(api);
  const made = await makeClip(d, { text: 'Grace and peace to you.', speaker: 'host', kind: 'intro' });
  const forgetful = { ...d, durable: false };
  const again = await makeClip(forgetful, { text: 'Grace and peace to you.', speaker: 'host', kind: 'intro' });
  assert.ok(made.ok && again.ok && again.cached);
  const fresh = await makeClip(forgetful, { text: 'A new sentence.', speaker: 'host', kind: 'intro' });
  assert.ok(!fresh.ok && fresh.status === 503);
  assert.equal(calls.length, 1);
});

test('the client speaks the ElevenLabs API: key header, model, format, errors', async () => {
  const seen: { url: string; init: RequestInit }[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    seen.push({ url, init });
    if (url.endsWith('/v1/user/subscription')) return Response.json({ tier: 'creator', character_limit: 121000, character_count: 500, next_character_count_reset_unix: 1790000000 });
    if (url.endsWith('/v1/models')) return Response.json([{ model_id: 'eleven_v4', can_do_text_to_speech: true, model_rates: { character_cost_multiplier: 1 } }, { model_id: 'eleven_english_sts_v2', can_do_text_to_speech: false }]);
    if (url.includes('/v1/text-to-speech/bad')) return Response.json({ detail: { status: 'voice_not_found', message: 'nope' } }, { status: 400 });
    return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'audio/mpeg' } });
  }) as typeof fetch;
  const api = elevenLabs({ apiKey: 'k', base: 'https://el.test', fetch: fetcher });
  assert.deepEqual(await api.plan(), { tier: 'creator', limit: 121000, used: 500, resetsAt: 1790000000 });
  assert.deepEqual((await api.models()).map((m) => [m.id, m.tts, m.rate]), [['eleven_v4', true, 1], ['eleven_english_sts_v2', false, 1]]);
  assert.deepEqual([...await api.speak('Hi.', 'v1', 'eleven_v4')], [1, 2, 3]);
  const last = seen.at(-1)!;
  assert.equal(last.url, 'https://el.test/v1/text-to-speech/v1?output_format=mp3_44100_64');
  assert.equal((last.init.headers as Record<string, string>)['xi-api-key'], 'k');
  assert.deepEqual(JSON.parse(String(last.init.body)), { text: 'Hi.', model_id: 'eleven_v4' });
  await assert.rejects(api.speak('Hi.', 'bad', 'eleven_v4'), (e: ElevenLabsError) => e.status === 400 && e.code === 'voice_not_found' && !e.modelProblem);
});

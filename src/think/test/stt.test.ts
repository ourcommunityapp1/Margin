import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unclearWords } from '../stt.ts';
import { elevenLabs } from '../../voice/elevenlabs.ts';

test('words the speech model was unsure of become questions, at most two per stretch', () => {
  const heard = 'maybe it is not about weather to move but when'.split(' ').map((text) => ({ text, logprob: -0.05 }));
  heard[5].logprob = -2.3;
  heard[1].logprob = -3; // "it": too short to be worth asking about
  const out = unclearWords(heard);
  assert.deepEqual(out, [{ word: 'weather', context: 'is not about weather to move but' }]);
  assert.deepEqual(unclearWords(heard.map((w) => ({ text: w.text }))), []);
  assert.equal(unclearWords(heard.map((w) => ({ ...w, logprob: -5 }))).length, 2);
});

test('transcribe posts the recording and returns the words verbatim', async () => {
  let sent: { url: string; form: FormData; key: string | null } | undefined;
  const fake = (async (url: string | URL | Request, init?: RequestInit) => {
    sent = { url: String(url), form: init!.body as FormData, key: new Headers(init!.headers).get('xi-api-key') };
    return Response.json({
      language_code: 'en', text: ' I keep telling people ',
      words: [
        { text: 'I', type: 'word', logprob: -0.1 }, { text: ' ', type: 'spacing' }, { text: 'keep', type: 'word', logprob: -0.2 },
        { text: '(laughs)', type: 'audio_event' }, { text: 'telling', type: 'word' }, { text: 'people', type: 'word' },
      ],
    });
  }) as typeof fetch;
  const api = elevenLabs({ apiKey: 'k', base: 'https://stt.test', fetch: fake });
  const t = await api.transcribe(new Blob(['audio']), { modelId: 'some-model' });
  assert.equal(sent!.url, 'https://stt.test/v1/speech-to-text');
  assert.equal(sent!.key, 'k');
  assert.equal(sent!.form.get('model_id'), 'some-model');
  assert.equal(sent!.form.get('tag_audio_events'), 'false');
  assert.ok(sent!.form.get('file') instanceof Blob);
  assert.equal(t.text, 'I keep telling people');
  assert.deepEqual(t.words.map((w) => w.text), ['I', 'keep', 'telling', 'people']);
});

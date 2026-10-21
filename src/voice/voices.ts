// Who speaks with which ElevenLabs voice, and which model voices a clip.
//
// Every voice here is one of ElevenLabs' default voices or already in the account's own voice
// list, so none needs adding from the shared library first.

export interface Voice { id: string; name: string }

export const VOICES: Record<string, Voice> = {
  // Scripture: a calm audiobook narrator, steady over long readings.
  bsb: { id: 'C9fbwSpEaejywLWx722Z', name: 'Marcus' },
  // The host introduces passages, answers questions and gives the AI disclosures.
  host: { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },
  // Matthew Henry: a warm British storyteller.
  henry: { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George' },
  // Spurgeon: a deep, dramatic English voice for the Victorian preacher.
  spurgeon: { id: 'fjnwTZkKtQOJaYzGLa6n', name: 'William' },
  augustine: { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill' },
  chrysostom: { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel' },
};

// The other Fathers in the Catena (Jerome, Ambrose, Bede…) share one voice.
export const FATHERS_VOICE: Voice = VOICES.augustine;

export const voiceFor = (speaker: string): Voice => VOICES[speaker] ?? FATHERS_VOICE;

// How soon a clip is needed decides the model:
// - Anything someone is waiting for (a passage as it plays, a spoken answer) gets Eleven v4
//   Turbo: it starts speaking in a fraction of a second and costs about half the credits.
// - Clips prepared ahead of time, with no one waiting, get Eleven v4, the most natural reading.
// Either way a clip is made once and kept. If the account can't use a model, the one after it
// is used instead.
export type Kind = 'scripture' | 'comment' | 'intro' | 'answer';
export type When = 'now' | 'ahead';

export const MODELS: Record<'quick' | 'ahead', string[]> = {
  quick: [process.env.MARGIN_TTS_FAST_MODEL, 'eleven_v4_turbo', 'eleven_flash_v2_5'].filter((m): m is string => !!m),
  ahead: [process.env.MARGIN_TTS_MODEL, 'eleven_v4', 'eleven_multilingual_v2'].filter((m): m is string => !!m),
};

// Answers are always awaited, so they're always quick.
export const speedFor = (kind: Kind, when: When = 'now'): 'quick' | 'ahead' => (kind !== 'answer' && when === 'ahead' ? 'ahead' : 'quick');

export const isKind = (k: unknown): k is Kind => k === 'scripture' || k === 'comment' || k === 'intro' || k === 'answer';

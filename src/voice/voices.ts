// Who speaks with which ElevenLabs voice, and which model voices a clip.
//
// Every voice here is one of ElevenLabs' default voices or already in the account's own voice
// list, so none needs adding from the shared library first. These are the defaults; the
// listener can choose another for each part in the app.

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

// The voices a listener can choose from in the app, each part separately. Like the defaults,
// each is an ElevenLabs default voice or already in the account's voice list, and each has a
// short sample from ElevenLabs that costs nothing to hear.
export interface Choice extends Voice { about: string; sample: string }

const SAMPLES = 'https://storage.googleapis.com/eleven-public-prod/';

export const CHOICES: Choice[] = [
  { id: 'C9fbwSpEaejywLWx722Z', name: 'Marcus', about: 'American · relaxed audiobook narrator', sample: `${SAMPLES}database/workspace/26274c111a484745893fe281ed3a000b/voices/C9fbwSpEaejywLWx722Z/URnM7GoxLCf5EF9SYq68.mp3` },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', about: 'American · deep, resonant, comforting', sample: `${SAMPLES}premade/voices/nPczCjzI2devNBz1zQrb/2dd3e72c-4fd3-42f1-93ea-abc5d4e5aa1d.mp3` },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', about: 'American · older, wise, friendly', sample: `${SAMPLES}premade/voices/pqHfZKP75CvOlQylNhV4/d782b3ff-84ba-4029-848c-acf01285524d.mp3` },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', about: 'British · warm storyteller', sample: `${SAMPLES}premade/voices/JBFqnCBsd6RMkjVDRZzb/e6206d1a-0721-4787-aafb-06a6e705cac5.mp3` },
  { id: 'fjnwTZkKtQOJaYzGLa6n', name: 'William', about: 'British · older, deep, dramatic', sample: `${SAMPLES}database/workspace/8d3368b39a7842109caf6a0dbc3d8fbf/voices/fjnwTZkKtQOJaYzGLa6n/jSjySXbOFSLH2OtRz11b.mp3` },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', about: 'British · steady broadcaster', sample: `${SAMPLES}premade/voices/onwK4e9ZLuTAKqWW03F9/7eee0236-1a72-4b86-b303-5dcadc007ba9.mp3` },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', about: 'American · confident, reassuring', sample: `${SAMPLES}premade/voices/EXAVITQu4vr4xnSDxMaL/01a3e33c-6e99-4ee7-8543-ff2216a32186.mp3` },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', about: 'American · warm alto, professional', sample: `${SAMPLES}premade/voices/XrExE9yKIg1WjnnlVkGX/b930e18d-6b4d-466e-bab2-0ae97c6d8535.mp3` },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', about: 'American · young, bright, playful', sample: `${SAMPLES}premade/voices/cgSgspJ2msm6clMCkdW9/56a97bf8-b69b-448f-846c-c3a11683d45a.mp3` },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', about: 'British · clear, friendly teacher', sample: `${SAMPLES}premade/voices/Xb7hH8MSUJpSbSDYk0k2/d10f7534-11f6-41fe-a012-2de1e482d336.mp3` },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', about: 'British · velvety, warm', sample: `${SAMPLES}premade/voices/pFZP5JQG7iQjIQuC4Bku/89b68b35-b3dd-4348-a84a-a3c13a3c2b30.mp3` },
  { id: '56bWURjYFHyYyVf490Dp', name: 'Emma', about: 'Australian · calm, conversational', sample: `${SAMPLES}database/workspace/9858613edd654f5fb93ca9200b0102af/voices/56bWURjYFHyYyVf490Dp/wwX8nkhOs7XXZOoJz328.mp3` },
];

// The voice a speaker is read in: the listener's choice when it's on the list, else the default.
export const voiceFor = (speaker: string, chosen?: string): Voice =>
  CHOICES.find((c) => c.id === chosen) ?? VOICES[speaker] ?? FATHERS_VOICE;

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

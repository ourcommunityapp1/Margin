// Deep Think's data shapes. A note's words live in `paragraphs` and are only ever the user's own;
// a chosen format (`layout`) is an arrangement of those same words, kept beside them so the
// original is always one tap away.

export interface Block {
  // A short neutral label set in the UI face. Never part of the user's words.
  k?: string;
  // The user's own words.
  v: string;
}

export interface Layout { label: string; blocks: Block[] }

// What the app touched, for the authorship trail.
export interface Trail { punctuation: number; paragraphs: number; flagged: number }

// A word the transcription wasn't sure of. It becomes a question; it is never changed silently.
export interface Unclear { word: string; context: string }

export interface Note {
  id: string;
  folderId: string | null;
  title: string;
  // True once the user has typed in the title. From then on the app never changes it.
  titleEdited: boolean;
  paragraphs: string[];
  layout: Layout | null;
  // The words as they were heard, before punctuation and spacing.
  transcript: string;
  unclear: Unclear[];
  trail: Trail;
  // What the note is doing (express, explore, explain, persuade, tell), once the coach has read it.
  perspective: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteVersion {
  id: string;
  noteId: string;
  label: string;
  title: string;
  paragraphs: string[];
  layout: Layout | null;
  reason: 'reformat' | 'revert' | 'edit';
  createdAt: string;
}

export interface Folder { id: string; name: string; position: number }

export interface Profile { topics: string[]; goals: string[]; onboardedAt: string }

export type Perspective = 'express' | 'explore' | 'explain' | 'persuade' | 'tell';

export interface Prompt { text: string; quote: string }

export interface Suggestions {
  // True when the coach has stepped back (dark content). Nothing else is shown.
  quiet: boolean;
  perspective: Perspective | null;
  prompts: Prompt[];
  fixes: Prompt[];
  tip: Prompt | null;
}

export interface Link { title: string; url: string; domain: string }

export const emptyTrail = (): Trail => ({ punctuation: 0, paragraphs: 0, flagged: 0 });

export function newNote(id: string, now = new Date()): Note {
  const at = now.toISOString();
  return {
    id, folderId: null, title: '', titleEdited: false, paragraphs: [], layout: null, transcript: '',
    unclear: [], trail: emptyTrail(), perspective: null, createdAt: at, updatedAt: at,
  };
}

export const noteText = (n: Pick<Note, 'paragraphs'>) => n.paragraphs.join('\n\n');

// Heir's content and progress shapes.

export type Track = 'adult' | 'child';

export interface MeaningQuestion {
  // The words in the text this question is about.
  phrase: string;
  question: string;
  answer: string;
  // Three wrong answers that sound reasonable to someone who has not thought about it.
  distractors: [string, string, string];
  // A sentence shown after answering, in plain words.
  explain: string;
}

export interface Item {
  id: string;
  collection: string;
  // Order within its collection, starting at 1.
  number: number;
  // What cues recall: the catechism question, or a prompt for a creed section.
  prompt: string;
  // The exact words to memorize.
  text: string;
  // The same words split into pieces. Joined with spaces they must equal `text`.
  chunks: Record<Track, string[]>;
  meaning: MeaningQuestion[];
  // Scripture references connected to the item (a catechism's proof texts).
  connected: string[];
  // False until the owner has read and approved this item.
  reviewed: boolean;
}

export interface Collection {
  id: string;
  title: string;
  kind: 'catechism' | 'creed' | 'scripture';
  // How a single item is named in this collection ("Question", "Section").
  unit: string;
  source: string;
  items: Item[];
}

export interface Member {
  id: string;
  name: string;
  track: Track;
  createdAt: string;
}

// What the household is memorizing: a course id from content/index.ts.
export interface Plan {
  course: string;
  // The daily practice goal in minutes (5, 15 or 25), chosen at the start and changeable any time.
  minutes?: number;
}

export interface Household {
  members: Member[];
  activeMemberId: string | null;
  plan: Plan | null;
}

// Scripture passages with a page of their own: the text (from the public-domain Berean text, see bible.ts), split
// into phrases only for reading (the words are never changed), and a day-by-day plan.

import { courseItems, getCourse } from '../heir/content/index.ts';
import { GOALS, project } from '../heir/planner.ts';
import { emptyProgress } from '../heir/progress.ts';

export interface PassagePage {
  slug: string;
  /** How the passage is named in running text. */
  name: string;
  ref: string;
  /** The Katekize course that teaches it. */
  course: string;
  title: string;
  h1: string;
}

export const PASSAGES: PassagePage[] = [
  { slug: 'psalm-23', name: 'Psalm 23', ref: 'Psalm 23:1–6', course: 'psalm-23', title: 'How to Memorize Psalm 23: Text and a 6-Day Plan', h1: 'How to memorize Psalm 23' },
  { slug: 'the-lords-prayer', name: 'the Lord’s Prayer', ref: 'Matthew 6:9–13', course: 'lords-prayer', title: 'How to Memorize the Lord’s Prayer: Text and a 5-Day Plan', h1: 'How to memorize the Lord’s Prayer (Matthew 6:9–13)' },
];

export const passageBySlug = (slug: string) => PASSAGES.find((p) => p.slug === slug);

/** The verse split at its own punctuation, for reading one phrase at a time. */
export const phrasesOf = (text: string): string[] => text.split(/(?<=[,;:.!?])\s+/).map((s) => s.trim()).filter(Boolean);

const daysLabel = (d: number) => (d < 14 ? `about ${Math.max(1, d)} ${d === 1 ? 'day' : 'days'}` : d < 60 ? `about ${Math.round(d / 7)} weeks` : `about ${Math.round(d / 30.4)} months`);

/** Katekize's own estimate for learning the course at each daily goal. */
export function courseEstimates(courseId: string) {
  const items = courseItems(getCourse(courseId)!);
  const now = new Date('2026-11-23T12:00:00Z');
  return GOALS.map((minutes) => ({ minutes, label: daysLabel(project({ items, track: 'adult', p: emptyProgress(), minutes, now }).learnDays) }));
}

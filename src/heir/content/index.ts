// Every collection Heir ships, the courses a learner can choose, and lookups across them.

import type { Collection, Item } from '../types.ts';
import { westminsterShorter } from './westminster-shorter.ts';
import { westminsterLarger } from './westminster-larger.ts';
import { apostlesCreed } from './apostles-creed.ts';
import { niceneCreed } from './nicene-creed.ts';

export const collections: Collection[] = [westminsterShorter, westminsterLarger, apostlesCreed, niceneCreed];

// What a learner picks to memorize. A course runs through one or more collections in order.
export interface Course {
  id: string;
  title: string;
  blurb: string;
  collections: string[];
}

export const courses: Course[] = [
  { id: 'westminster-shorter', title: 'Westminster Shorter Catechism', blurb: 'Short questions and answers. A good place to start.', collections: ['westminster-shorter'] },
  { id: 'westminster-larger', title: 'Westminster Larger Catechism', blurb: 'Fuller answers to the same questions.', collections: ['westminster-larger'] },
  { id: 'creeds', title: 'The Creeds', blurb: 'The Apostles’ Creed, then the Nicene Creed.', collections: ['apostles-creed', 'nicene-creed'] },
];

const byId = new Map<string, Item>(collections.flatMap((c) => c.items.map((i) => [i.id, i] as const)));

export function getCollection(id: string): Collection | undefined {
  return collections.find((c) => c.id === id);
}

export function getCourse(id: string): Course | undefined {
  return courses.find((c) => c.id === id);
}

// The course a stored plan points at, accepting the older plan shape that named a collection.
export function courseFor(id: string | undefined | null): Course | undefined {
  if (!id) return undefined;
  return getCourse(id) ?? courses.find((c) => c.collections.includes(id));
}

export function courseItems(course: Course): Item[] {
  return course.collections.flatMap((id) => getCollection(id)?.items ?? []);
}

// How an item is named in lists: "Q3" or "Apostles’ Creed 2".
export function itemLabel(item: Item): string {
  const c = getCollection(item.collection);
  return c?.unit === 'Question' ? `Q${item.number}` : `${c?.title ?? ''}, part ${item.number}`;
}

export function getItem(id: string): Item | undefined {
  return byId.get(id);
}

export function allItems(): Item[] {
  return [...byId.values()];
}

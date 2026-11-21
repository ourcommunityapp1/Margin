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
  // The course's natural parts, each with its own window. By question number within a collection;
  // without parts, each collection is one part.
  parts?: { title: string; collection: string; from: number; to: number }[];
}

export const courses: Course[] = [
  { id: 'westminster-shorter', title: 'Westminster Shorter Catechism', blurb: 'Short questions and answers. A good place to start.', collections: ['westminster-shorter'],
    parts: [
      { title: 'What we believe', collection: 'westminster-shorter', from: 1, to: 38 },
      { title: 'The law', collection: 'westminster-shorter', from: 39, to: 81 },
      { title: 'The way of salvation', collection: 'westminster-shorter', from: 82, to: 107 },
    ] },
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

// The course's parts with their items, in order. Parts with no items yet are left out.
export function courseParts(course: Course): { title: string; items: Item[] }[] {
  const parts = course.parts ?? course.collections.map((id) => ({ title: getCollection(id)?.title ?? '', collection: id, from: 1, to: Infinity }));
  return parts
    .map((p) => ({ title: p.title, items: (getCollection(p.collection)?.items ?? []).filter((i) => i.number >= p.from && i.number <= p.to) }))
    .filter((p) => p.items.length > 0);
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

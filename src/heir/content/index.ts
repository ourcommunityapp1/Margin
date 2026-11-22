// Every collection Heir ships, the courses a learner can choose, and lookups across them.

import type { Collection, Item } from '../types.ts';
import { westminsterShorter } from './westminster-shorter.ts';
import { westminsterLarger } from './westminster-larger.ts';
import { apostlesCreed } from './apostles-creed.ts';
import { niceneCreed } from './nicene-creed.ts';
import { christmas, firstVerses } from './bible-starters.ts';
import { easter, fearPeace, gospel, lordsPrayer, psalm23, shema, tenCommandments, whoGodIs } from './bible-courses.ts';
import type { Season } from '../season.ts';

export const collections: Collection[] = [westminsterShorter, westminsterLarger, apostlesCreed, niceneCreed, firstVerses, christmas,
  psalm23, lordsPrayer, shema, tenCommandments, fearPeace, gospel, whoGodIs, easter];

// The Courses page's shelves, in order.
export type Shelf = 'start' | 'church' | 'life' | 'seasons' | 'catechisms';
export const SHELVES: { id: Shelf; title: string }[] = [
  { id: 'start', title: 'Start here' },
  { id: 'church', title: 'What the church has always learned' },
  { id: 'life', title: 'For life' },
  { id: 'catechisms', title: 'Catechisms' },
  { id: 'seasons', title: 'Seasons' },
];

// What a learner picks to memorize. A course runs through one or more collections in order.
export interface Course {
  id: string;
  title: string;
  blurb: string;
  /** Two lines at most, under the name on the Courses page. */
  short: string;
  /** Which shelf it sits on, on the Courses page. */
  shelf: Shelf;
  /** A seasonal course leads the Courses page while it's in season. */
  season?: Season;
  collections: string[];
  // The course's natural parts, each with its own window. By question number within a collection;
  // without parts, each collection is one part.
  parts?: { title: string; collection: string; from: number; to: number }[];
}

export const courses: Course[] = [
  { id: 'first-verses', title: 'First Verses', blurb: 'Six short verses every Christian should know. The place to begin.', short: 'Six short verses every Christian should know.', shelf: 'start', collections: ['first-verses'] },
  { id: 'psalm-23', title: 'Psalm 23', blurb: 'The Shepherd’s psalm, all six verses: the LORD who leads, feeds and keeps His people, all the way home.', short: 'The Shepherd’s psalm, all six verses.', shelf: 'start', collections: ['psalm-23'] },
  { id: 'lords-prayer', title: 'The Lord’s Prayer', blurb: 'The prayer Jesus taught His disciples, as Matthew gives it. Christians have prayed it every day for two thousand years.', short: 'The prayer Jesus taught His disciples.', shelf: 'start', collections: ['lords-prayer'] },
  { id: 'shema', title: 'The Shema and the Blessing', blurb: '“Hear, Israel!”: the confession God’s people have said morning and evening for three thousand years, and the blessing God gave the priests.', short: 'Israel’s daily confession and the priestly blessing.', shelf: 'church', collections: ['shema'] },
  { id: 'ten-commandments', title: 'The Ten Commandments', blurb: 'The Ten Commandments from Exodus 20, one short line each.', short: 'God’s law in ten short lines.', shelf: 'church', collections: ['ten-commandments'] },
  { id: 'fear-peace', title: 'Fear, Worry and Peace', blurb: 'Six promises for anxious days and restless nights, from “When I am afraid” to the peace that guards your heart.', short: 'Six promises for anxious days and restless nights.', shelf: 'life', collections: ['fear-peace'] },
  { id: 'gospel', title: 'The Gospel', blurb: 'The good news in six verses: our sin, Christ’s death for us, grace, and new life as God’s children.', short: 'The good news, from our sin to new life in Christ.', shelf: 'life', collections: ['gospel'] },
  { id: 'who-god-is', title: 'Who God Is', blurb: 'Six verses on who God is: eternal, unchanging, holy, love, gracious and faithful.', short: 'Eternal, holy, faithful, and love: who God is.', shelf: 'life', collections: ['who-god-is'] },
  { id: 'westminster-shorter', title: 'Westminster Shorter Catechism', blurb: 'Short questions and answers. A good place to start.', short: '107 questions on what we believe and how we live.', shelf: 'catechisms', collections: ['westminster-shorter'],
    parts: [
      { title: 'What we believe', collection: 'westminster-shorter', from: 1, to: 38 },
      { title: 'The law', collection: 'westminster-shorter', from: 39, to: 81 },
      { title: 'The way of salvation', collection: 'westminster-shorter', from: 82, to: 107 },
    ] },
  { id: 'westminster-larger', title: 'Westminster Larger Catechism', blurb: 'Fuller answers to the same questions.', short: 'Fuller answers to the same questions.', shelf: 'catechisms', collections: ['westminster-larger'] },
  { id: 'creeds', title: 'The Creeds', blurb: 'The Apostles’ Creed, then the Nicene Creed.', short: 'The faith Christians confess together.', shelf: 'church', collections: ['apostles-creed', 'nicene-creed'] },
  { id: 'christmas', title: 'Christmas', blurb: 'Six verses that tell the Christmas story, from the prophets’ promise to the angels’ news.', short: 'From the prophets’ promise to the angels’ news.', shelf: 'seasons', season: 'christmas', collections: ['christmas'] },
  { id: 'easter', title: 'Easter', blurb: 'Six verses for Lent and Easter: the Servant pierced for us, the empty tomb, and the living hope.', short: 'The cross, the empty tomb, the living hope.', shelf: 'seasons', season: 'easter', collections: ['easter'] },
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

// How an item is named in lists: "Q3", "Apostles’ Creed, part 2", or a verse's reference, "John 3:16".
export function itemLabel(item: Item): string {
  const c = getCollection(item.collection);
  if (c?.kind === 'scripture') return item.prompt;
  return c?.unit === 'Question' ? `Q${item.number}` : `${c?.title ?? ''}, part ${item.number}`;
}

// A Bible verse, cued by its reference, rather than a catechism question or creed section.
export function isVerse(item: Item): boolean {
  return getCollection(item.collection)?.kind === 'scripture';
}

// The line under an item's label in lists: the question for a catechism, the opening words for a verse
// (whose prompt is already its label).
export function itemSubtitle(item: Item): string {
  return getCollection(item.collection)?.kind === 'scripture' ? item.text : item.prompt;
}

// What a course's items are called, in the plural.
export function itemNoun(item: Item | undefined, n = 2): string {
  const unit = item ? getCollection(item.collection)?.unit : undefined;
  const one = unit === 'Question' ? 'question' : unit === 'Verse' ? 'verse' : unit === 'Commandment' ? 'commandment' : 'section';
  return n === 1 ? one : `${one}s`;
}

export function getItem(id: string): Item | undefined {
  return byId.get(id);
}

export function allItems(): Item[] {
  return [...byId.values()];
}

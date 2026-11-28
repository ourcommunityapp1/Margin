// Every collection Katekize ships, the courses a learner can choose, and lookups across them. Port of
// src/heir/content/index.ts. The text itself comes from assets/content/content.json, exported from the website
// (ADR-0005) and never edited by hand: the word of God is copied exactly.

import 'types.dart';

class CoursePart {
  final String title, collection;
  final num from, to;
  const CoursePart(this.title, this.collection, this.from, this.to);
}

class Course {
  final String id, title, blurb, short, shelf;
  final String? season;
  final List<String> collections;
  final List<CoursePart>? parts;
  const Course({required this.id, required this.title, required this.blurb, required this.short, required this.shelf, this.season, required this.collections, this.parts});

  factory Course.fromJson(Map<String, dynamic> j) => Course(
        id: j['id'] as String,
        title: j['title'] as String,
        blurb: j['blurb'] as String,
        short: j['short'] as String,
        shelf: j['shelf'] as String,
        season: j['season'] as String?,
        collections: (j['collections'] as List).cast<String>(),
        parts: (j['parts'] as List?)
            ?.map((p) => CoursePart(p['title'] as String, p['collection'] as String, p['from'] as num, p['to'] as num))
            .toList(),
      );
}

class IntroCard {
  final String title, body;
  const IntroCard(this.title, this.body);
}

class Intro {
  final List<IntroCard> cards;
  final List<MeaningQuestion> quiz;
  const Intro(this.cards, this.quiz);
}

class VerseRef {
  final String ref, text;
  const VerseRef(this.ref, this.text);
}

const shelves = [
  ('start', 'Start here'),
  ('church', 'What the church has always learned'),
  ('life', 'For life'),
  ('catechisms', 'Catechisms'),
  ('seasons', 'Seasons'),
];

List<Collection> collections = const [];
List<Course> courses = const [];
Map<String, Intro> intros = const {};
Map<String, VerseRef> verses = const {};
Map<String, List<String>> swaps = const {};
Map<String, Item> _byId = const {};
String contentChecksum = '';

/// Load content.json (already decoded). Call once at start-up, before anything else in the engine.
void loadContent(Map<String, dynamic> j) {
  collections = (j['collections'] as List).map((c) => Collection.fromJson(c as Map<String, dynamic>)).toList();
  courses = (j['courses'] as List).map((c) => Course.fromJson(c as Map<String, dynamic>)).toList();
  intros = (j['intros'] as Map<String, dynamic>).map((k, v) => MapEntry(
      k,
      Intro(
        (v['cards'] as List).map((c) => IntroCard(c['title'] as String, c['body'] as String)).toList(),
        (v['quiz'] as List).map((q) => MeaningQuestion.fromJson(q as Map<String, dynamic>)).toList(),
      )));
  verses = (j['verses'] as Map<String, dynamic>).map((k, v) => MapEntry(k, VerseRef(v['ref'] as String, v['text'] as String)));
  swaps = (j['swaps'] as Map<String, dynamic>).map((k, v) => MapEntry(k, (v as List).cast<String>()));
  _byId = {for (final c in collections) for (final i in c.items) i.id: i};
  contentChecksum = (j['checksum'] as String?) ?? '';
}

Collection? getCollection(String id) {
  for (final c in collections) {
    if (c.id == id) return c;
  }
  return null;
}

Course? getCourse(String id) {
  for (final c in courses) {
    if (c.id == id) return c;
  }
  return null;
}

/// The course a stored plan points at, accepting the older plan shape that named a collection.
Course? courseFor(String? id) {
  if (id == null || id.isEmpty) return null;
  return getCourse(id) ?? courses.where((c) => c.collections.contains(id)).firstOrNull;
}

List<Item> courseItems(Course course) => [for (final id in course.collections) ...?getCollection(id)?.items];

/// The course's parts with their items, in order. Parts with no items yet are left out.
List<({String title, List<Item> items})> courseParts(Course course) {
  final parts = course.parts ?? [for (final id in course.collections) CoursePart(getCollection(id)?.title ?? '', id, 1, double.infinity)];
  return parts
      .map((p) => (title: p.title, items: (getCollection(p.collection)?.items ?? const <Item>[]).where((i) => i.number >= p.from && i.number <= p.to).toList()))
      .where((p) => p.items.isNotEmpty)
      .toList();
}

/// "Q3", "Apostles’ Creed, part 2", or a verse's reference.
String itemLabel(Item item) {
  final c = getCollection(item.collection);
  if (c?.kind == 'scripture') return item.prompt;
  return c?.unit == 'Question' ? 'Q${item.number}' : '${c?.title ?? ''}, part ${item.number}';
}

bool isVerse(Item item) => getCollection(item.collection)?.kind == 'scripture';

String itemSubtitle(Item item) => getCollection(item.collection)?.kind == 'scripture' ? item.text : item.prompt;

String itemNoun(Item? item, [int n = 2]) {
  final unit = item == null ? null : getCollection(item.collection)?.unit;
  final one = unit == 'Question' ? 'question' : unit == 'Verse' ? 'verse' : unit == 'Commandment' ? 'commandment' : 'section';
  return n == 1 ? one : '${one}s';
}

Item? getItem(String id) => _byId[id];

List<Item> allItems() => _byId.values.toList();

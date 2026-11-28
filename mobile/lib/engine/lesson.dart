// Builds lessons: the steps a learner works through, chosen by the app, never by the learner. Port of
// src/heir/lesson.ts; see there for the teaching reasons behind each choice.

import 'dart:math' as math;

import 'content.dart';
import 'memory.dart';
import 'types.dart';
import 'util.dart';
import 'words.dart';

class Unit {
  final String key, itemId;
  final int part, of, start, end;
  const Unit({required this.key, required this.itemId, required this.part, required this.of, required this.start, required this.end});
  Map<String, Object?> toJson() => {'key': key, 'itemId': itemId, 'part': part, 'of': of, 'start': start, 'end': end};
  factory Unit.fromJson(Map<String, dynamic> j) =>
      Unit(key: j['key'] as String, itemId: j['itemId'] as String, part: (j['part'] as num).toInt(), of: (j['of'] as num).toInt(), start: (j['start'] as num).toInt(), end: (j['end'] as num).toInt());
}

const _maxPieces = 4;
const _groupSize = 5;
const _maxSteps = 16;

List<Unit> unitsFor(Item item, Track track) {
  final n = item.chunks[track]!.length;
  final of = math.max(1, (n / _maxPieces).ceil());
  final units = <Unit>[];
  var start = 0;
  for (var p = 0; p < of; p++) {
    final size = n ~/ of + (p < n % of ? 1 : 0);
    units.add(Unit(key: '${item.id}#${p + 1}', itemId: item.id, part: p + 1, of: of, start: start, end: start + size));
    start += size;
  }
  return units;
}

Unit? nextUnit(List<Item> items, Track track, Set<String> learned) {
  for (final item in items) {
    for (final u in unitsFor(item, track)) {
      if (!learned.contains(u.key)) return u;
    }
  }
  return null;
}

/// The words of one part, and the piece just before it.
({String text, String lead}) unitText(Item item, Track track, Unit u) {
  final c = item.chunks[track]!;
  return (text: c.sublist(u.start, u.end).join(' '), lead: u.start - 1 >= 0 && u.start - 1 < c.length ? c[u.start - 1] : '');
}

class Group {
  final String key, collection;
  final List<Item> items;
  const Group(this.key, this.collection, this.items);
}

/// Groups of up to five, never mixing collections, as even as possible (6 → 3 + 3).
List<Group> groupsOf(List<Item> items) {
  final byCollection = <List<Item>>[];
  for (final item in items) {
    if (byCollection.isNotEmpty && byCollection.last.first.collection == item.collection) {
      byCollection.last.add(item);
    } else {
      byCollection.add([item]);
    }
  }
  return [
    for (final list in byCollection) ...() {
      final k = (list.length / _groupSize).ceil();
      final out = <Group>[];
      var at = 0;
      for (var g = 0; g < k; g++) {
        final size = list.length ~/ k + (g < list.length % k ? 1 : 0);
        final slice = list.sublist(at, at + size);
        at += size;
        out.add(Group('${slice.first.collection}:${slice.first.number}-${slice.last.number}', slice.first.collection, slice));
      }
      return out;
    }(),
  ];
}

/// The next thing to do in a course: learn a unit, or lock in a group.
class Activity {
  final String kind; // 'learn' | 'checkpoint'
  final Group group;
  final Unit? unit;
  const Activity(this.kind, this.group, [this.unit]);
}

Activity? nextActivity(List<Item> items, Track track, Set<String> learned, Set<String> checkpoints, [Set<String>? waiting]) {
  for (final group in groupsOf(items)) {
    for (final item in group.items) {
      for (final unit in unitsFor(item, track)) {
        if (!learned.contains(unit.key)) return Activity('learn', group, unit);
      }
    }
    if (!checkpoints.contains(group.key) && !(waiting?.contains(group.key) ?? false)) return Activity('checkpoint', group);
  }
  return null;
}

/// Units fully learned whose lock-in should wait for a night's sleep.
Set<String> lockInsWaiting(List<Item> items, bool Function(String itemId) isWaiting) =>
    {for (final g in groupsOf(items)) if (g.items.any((i) => isWaiting(i.id))) g.key};

/// One step of a lesson. Which fields are set depends on [kind] (see lesson.ts's Step type).
class Step {
  final String id, itemId, kind;
  final bool review;
  final String? part;
  final int? partOf;
  final Unit? unit;
  final String? title, body, ref, text, lead, answer, rightWord, correctText;
  final MeaningQuestion? question;
  final List<String>? options, tiles, decoys, bank;
  final bool? pieces, slots;
  final List<int>? blanks;
  final int? wrongIndex;
  const Step({
    required this.id,
    required this.itemId,
    required this.kind,
    required this.review,
    this.part,
    this.partOf,
    this.unit,
    this.title,
    this.body,
    this.ref,
    this.text,
    this.lead,
    this.answer,
    this.rightWord,
    this.correctText,
    this.question,
    this.options,
    this.tiles,
    this.decoys,
    this.bank,
    this.pieces,
    this.slots,
    this.blanks,
    this.wrongIndex,
  });

  Step copyWith({String? id, String? kind}) => Step(
        id: id ?? this.id,
        itemId: itemId,
        kind: kind ?? this.kind,
        review: review,
        part: part,
        partOf: partOf,
        unit: unit,
        title: title,
        body: body,
        ref: ref,
        text: text,
        lead: lead,
        answer: answer,
        rightWord: rightWord,
        correctText: correctText,
        question: question,
        options: options,
        tiles: tiles,
        decoys: decoys,
        bank: bank,
        pieces: pieces,
        slots: slots,
        blanks: blanks,
        wrongIndex: wrongIndex,
      );

  Map<String, Object?> toJson() => {
        'id': id,
        'itemId': itemId,
        'review': review,
        'kind': kind,
        if (part != null) 'part': part,
        if (partOf != null) 'partOf': partOf,
        if (unit != null) 'unit': unit!.toJson(),
        if (title != null) 'title': title,
        if (body != null) 'body': body,
        if (ref != null) 'ref': ref,
        if (text != null) 'text': text,
        if (lead != null) 'lead': lead,
        if (answer != null) 'answer': answer,
        if (rightWord != null) 'rightWord': rightWord,
        if (correctText != null) 'correctText': correctText,
        if (question != null) 'question': {'phrase': question!.phrase, 'question': question!.question, 'answer': question!.answer, 'distractors': question!.distractors, 'explain': question!.explain},
        if (options != null) 'options': options,
        if (tiles != null) 'tiles': tiles,
        if (decoys != null) 'decoys': decoys,
        if (bank != null) 'bank': bank,
        if (pieces != null) 'pieces': pieces,
        if (slots != null) 'slots': slots,
        if (blanks != null) 'blanks': blanks,
        if (wrongIndex != null) 'wrongIndex': wrongIndex,
      };
}

typedef Rng = double Function();

int _imul(int a, int b) {
  a &= 0xffffffff;
  b &= 0xffffffff;
  return (((a & 0xffff) * b) + ((((a >> 16) * b) & 0xffff) << 16)) & 0xffffffff;
}

/// A small seeded generator, so a lesson can be rebuilt exactly (bit for bit the same as lesson.ts's `seeded`).
Rng seeded(int seed) {
  var a = seed & 0xffffffff;
  return () {
    a = (a + 0x6d2b79f5) & 0xffffffff;
    var t = a;
    t = _imul(t ^ (t >> 15), t | 1);
    t = (t ^ (t + _imul(t ^ (t >> 7), t | 61))) & 0xffffffff;
    return ((t ^ (t >> 14)) & 0xffffffff) / 4294967296;
  };
}

List<T> shuffle<T>(List<T> list, Rng rng) {
  final a = [...list];
  for (var i = a.length - 1; i > 0; i--) {
    final j = (rng() * (i + 1)).floor();
    final t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

T _pick<T>(List<T> list, Rng rng) => list[(rng() * list.length).floor()];

/// Joins short pieces so each word-bank exercise has at least a few words to arrange.
List<String> phrases(List<String> chunks, [int min = 4]) {
  final out = <String>[];
  for (final c in chunks) {
    if (out.isNotEmpty && words(out.last).length < min) {
      out[out.length - 1] = '${out.last} $c';
    } else {
      out.add(c);
    }
  }
  if (out.length > 1 && words(out.last).length < min) {
    final tail = out.removeLast();
    out[out.length - 1] = '${out.last} $tail';
  }
  return out;
}

final _leadPunct = RegExp('^[“‘"\'(]+');
final _tailPunct = RegExp('[.,;:!?”’")]+\$');

List<String> _otherWords(List<Item> pool, String answer) {
  final avoid = words(answer).toSet();
  final seen = <String>{};
  final out = <String>[];
  for (final item in pool) {
    for (final raw in item.text.split(' ')) {
      final w = raw.replaceFirst(_leadPunct, '').replaceFirst(_tailPunct, '');
      final n = normalizeWord(w);
      if (n.length < 3 || avoid.contains(n) || seen.contains(n)) continue;
      seen.add(n);
      out.add(w);
    }
  }
  return out;
}

const _common = {
  'the', 'and', 'of', 'to', 'in', 'is', 'a', 'an', 'his', 'him', 'that', 'are', 'be', 'by', 'for', 'with', 'it', 'who', 'which', 'as', 'unto', 'all', 'we', 'i', 'he', 'our', //
  'us', 'on', 'from', 'was', 'were', 'what', 'do', 'doth', 'hath', 'but', 'there', 'they', 'their', 'this', 'these', 'man',
};

List<int> _strongIndexes(List<String> tokens) => [
      for (var i = 0; i < tokens.length; i++)
        if (normalizeWord(tokens[i]).length >= 3 && !_common.contains(normalizeWord(tokens[i]))) i,
    ];

/// Which words to hide: the ones that carry meaning, spread out, at least one.
List<int> pickBlanks(String text, double share, int max, Rng rng) {
  final tokens = text.split(' ');
  final strong = _strongIndexes(tokens);
  final from = strong.isNotEmpty ? strong : List.generate(tokens.length, (i) => i);
  final want = math.max(1, math.min(max, jsRound(tokens.length * share)));
  final chosen = <int>[];
  for (final i in shuffle(from, rng)) {
    if (chosen.length >= want) break;
    if (chosen.any((c) => (c - i).abs() < 2) && from.length > want * 2) continue;
    chosen.add(i);
  }
  return chosen..sort();
}

List<String> _bankFor(List<String> tiles, List<String> decoyWords, Rng rng) {
  final all = [...tiles, ...decoyWords];
  for (var tries = 0; tries < 5; tries++) {
    final b = shuffle(all, rng);
    if (b.sublist(0, tiles.length).join(' ') != tiles.join(' ')) return b;
  }
  return [...all.sublist(1), all[0]];
}

class _Ctx {
  int n;
  final Rng rng;
  final Track track;
  final List<Item> pool;
  _Ctx(this.n, this.rng, this.track, this.pool);
}

String _nextId(_Ctx c, String kind, String itemId) => '$kind:$itemId:${c.n++}';

Step _orderStep(_Ctx c, Item item, List<String> tiles, String lead, bool pieces, bool review, [bool slots = false, Unit? unit]) {
  final extra = pieces ? <String>[] : _otherWords(c.pool.where((i) => i.id != item.id).toList(), item.text).take(40).toList();
  final decoys = shuffle(extra, c.rng).take(pieces ? 0 : tiles.length > 4 ? 2 : 1).toList();
  return Step(id: _nextId(c, 'order', item.id), itemId: item.id, review: review, kind: 'order', tiles: tiles, decoys: decoys, bank: _bankFor(tiles, decoys, c.rng), pieces: pieces, slots: slots, lead: lead, part: unit?.key, partOf: unit?.of);
}

final _tokenParts = RegExp('^([“‘"\'(]*)(.*?)([.,;:!?”’")]*)\$');

({String text, int at})? _mixUp(_Ctx c, String phrase, String avoid) {
  final tokens = phrase.split(' ');
  final inAnswer = words(avoid).toSet();
  final options = <({int at, String w})>[];
  for (var at = 0; at < tokens.length; at++) {
    final core = normalizeWord(tokens[at]).replaceAll("'", '');
    for (final w in swaps[core] ?? const <String>[]) {
      if (!inAnswer.contains(w)) options.add((at: at, w: w));
    }
  }
  if (options.isEmpty) return null;
  final o = _pick(options, c.rng);
  final m = _tokenParts.firstMatch(tokens[o.at]);
  final before = m?.group(1) ?? '', core = m?.group(2) ?? tokens[o.at], after = m?.group(3) ?? '';
  final swap = core.isNotEmpty && core[0] == core[0].toUpperCase() ? o.w[0].toUpperCase() + o.w.substring(1) : o.w;
  final out = [...tokens];
  out[o.at] = '$before$swap$after';
  return (text: out.join(' '), at: o.at);
}

Step? _nextPhraseStep(_Ctx c, Item item, Unit unit, bool review) {
  final chunks = item.chunks[c.track]!;
  final choices = <int>[for (var j = math.max(1, unit.start); j < unit.end; j++) j];
  if (choices.isEmpty) return null;
  final j = _pick(choices, c.rng);
  final answer = chunks[j];
  final near = c.pool.where((i) => i.id != item.id && i.collection == item.collection).toList();
  final others = near.isNotEmpty ? near : c.pool.where((i) => i.id != item.id).toList();
  final mixed = <String>[];
  for (var t = 0; t < 8 && mixed.length < 2; t++) {
    final m = _mixUp(c, answer, item.text)?.text;
    if (m != null && !mixed.contains(m)) mixed.add(m);
  }
  final seen = {answer, ...mixed}.map(normalizeWord).toSet();
  final real = shuffle([
    for (var k = 0; k < chunks.length; k++)
      if (k > j + 1) chunks[k],
    for (final i in others) ...i.chunks[c.track]!,
  ], c.rng)
      .where((x) {
    final key = normalizeWord(x);
    if (seen.contains(key) || words(x).length < 2) return false;
    seen.add(key);
    return true;
  }).toList();
  final wrong = [...mixed, ...real].take(2).toList();
  if (wrong.length < 2) return null;
  return Step(id: _nextId(c, 'next', item.id), itemId: item.id, review: review, kind: 'next', lead: chunks[j - 1], answer: answer, options: shuffle([answer, ...wrong], c.rng), part: unit.key, partOf: unit.of);
}

Step? _matchStep(_Ctx c, Item item, Unit unit, bool review) {
  final same = c.pool.where((i) => i.id != item.id && i.collection == item.collection).toList();
  final rest = c.pool.where((i) => i.id != item.id && i.collection != item.collection).toList();
  final prompts = {...shuffle(same, c.rng), ...shuffle(rest, c.rng)}.map((i) => i.prompt).toSet().where((p) => p != item.prompt).take(3).toList();
  if (prompts.length < 2) return null;
  final text = unitText(item, c.track, unit).text;
  return Step(id: _nextId(c, 'match', item.id), itemId: item.id, review: review, kind: 'match', text: text, answer: item.prompt, options: shuffle([item.prompt, ...prompts], c.rng), part: unit.key, partOf: unit.of);
}

Step? _spotStep(_Ctx c, Item item, Unit unit, bool review) {
  final text = unitText(item, c.track, unit).text;
  final m = _mixUp(c, text, item.text);
  if (m == null) return null;
  return Step(id: _nextId(c, 'spot', item.id), itemId: item.id, review: review, kind: 'spot', text: m.text, wrongIndex: m.at, rightWord: text.split(' ')[m.at], correctText: text, part: unit.key, partOf: unit.of);
}

Step _textStep(_Ctx c, String kind, Item item, Unit unit, bool review, [double blankShare = 0.3]) {
  final t = unitText(item, c.track, unit);
  final id = _nextId(c, kind, item.id);
  return Step(
    id: id,
    itemId: item.id,
    review: review,
    kind: kind,
    text: t.text,
    lead: t.lead,
    part: unit.key,
    partOf: unit.of,
    blanks: kind == 'blanks' ? pickBlanks(t.text, blankShare, review ? 6 : 4, c.rng) : null,
  );
}

/// Practice gets harder with each session an item has been in.
List<String> practiceKinds(int sessions) {
  if (sessions < 2) return ['blanks', 'next', 'spot'];
  if (sessions < 4) return ['letters', 'spot', 'match', 'blanks'];
  return ['type', 'say', 'match', 'letters'];
}

Step _practiceStep(_Ctx c, Item item, List<Unit> units, List<String> kinds, bool review, [String? avoid, bool inOrder = false]) {
  final unit = _pick(units, c.rng);
  for (final kind in inOrder ? kinds : shuffle(kinds, c.rng)) {
    if (kind == avoid && kinds.length > 1) continue;
    final step = kind == 'next'
        ? _nextPhraseStep(c, item, unit, review)
        : kind == 'match'
            ? _matchStep(c, item, unit, review)
            : kind == 'spot'
                ? _spotStep(c, item, unit, review)
                : _textStep(c, kind, item, unit, review, review ? 0.4 : 0.3);
    if (step != null) return step;
  }
  return _textStep(c, 'blanks', item, unit, review);
}

/// An item already in progress: the parts learned so far and how many times it has been practiced.
class Mate {
  final Item item;
  final List<Unit> units;
  final int seen;
  const Mate(this.item, this.units, this.seen);
}

/// An item due on the schedule. [strength] is FSRS stability in days; [weak] the parts to ask first; [chance] the chance now.
class Due {
  final Item item;
  final double strength;
  final List<String>? weak;
  final double? chance;
  const Due(this.item, this.strength, {this.weak, this.chance});
  Due withStrength(double s) => Due(item, s, weak: weak, chance: chance);
}

List<Unit> _partsFor(_Ctx c, Due d) {
  final all = unitsFor(d.item, c.track);
  final weak = all.where((u) => d.weak?.contains(u.key) ?? false).toList();
  return weak.isNotEmpty ? weak : all;
}

/// The review ladder: light steps only (ADR-003). Under 75%: blanks (or match), then first letters; 75 to 85%: first
/// letters; 85% and over: one quick touch. Whole recall stays for fixes, lock-ins, a new lesson's close and "Test myself".
(List<String>, List<String>?) _ladder(double chance) {
  if (chance < 0.75) return (['blanks', 'match'], ['letters']);
  if (chance < 0.85) return (['letters'], null);
  return (['spot', 'blanks'], null);
}

Step _dueStep(_Ctx c, Due d, [String? avoid]) {
  final kinds = d.chance != null
      ? _ladder(d.chance!).$1
      : d.strength < 7
          ? ['letters', 'spot', 'match', 'blanks']
          : ['spot', 'blanks', 'match'];
  return _practiceStep(c, d.item, _partsFor(c, d), kinds, true, avoid);
}

/// A second new question in the same lesson, learned more briefly: see it, build it, fill it in, type it.
List<Step> buildLite({required Unit unit, required Item item, required Track track, required List<Item> pool, required Rng rng, int? idStart}) {
  final c = _Ctx(idStart ?? 500, rng, track, pool);
  final chunks = item.chunks[track]!;
  final pieces = chunks.sublist(unit.start, unit.end);
  final lead = unit.start - 1 >= 0 ? chunks[unit.start - 1] : '';
  final steps = <Step>[Step(id: _nextId(c, 'intro', item.id), itemId: item.id, review: false, kind: 'intro', unit: unit)];
  if (pieces.length >= 2) {
    steps.add(_orderStep(c, item, pieces, lead, true, false));
  } else {
    steps.add(_orderStep(c, item, pieces[0].split(' '), lead, false, false, true));
  }
  steps.add(_textStep(c, 'blanks', item, unit, false));
  steps.add(_textStep(c, 'type', item, unit, false));
  return steps;
}

/// The welcome lesson: a few cards on what this is, an easy question after each pair, then the first question.
List<Step> buildWelcome({required Intro intro, required Unit unit, required Item item, required Track track, required List<Item> pool, required Rng rng}) {
  final c = _Ctx(900, rng, track, pool);
  final id = item.id;
  final opening = <Step>[];
  for (var i = 0; i < intro.cards.length; i++) {
    final card = intro.cards[i];
    opening.add(Step(id: _nextId(c, 'info', id), itemId: id, review: false, kind: 'info', title: card.title, body: card.body));
    if (i < intro.quiz.length) {
      final q = intro.quiz[i];
      opening.add(Step(id: _nextId(c, 'quiz', id), itemId: id, review: false, kind: 'quiz', question: q, options: shuffle([q.answer, ...q.distractors], c.rng)));
    }
  }
  return [...opening, ...buildLesson(unit: unit, item: item, track: track, mates: const [], due: const [], pool: pool, rng: rng)];
}

List<Step> buildLesson({required Unit unit, required Item item, required Track track, required List<Mate> mates, required List<Due> due, required List<Item> pool, required Rng rng, int? maxSteps}) {
  final c = _Ctx(0, rng, track, pool);
  final chunks = item.chunks[track]!;
  final text = unitText(item, track, unit).text;
  final pieces = chunks.sublist(unit.start, unit.end);
  final id = item.id;
  final firstLead = unit.start - 1 >= 0 ? chunks[unit.start - 1] : '';

  final learn = <Step>[Step(id: _nextId(c, 'intro', id), itemId: id, review: false, kind: 'intro', unit: unit)];
  final ph = phrases(pieces);
  var lead = firstLead;
  for (var i = 0; i < ph.length; i++) {
    final p = ph[i];
    final tiles = p.split(' ');
    final middle = ph.length > 2 && i == 1;
    final choose = middle ? _nextPhraseStep(c, item, unit, false) : null;
    if (choose != null) {
      learn.add(choose);
    } else if (tiles.length >= 2) {
      learn.add(_orderStep(c, item, tiles, lead, false, false, !learn.any((s) => s.kind == 'order')));
    }
    lead = p;
  }
  final lastPart = unit.part == unit.of;
  final priorLead = chunks.sublist(0, unit.start).join(' ');
  final q = item.meaning.where((m) => text.contains(m.phrase)).firstOrNull ?? (lastPart ? item.meaning.where((m) => !priorLead.contains(m.phrase)).firstOrNull : null);
  if (q != null) learn.add(Step(id: _nextId(c, 'meaning', id), itemId: id, review: false, kind: 'meaning', question: q, options: shuffle([q.answer, ...q.distractors], c.rng)));
  if (pieces.length >= 2) learn.add(_orderStep(c, item, pieces, firstLead, true, false));
  learn.add(_textStep(c, 'blanks', item, unit, false));
  learn.add(_textStep(c, 'letters', item, unit, false));
  final say = _textStep(c, 'say', item, unit, false);

  final perMate = mates.length <= 2 ? 2 : 1;
  final practice = <Step>[];
  for (final m in mates) {
    String? last;
    for (var k = 0; k < perMate; k++) {
      final s = _practiceStep(c, m.item, m.units, practiceKinds(m.seen), false, last);
      last = s.kind;
      practice.add(s);
    }
  }
  final dueSteps = due.take(2).map((d) => _dueStep(c, d)).toList();

  final room = math.max(mates.length, (maxSteps ?? _maxSteps) - learn.length - 1 - dueSteps.length);
  final kept = practice.length > room ? [for (var i = 0; i < practice.length; i++) if (i % perMate == 0) practice[i]] : practice;

  final steps = <Step>[];
  final queue = [...kept];
  if (queue.isNotEmpty) steps.add(queue.removeAt(0));
  steps.addAll(learn);
  final rest = [...queue, ...dueSteps];
  for (var n = 0; n < rest.length; n++) {
    final step = rest[n];
    final target = jsRound(((n + 1) * steps.length) / (rest.length + 1)) + 1;
    bool fits(int k) => k >= 2 && (k - 1 < steps.length ? steps[k - 1].kind : null) != step.kind && (k < steps.length ? steps[k].kind : null) != step.kind;
    var at = steps.length;
    for (var d = 0; d < steps.length; d++) {
      if (fits(target + d) && target + d <= steps.length) {
        at = target + d;
        break;
      }
      if (fits(target - d)) {
        at = target - d;
        break;
      }
    }
    steps.insert(at, step);
  }
  steps.add(say);
  steps.add(_textStep(c, 'type', item, unit, false));
  return steps;
}

/// Keeping words in memory: each chosen item recalled whole, part by part, typed or said in turn.
List<Step> buildKeep({required List<Item> items, required Track track, required List<Item> pool, required Rng rng}) {
  final c = _Ctx(0, rng, track, pool);
  final out = <Step>[];
  var k = 0;
  for (final item in items) {
    for (final u in unitsFor(item, track)) {
      out.add(_textStep(c, k++ % 2 == 0 ? 'type' : 'say', item, u, true));
    }
  }
  return out;
}

/// "Lock it in": every item in the group recalled in full, typed or said, with a quick check in between.
List<Step> buildCheckpoint({required Group group, required Track track, required List<Item> pool, required Rng rng}) {
  final c = _Ctx(0, rng, track, pool);
  final hard = <Step>[], light = <Step>[];
  const quick = ['match', 'spot', 'next'];
  var k = 0;
  for (var i = 0; i < group.items.length; i++) {
    final item = group.items[i];
    final units = unitsFor(item, track);
    for (final u in units) {
      hard.add(_textStep(c, k++ % 2 == 0 ? 'type' : 'say', item, u, true));
    }
    light.add(_practiceStep(c, item, units, [...quick.sublist(i % 3), ...quick.sublist(0, i % 3)], true, null, true));
  }
  final h = shuffle(hard, c.rng), l = shuffle(light, c.rng);
  final out = <Step>[];
  while (h.isNotEmpty || l.isNotEmpty) {
    if (h.isNotEmpty) out.add(h.removeAt(0));
    if (l.isNotEmpty) out.add(l.removeAt(0));
  }
  return out;
}

/// Reviews only: one light step per due item, and a second light step for one under 75%, spread apart.
List<Step> buildReview({required List<Due> due, required Track track, required List<Item> pool, required Rng rng, int? max}) {
  final c = _Ctx(0, rng, track, pool);
  final chosen = spreadApart(due.take(max ?? 6).toList(), (d) => d.item.chunks[track]!.join(' '));
  final first = chosen.map((d) => _dueStep(c, d.withStrength(math.min(d.strength, 6)))).toList();
  final second = <Step>[];
  for (var i = 0; i < chosen.length; i++) {
    final d = chosen[i];
    final rung = d.chance != null ? _ladder(d.chance!).$2 : null;
    if (rung != null) second.add(_practiceStep(c, d.item, _partsFor(c, d), rung, true, first[i].kind));
  }
  return [...first, ...shuffle(second, rng)];
}

/// When speaking isn't possible right now, a say step becomes typing the same words.
Step withoutSpeaking(Step step) => step.kind == 'say' ? step.copyWith(kind: 'type', id: '${step.id}:typed') : step;

/// "When you lie down": one first-letters step per question, then a verse to think on.
List<Step> buildNight({required List<Item> items, required Track track, required List<Item> pool, required Rng rng}) {
  final c = _Ctx(0, rng, track, pool);
  return _withVerse(c, items.map((item) => _textStep(c, 'letters', item, _pick(unitsFor(item, track), c.rng), true)).toList());
}

List<Step> _withVerse(_Ctx c, List<Step> steps, [String from = 'last']) {
  var order = List.generate(steps.length, (i) => i);
  if (from == 'last') order = order.reversed.toList();
  for (final k in order) {
    final v = verses[steps[k].itemId];
    if (v == null) continue;
    var i = k;
    while (i + 1 < steps.length && steps[i + 1].itemId == steps[k].itemId) {
      i++;
    }
    final verse = Step(id: _nextId(c, 'verse', steps[k].itemId), itemId: steps[k].itemId, review: true, kind: 'verse', ref: v.ref, text: v.text);
    return [...steps.sublist(0, i + 1), verse, ...steps.sublist(i + 1)];
  }
  return steps;
}

/// "When you rise": light, about a minute. One step per question, fill in the blanks and putting the phrases in order in turn.
List<Step> buildRise({required List<Item> items, required Track track, required List<Item> pool, required Rng rng}) {
  final c = _Ctx(0, rng, track, pool);
  final steps = <Step>[];
  for (var k = 0; k < items.length; k++) {
    final item = items[k];
    final unit = _pick(unitsFor(item, track), c.rng);
    if (k % 2 == 0) {
      steps.add(_textStep(c, 'blanks', item, unit, true, 0.4));
      continue;
    }
    final chunks = item.chunks[track]!;
    final pieces = chunks.sublist(unit.start, unit.end);
    final lead = unit.start - 1 >= 0 ? chunks[unit.start - 1] : '';
    steps.add(pieces.length >= 2
        ? _orderStep(c, item, pieces, lead, true, true, false, unit)
        : _orderStep(c, item, pieces[0].split(' '), lead, false, true, true, unit));
  }
  return _withVerse(c, steps, 'first');
}

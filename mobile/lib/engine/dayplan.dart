// The day's plan: which lessons and reviews Today recommends, one course each, in order, to fit the daily goal.
// Port of src/heir/dayplan.ts (ADR-002).

import 'dart:math' as math;

import 'content.dart';
import 'lesson.dart';
import 'planner.dart';
import 'progress.dart';
import 'types.dart';
import 'util.dart';

class DayCard {
  final String id, kind, course; // kind: lesson, review, fix
  final num est;
  const DayCard(this.id, this.kind, this.course, this.est);
  Map<String, Object?> toJson() => {'id': id, 'kind': kind, 'course': course, 'est': est};
  factory DayCard.fromJson(Map j) => DayCard(j['id'] as String, j['kind'] as String, j['course'] as String, j['est'] as num);
}

/// One finished session today. [kind]: lesson, review, fix, extra, night or rise.
class DaySession {
  final String id, at, course, kind;
  final num secs;
  final String? card;
  const DaySession(this.id, this.at, this.secs, this.course, this.kind, [this.card]);
  Map<String, Object?> toJson() => {'id': id, 'at': at, 'secs': secs, 'course': course, 'kind': kind, if (card != null) 'card': card};
  factory DaySession.fromJson(Map j) => DaySession(j['id'] as String, j['at'] as String, j['secs'] as num, j['course'] as String, j['kind'] as String, j['card'] as String?);
}

class Today {
  final String day;
  final List<DayCard>? cards;
  final List<DaySession> sessions;
  final List<String>? started;
  const Today(this.day, {this.cards, this.sessions = const [], this.started});
  Map<String, Object?> toJson() => {
        'day': day,
        if (cards != null) 'cards': cards!.map((c) => c.toJson()).toList(),
        'sessions': sessions.map((s) => s.toJson()).toList(),
        if (started != null) 'started': started,
      };
}

const lessonEst = 6;
const fixEst = 3;
const maxCards = 4;
const pile = 6;
int reviewEst(int due) => math.min(6, math.max(2, (due * 0.75).ceil()));

/// The courses this person has started, with the focus course first even if not begun.
List<Course> startedCourses(MemberProgress p, Track track, String? focus) {
  final learned = p.units.toSet();
  final started = courses.where((c) => c.id == focus || courseItems(c).any((i) => unitsFor(i, track).any((u) => learned.contains(u.key)))).toList();
  return stableSorted(started, (a, b) => a.id == focus ? -1 : b.id == focus ? 1 : 0);
}

String? courseOfItem(List<Course> started, String itemId) => started.where((c) => courseItems(c).any((i) => i.id == itemId)).firstOrNull?.id;

int _dueIn(MemberProgress p, DateTime now, Course c) => dueCards(p, now, courseItems(c).map((i) => i.id).toSet()).length;

List<DayCard> planDay({required MemberProgress p, required Track track, required List<Course> started, required String? focus, required num goal, required DateTime now, List<String> fix = const []}) {
  final day = localDay(now);
  DayCard card(String kind, String course, num est) => DayCard('$day:$kind:$course', kind, course, est);

  final fixCourses = {for (final id in fix) courseOfItem(started, id)}.whereType<String>().toList();
  final fixes = fixCourses.map((c) => card('fix', c, fixEst)).toList();

  final focusCourse = started.where((c) => c.id == focus).firstOrNull;
  DayCard? lesson;
  if (focusCourse != null) {
    final plan = planNext(courseId: focusCourse.id, items: courseItems(focusCourse), track: track, p: p, now: now);
    if (plan != null) lesson = plan.kind == 'practice' || plan.kind == 'welcome-back' ? card('review', focusCourse.id, reviewEst(plan.picks.length)) : card('lesson', focusCourse.id, lessonEst);
  }

  final reviews = stableSorted(
    [
      for (final c in started)
        if (c.id != focus && !fixCourses.contains(c.id)) (c: c, due: _dueIn(p, now, c)),
    ].where((x) => x.due > 0),
    (a, b) => b.due.compareTo(a.due),
  ).map((x) => (card: card('review', x.c.id, reviewEst(x.due)), piling: x.due >= pile)).toList();

  if (lesson?.kind == 'lesson' && focusCourse != null) {
    final load = started.fold<int>(0, (n, c) {
      final due = _dueIn(p, now, c);
      return n + (due > 0 ? reviewEst(due) : 0);
    });
    final lastNew = p.log.fold<String>('', (m, e) => e.kind == 'intro' && e.at.compareTo(m) > 0 ? e.at : m);
    final daysSinceNew = lastNew.isNotEmpty ? (now.millisecondsSinceEpoch - parseMs(lastNew)) / dayMillis : double.infinity;
    if (load > 0.7 * goal && daysSinceNew < 3) {
      final focusDue = _dueIn(p, now, focusCourse);
      lesson = focusDue > 0 ? card('review', focusCourse.id, reviewEst(focusDue)) : null;
    }
  }
  if (lesson != null && fixCourses.contains(lesson.course) && lesson.kind == 'review') lesson = null;
  final ordered = [...fixes, for (final r in reviews) if (r.piling) r.card, ?lesson, for (final r in reviews) if (!r.piling) r.card];

  final out = <DayCard>[];
  num total = 0;
  for (final c in ordered) {
    if (out.length >= maxCards) break;
    final must = c.kind == 'fix' || identical(c, lesson);
    if (must || out.isEmpty || total + c.est <= goal) {
      out.add(c);
      total += c.est;
    }
  }
  return out;
}

class CardState {
  final DayCard card;
  bool done;
  num secs;
  CardState(this.card, [this.done = false, this.secs = 0]);
}

List<CardState> cardStates(Today? today, [bool Function(DayCard c)? satisfied]) => _match(today, satisfied).states;

List<DaySession> extraSessions(Today? today) => _match(today).extras;

({List<CardState> states, List<DaySession> extras}) _match(Today? today, [bool Function(DayCard c)? satisfied]) {
  final states = [for (final c in today?.cards ?? const <DayCard>[]) CardState(c)];
  final extras = <DaySession>[];
  final sessions = stableSorted(today?.sessions ?? const <DaySession>[], (a, b) => a.at.compareTo(b.at));
  for (final s in sessions) {
    var st = s.card != null && s.card!.isNotEmpty ? states.where((x) => x.card.id == s.card && !x.done).firstOrNull : null;
    if (st == null && (s.card == null || s.card!.isEmpty)) {
      st = states.where((x) => !x.done && x.card.course == s.course && (x.card.kind == s.kind || (s.kind == 'review' && x.card.kind == 'fix'))).firstOrNull;
    }
    if (st != null) {
      st.done = true;
      st.secs = s.secs;
    } else {
      extras.add(s);
    }
  }
  for (final st in states) {
    if (!st.done && (satisfied?.call(st.card) ?? false)) st.done = true;
  }
  return (states: states, extras: extras);
}

int minutesToday(Today? today) => jsRound((today?.sessions ?? const <DaySession>[]).fold<num>(0, (n, s) => n + s.secs) / 60);

Today withPlan(Today? today, String day, List<DayCard> cards) => Today(day, cards: cards, sessions: today?.day == day ? today!.sessions : const []);

Today withStarted(Today? today, String day, String cardId) {
  final base = today?.day == day ? today! : Today(day);
  return (base.started?.contains(cardId) ?? false) ? base : Today(base.day, cards: base.cards, sessions: base.sessions, started: [...?base.started, cardId]);
}

class DayEvent {
  final String day, cardId, course, kind, event;
  final num? secs;
  const DayEvent(this.day, this.cardId, this.course, this.kind, this.event, this.secs);
  Map<String, Object?> toJson() => {'day': day, 'card_id': cardId, 'course': course, 'kind': kind, 'event': event, 'secs': secs};
}

List<DayEvent> dayEvents(Today? today) {
  if (today?.cards == null) return const [];
  final states = cardStates(today);
  final out = <DayEvent>[];
  for (final (i, c) in today!.cards!.indexed) {
    out.add(DayEvent(today.day, c.id, c.course, c.kind, 'shown', null));
    if ((today.started?.contains(c.id) ?? false) || states[i].done) out.add(DayEvent(today.day, c.id, c.course, c.kind, 'started', null));
    if (states[i].done) out.add(DayEvent(today.day, c.id, c.course, c.kind, 'finished', states[i].secs));
  }
  return out;
}

Today withFix(Today today, DayCard card) =>
    (today.cards?.any((c) => c.id == card.id) ?? false) ? today : Today(today.day, cards: [...?today.cards, card], sessions: today.sessions, started: today.started);

Today withSession(Today? today, String day, DaySession s) {
  final base = today?.day == day ? today! : Today(day);
  return base.sessions.any((x) => x.id == s.id) ? base : Today(base.day, cards: base.cards, sessions: [...base.sessions, s], started: base.started);
}

/// Two copies of today's record: the later day wins; on the same day, cards keep one order and sessions are joined.
Today? mergeToday(Today? a, Today? b) {
  if (a == null) return b;
  if (b == null) return a;
  if (a.day != b.day) return a.day.compareTo(b.day) > 0 ? a : b;
  final cards = a.cards != null || b.cards != null
      ? [...(a.cards ?? b.cards ?? const <DayCard>[]), ...((a.cards != null ? b.cards : null) ?? const <DayCard>[]).where((c) => !(a.cards ?? const <DayCard>[]).any((x) => x.id == c.id))]
      : null;
  final sessions = [...a.sessions, ...b.sessions.where((s) => !a.sessions.any((x) => x.id == s.id))];
  final started = {...?a.started, ...?b.started}.toList();
  return Today(a.day, cards: cards, sessions: sessions, started: started.isNotEmpty ? started : null);
}

Today? parseToday(Object? v) {
  if (v is! Map || v['day'] is! String) return null;
  const kinds = ['lesson', 'review', 'fix'];
  final cards = v['cards'] is List
      ? [
          for (final c in v['cards'] as List)
            if (c is Map && c['id'] is String && c['course'] is String && kinds.contains(c['kind']) && c['est'] is num) DayCard.fromJson(c),
        ]
      : null;
  final sessions = v['sessions'] is List
      ? [
          for (final s in v['sessions'] as List)
            if (s is Map && s['id'] is String && s['at'] is String && s['secs'] is num && s['course'] is String && s['kind'] is String) DaySession.fromJson(s),
        ]
      : <DaySession>[];
  final started = v['started'] is List ? (v['started'] as List).whereType<String>().take(20).toList() : <String>[];
  return Today(v['day'] as String, cards: cards, sessions: sessions, started: started.isNotEmpty ? started : null);
}

/// What a course's row says under its name in "Keep going".
({String text, bool allLearned}) nextLine(MemberProgress p, Track track, Course course, DateTime now) {
  final items = courseItems(course);
  final plan = planNext(courseId: course.id, items: items, track: track, p: p, now: now);
  final ids = items.map((i) => i.id).toSet();
  final learned = p.units.toSet();
  final allLearned = items.every((i) => unitsFor(i, track).every((u) => learned.contains(u.key)));
  if (plan?.kind == 'checkpoint') return (text: 'Lock-in next', allLearned: allLearned);
  if (allLearned) return (text: 'All learned', allLearned: allLearned);
  return (text: 'Lesson ${lessonsDone(p, course.id, ids) + 1} next', allLearned: allLearned);
}

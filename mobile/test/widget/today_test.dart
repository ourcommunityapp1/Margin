import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/data/household.dart';
import 'package:katekize/data/store.dart';
import 'package:katekize/engine/content.dart';
import 'package:katekize/engine/dayplan.dart';
import 'package:katekize/engine/lesson.dart' show unitsFor;
import 'package:katekize/engine/models.dart' show StepResult;
import 'package:katekize/engine/models.dart' show iso;
import 'package:katekize/engine/progress.dart';
import 'package:katekize/engine/types.dart';
import 'package:katekize/state/household.dart';

import '../engine/content_loader.dart';
import 'fakes.dart';

/// A phone with one person who has chosen First Verses, and today's record as given. [learned] verses were learned two days
/// before, so there is something to recall in the morning and the evening.
MemoryStore _phone(Today? Function(String day) today, {int learned = 0}) {
  final h = addMember(emptyHousehold(), 'Ann', Track.adult, 'me', DateTime.utc(2026, 11, 20));
  final plan = setPlan(h, const Plan(course: 'first-verses', minutes: 15));
  const day = '2026-11-24';
  var p = emptyProgress();
  final verses = learned == 0 ? const <Item>[] : courseItems(getCourse('first-verses')!).take(learned).toList();
  if (verses.isNotEmpty) {
    p = finishSession(
      p,
      results: [for (final v in verses) StepResult(itemId: v.id, kind: 'type', correct: true, hints: 0, ms: 1, review: false)],
      learned: [for (final v in verses) ...unitsFor(v, Track.adult)],
      courseId: 'first-verses',
      now: DateTime(2026, 11, 22, 10),
    );
  }
  final progress = {'me': p.copyWith(today: today(day))};
  return MemoryStore({
    householdKey: householdToJson(plan),
    progressKey: jsonEncode({for (final e in progress.entries) e.key: e.value.toJson()}),
  });
}

void main() {
  loadTestContent();
  testWidgets('a finished day says so, with the minutes, and offers nothing more to start', (tester) async {
    final at = iso(DateTime(2026, 11, 24, 12));
    final store = _phone((day) => Today(day, cards: const [DayCard('c1', 'lesson', 'first-verses', 6)], sessions: [DaySession('s1', at, 400, 'first-verses', 'lesson', 'c1')]));
    await pumpApp(tester, store: store);
    expect(find.text('Done for today'), findsOneWidget);
    expect(find.text('7 minutes'), findsOneWidget);
    expect(find.textContaining('Begin'), findsNothing);
    // The finished lesson is a dim row under "Done", with a tick where the minutes were.
    expect(find.text('DONE'), findsOneWidget);
    expect(find.textContaining('First Verses'), findsWidgets);
    expect(find.bySemanticsLabel('Done'), findsOneWidget);
  });

  testWidgets('a fresh day is planned once, and a started card shows its button', (tester) async {
    final store = _phone((day) => null);
    await pumpApp(tester, store: store);
    expect(find.textContaining('Begin · '), findsOneWidget);
    // Nothing is a carousel any more, and there is no "N of M done" line.
    expect(find.byType(PageView), findsNothing);
    expect(find.textContaining('of 1 done'), findsNothing);
    final stored = jsonDecode(store.read(progressKey)!) as Map;
    final today = (stored['me'] as Map)['today'] as Map;
    expect(today['day'], '2026-11-24');
    expect((today['cards'] as List), hasLength(1), reason: 'the plan was saved');
  });

  testWidgets('in the morning the big card is "When you rise", with a sunrise and a peach Start', (tester) async {
    await pumpApp(tester, store: _phone((day) => null, learned: 3), now: DateTime(2026, 11, 24, 6, 30));
    expect(find.text('When you rise'), findsOneWidget);
    expect(find.textContaining('Start · '), findsOneWidget);
    // The day's lesson waits as a row, and the evening recall is there all day.
    expect(find.text('UP NEXT'), findsOneWidget);
    expect(find.text('THIS EVENING'), findsOneWidget);
    expect(find.textContaining('When you lie down · '), findsOneWidget);
  });

  testWidgets('by day the lesson is the big card and both recalls are rows', (tester) async {
    await pumpApp(tester, store: _phone((day) => null, learned: 3), now: DateTime(2026, 11, 24, 14));
    // Three verses learned: the next lesson locks them in. Its grey line names them.
    expect(find.textContaining('Lock it in · 6 min'), findsOneWidget);
    expect(find.text('Genesis 1:1, Psalm 23:1, John 3:16'), findsOneWidget);
    expect(find.textContaining('When you rise · '), findsOneWidget);
    expect(find.textContaining('When you lie down · '), findsOneWidget);
  });

  testWidgets('from 7 pm, with the day done, the big card is "When you lie down" with a pale blue Start', (tester) async {
    final at = iso(DateTime(2026, 11, 24, 12));
    final store = _phone(
      (day) => Today(day, cards: const [DayCard('c1', 'lesson', 'first-verses', 6)], sessions: [
        DaySession('s1', at, 400, 'first-verses', 'lesson', 'c1'),
        DaySession('s2', iso(DateTime(2026, 11, 24, 7)), 60, 'first-verses', 'rise'),
      ]),
      learned: 3,
    );
    await pumpApp(tester, store: store, now: DateTime(2026, 11, 24, 21));
    expect(find.text('When you lie down'), findsOneWidget);
    expect(find.textContaining('Start · '), findsOneWidget);
    expect(find.text('THIS EVENING'), findsNothing, reason: 'it is the big card now, not a row');
    expect(find.text('DONE'), findsOneWidget);
    expect(find.textContaining('When you rise'), findsOneWidget, reason: 'this morning’s recall is done, under Done');
  });
}

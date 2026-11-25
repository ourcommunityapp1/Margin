import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/data/household.dart';
import 'package:katekize/data/store.dart';
import 'package:katekize/engine/dayplan.dart';
import 'package:katekize/engine/models.dart' show iso;
import 'package:katekize/engine/progress.dart';
import 'package:katekize/engine/types.dart';
import 'package:katekize/state/household.dart';

import 'fakes.dart';

/// A phone with one person who has chosen First Verses, and today's record as given.
MemoryStore _phone(Today? Function(String day) today) {
  final h = addMember(emptyHousehold(), 'Ann', Track.adult, 'me', DateTime.utc(2026, 11, 20));
  final plan = setPlan(h, const Plan(course: 'first-verses', minutes: 15));
  const day = '2026-11-24';
  final progress = {'me': emptyProgress().copyWith(today: today(day))};
  return MemoryStore({
    householdKey: householdToJson(plan),
    progressKey: jsonEncode({for (final e in progress.entries) e.key: e.value.toJson()}),
  });
}

void main() {
  testWidgets('a finished day says so, with the minutes, and offers nothing more to start', (tester) async {
    final at = iso(DateTime(2026, 11, 24, 12));
    final store = _phone((day) => Today(day, cards: const [DayCard('c1', 'lesson', 'first-verses', 6)], sessions: [DaySession('s1', at, 400, 'first-verses', 'lesson', 'c1')]));
    await pumpApp(tester, store: store);
    expect(find.text('Today’s lessons are done'), findsOneWidget);
    expect(find.text('7 min'), findsWidgets);
    expect(find.text('Done for today'), findsOneWidget);
    expect(find.text('Begin'), findsNothing);
    // Swipe to the finished card: it says what it was.
    await tester.drag(find.byType(PageView), const Offset(-300, 0));
    await tester.pumpAndSettle();
    expect(find.text('LESSON'), findsOneWidget);
    expect(find.text('7 min'), findsWidgets);
  });

  testWidgets('a fresh day is planned once, and a started card shows its button', (tester) async {
    final store = _phone((day) => null);
    await pumpApp(tester, store: store);
    expect(find.text('Begin'), findsOneWidget);
    final stored = jsonDecode(store.read(progressKey)!) as Map;
    final today = (stored['me'] as Map)['today'] as Map;
    expect(today['day'], '2026-11-24');
    expect((today['cards'] as List), hasLength(1), reason: 'the plan was saved');
  });
}

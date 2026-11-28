import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/data/household.dart';
import 'package:katekize/data/store.dart';
import 'package:katekize/engine/content.dart';
import 'package:katekize/engine/lesson.dart' as lesson;
import 'package:katekize/engine/models.dart' show StepResult;
import 'package:katekize/engine/progress.dart';
import 'package:katekize/engine/types.dart';
import 'package:katekize/state/household.dart';

import 'fakes.dart';

void main() {
  testWidgets('progress after a finished lesson: the day is kept, the course is listed, stones are counted', (tester) async {
    await pumpApp(tester); // loads the content
    final item = getItem('wsc-1')!;
    final unit = lesson.unitsFor(item, Track.adult).first;
    final now = DateTime(2026, 11, 24, 13);
    final p = finishSession(
      emptyProgress(),
      results: [StepResult(itemId: item.id, kind: 'type', correct: true, hints: 0, ms: 9000, review: false, words: 11)],
      learned: [unit],
      courseId: 'westminster-shorter',
      now: now,
      grading: 'v2',
      keepRules: (tz: null),
    );
    final h = setPlan(addMember(emptyHousehold(), 'Ann', Track.adult, 'me', now), const Plan(course: 'westminster-shorter', minutes: 15));
    final store = MemoryStore({householdKey: householdToJson(h), progressKey: jsonEncode({'me': p.toJson()})});
    await tester.pumpWidget(const SizedBox());
    await pumpApp(tester, store: store);

    await tester.tap(find.text('Progress'));
    await tester.pumpAndSettle();
    expect(find.text('WORDS IN YOUR MEMORY'), findsOneWidget);
    // The ring row: verses, catechism answers, minutes this week, the day streak.
    for (final label in ['Verses', 'Catechism', 'Min this week', 'Day streak']) {
      expect(find.text(label), findsOneWidget, reason: 'the $label ring');
    }
    // Hidden for now, as on the website: the hero's sentences, the folds, days kept, awards.
    expect(find.text('Your first words are coming'), findsNothing);
    expect(find.textContaining('How a word gets into your memory'), findsNothing);
    expect(find.textContaining('day by day'), findsNothing);
    expect(find.text('Awards'), findsNothing);
    expect(find.text('Growing'), findsNothing, reason: 'no chart before any words count');
    // The course she began is listed with how far she has got.
    await tester.ensureVisible(find.text('Westminster Shorter Catechism'));
    await tester.pumpAndSettle();
    expect(find.text('Westminster Shorter Catechism'), findsOneWidget);
    expect(find.textContaining('1 of 107 learned'), findsOneWidget);
    // The levels card names every level.
    for (final name in ['Familiar', 'Recalled', 'Memorized', 'Proficient', 'Expert']) {
      await tester.ensureVisible(find.text(name).last);
      expect(find.text(name), findsWidgets);
    }
  });
}

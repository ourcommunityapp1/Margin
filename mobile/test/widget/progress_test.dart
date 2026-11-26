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
    expect(find.text('Today is kept.'), findsOneWidget);
    expect(find.text('day kept'), findsWidgets);
    expect(find.text('WORDS IN YOUR MEMORY'), findsOneWidget);
    // The new layout: the four rings, the hero's sentence, and the folds (closed until tapped).
    for (final label in ['Words', 'Days kept', 'Stones', 'Windows']) {
      expect(find.text(label), findsWidgets, reason: 'the $label ring');
    }
    expect(find.text('Your first words are coming'), findsOneWidget, reason: 'nothing recalled on a later day yet');
    expect(find.text('Recall a verse or answer on a later day and it counts here.'), findsOneWidget);
    expect(find.textContaining('How a word gets into your memory'), findsOneWidget);
    expect(find.textContaining('day by day'), findsOneWidget);
    expect(find.text('Growing'), findsNothing, reason: 'no chart before any words count');
    // The course she began is listed with how far she has got.
    await tester.ensureVisible(find.text('Westminster Shorter Catechism'));
    await tester.pumpAndSettle();
    expect(find.text('Westminster Shorter Catechism'), findsOneWidget);
    expect(find.textContaining('1 of 107 learned'), findsOneWidget);
    // The stones ladder names every stone.
    for (final name in ['Recited', 'Amethyst', 'Topaz', 'Diamond']) {
      await tester.ensureVisible(find.text(name));
      expect(find.text(name), findsOneWidget);
    }
  });
}

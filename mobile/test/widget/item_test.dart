import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:katekize/data/household.dart';
import 'package:katekize/data/store.dart';
import 'package:katekize/engine/content.dart';
import 'package:katekize/engine/lesson.dart' show unitsFor;
import 'package:katekize/engine/models.dart' show StepResult;
import 'package:katekize/engine/progress.dart';
import 'package:katekize/engine/types.dart';
import 'package:katekize/state/household.dart';
import 'package:material_ui/material_ui.dart';

import '../engine/content_loader.dart';
import 'fakes.dart';

/// Ann has learned Shorter Catechism Q1 (Nov 20) and answered it twice since, missing a word once.
MemoryStore _phone() {
  final h = addMember(emptyHousehold(), 'Ann', Track.adult, 'me', DateTime.utc(2026, 11, 20));
  final plan = setPlan(h, const Plan(course: 'westminster-shorter', minutes: 15));
  final item = getItem('wsc-1')!;
  final part = unitsFor(item, Track.adult).first;
  var p = finishSession(emptyProgress(),
      results: [StepResult(itemId: item.id, kind: 'type', correct: true, hints: 0, ms: 1, review: false)],
      learned: unitsFor(item, Track.adult),
      courseId: 'westminster-shorter',
      now: DateTime(2026, 11, 20, 10));
  for (final (d, ok) in [(21, false), (22, true)]) {
    p = finishSession(p,
        results: [StepResult(itemId: item.id, kind: 'type', correct: ok, hints: 0, ms: 1, review: true, part: part.key, of: 1, misses: ok ? 0 : 1, words: 12, missed: ok ? const [] : const [3])],
        now: DateTime(2026, 11, d, 9));
  }
  return MemoryStore({householdKey: householdToJson(plan), progressKey: jsonEncode({'me': p.toJson()})});
}

void main() {
  loadTestContent();

  testWidgets('a learned question shows its strength, its stats, and Practice and Review', (tester) async {
    await pumpApp(tester, store: _phone());
    GoRouter.of(tester.element(find.byType(Navigator).first)).push('/item/wsc-1');
    await tester.pumpAndSettle();
    // Practice and Review straight under the passage, then one status card.
    expect(find.text('Practice'), findsOneWidget);
    expect(find.text('Review'), findsOneWidget);
    expect(find.bySemanticsLabel('Review: type or say the whole answer from memory'), findsOneWidget);
    expect(find.textContaining('%'), findsWidgets);
    expect(find.text('recited perfectly'), findsOneWidget);
    expect(find.text('times practised'), findsOneWidget);
    expect(find.text('3'), findsOneWidget, reason: 'the lesson and two reviews');
    expect(find.text('next review'), findsNothing, reason: 'taken off the card');
    // The date learned sits beside the two numbers; no "Last time" row.
    expect(find.text('learned'), findsOneWidget);
    expect(find.text('Nov 20'), findsOneWidget);
    expect(find.text('Last time'), findsNothing);
    // The card comes before Practice and Review.
    expect(tester.getTopLeft(find.text('recited perfectly')).dy, lessThan(tester.getTopLeft(find.text('Practice')).dy));
    // The word missed once is coloured; the passage word by word and its strength line follow.
    await tester.scrollUntilVisible(find.text('Word by word'), 200);
    expect(find.text('Missed a lot'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Strength over time'), 200);
    expect(find.text('85% is the target'), findsOneWidget);
  });

  testWidgets('the course page shows its three numbers and each question’s strength, 0% before it is started', (tester) async {
    await pumpApp(tester, store: _phone());
    GoRouter.of(tester.element(find.byType(Navigator).first)).push('/courses/westminster-shorter');
    await tester.pumpAndSettle();
    expect(find.text('1%'), findsOneWidget);
    expect(find.text('of the course done'), findsOneWidget);
    expect(find.text('learned of 107'), findsOneWidget);
    expect(find.text('in memory'), findsNothing);
    expect(find.text('0%'), findsWidgets, reason: 'questions not started yet');
    expect(find.text('average strength'), findsOneWidget);
  });

  testWidgets('In your plan comes first on Learn, with the course Ann has begun', (tester) async {
    await pumpApp(tester, store: _phone());
    GoRouter.of(tester.element(find.byType(Navigator).first)).go('/courses');
    await tester.pumpAndSettle();
    final mine = find.text('In your plan');
    expect(mine, findsOneWidget);
    final wsc = find.text('Westminster Shorter Catechism');
    expect(wsc, findsOneWidget, reason: 'listed once, under In your plan, not again on its shelf');
    expect(tester.getTopLeft(mine).dy, lessThan(tester.getTopLeft(wsc).dy));
  });
}

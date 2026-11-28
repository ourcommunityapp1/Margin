import 'package:katekize/platform/haptics.dart';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/features/courses/plan_buttons.dart' show PlanRow;
import 'package:katekize/data/content_assets.dart';
import 'package:katekize/data/household.dart';
import 'package:katekize/data/removed.dart';
import 'package:katekize/data/store.dart';
import 'package:katekize/engine/content.dart';
import 'package:katekize/engine/lesson.dart' as lesson;
import 'package:katekize/engine/models.dart' show StepResult;
import 'package:katekize/engine/progress.dart';
import 'package:katekize/engine/types.dart';
import 'package:katekize/state/household.dart';
import 'package:material_ui/material_ui.dart' show Scrollable, Switch, TextField;

import 'fakes.dart';

/// Progress after one lesson of Q1.
MemberProgress _lesson() {
  final item = getItem('wsc-1')!;
  return finishSession(
    emptyProgress(),
    results: [StepResult(itemId: item.id, kind: 'type', correct: true, hints: 0, ms: 9000, review: false, words: 11)],
    learned: [lesson.unitsFor(item, Track.adult).first],
    courseId: 'westminster-shorter',
    now: DateTime(2026, 11, 20, 10),
    grading: 'v2',
    keepRules: (tz: null),
  );
}

/// A phone with Ann (on First Verses, 15 minutes) and, if asked, Ben (with a lesson behind him).
Future<MemoryStore> _phone(WidgetTester tester, {bool ben = false}) async {
  await tester.runAsync(loadBundledContent);
  var h = setPlan(addMember(emptyHousehold(), 'Ann', Track.adult, 'ann', DateTime(2026, 11, 1)), const Plan(course: 'first-verses', minutes: 15));
  if (ben) h = addMember(h, 'Ben', Track.child, 'ben', DateTime(2026, 11, 2));
  return MemoryStore({
    householdKey: householdToJson(h),
    progressKey: jsonEncode({'ann': _lesson().toJson(), if (ben) 'ben': _lesson().toJson()}),
  });
}

Map<String, dynamic> _household(MemoryStore s) => jsonDecode(s.read(householdKey)!) as Map<String, dynamic>;

Future<void> _openYou(WidgetTester tester) async {
  await tester.tap(find.bySemanticsLabel(RegExp('^You: Ann')));
  await tester.pumpAndSettle();
}

Future<void> _tap(WidgetTester tester, String text) async {
  await tester.ensureVisible(find.text(text).first);
  await tester.pumpAndSettle();
  await tester.tap(find.text(text).first);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('You lists the settings with where each stands', (tester) async {
    await pumpApp(tester, store: await _phone(tester));
    await _openYou(tester);
    expect(find.text('Ann'), findsWidgets);
    expect(find.text('Course and daily goal'), findsOneWidget);
    expect(find.text('First Verses · 15 min a day'), findsOneWidget);
    expect(find.text('Just you · add someone'), findsOneWidget);
    expect(find.text('How it works'), findsOneWidget);
    expect(find.text('About Katekize'), findsOneWidget);
  });

  testWidgets('adding a course to the plan keeps the daily goal and saves; changing the goal saves', (tester) async {
    final store = await _phone(tester);
    await pumpApp(tester, store: store);
    await _openYou(tester);
    await _tap(tester, 'Course and daily goal');
    expect(find.text('Your plan'), findsOneWidget);
    expect(find.text('Your daily goal'), findsOneWidget);
    expect(find.text('What the levels mean'), findsOneWidget);
    expect(find.text('How each recall is graded'), findsOneWidget);

    await _tap(tester, '25 minutes a day');
    expect((_household(store)['plan'] as Map)['minutes'], 25);
    expect((_household(store)['plan'] as Map)['course'], 'first-verses');

    // Add Psalm 23 to the plan: it becomes the daily course and the goal stays.
    final psalmRow = find.ancestor(of: find.text('Psalm 23'), matching: find.byType(PlanRow));
    await tester.ensureVisible(psalmRow);
    await tester.tap(find.descendant(of: psalmRow, matching: find.text('Add to plan')));
    await tester.pumpAndSettle();
    final plan = _household(store)['plan'] as Map;
    expect(plan['course'], 'psalm-23');
    expect(plan['minutes'], 25, reason: 'switching course keeps the goal');
    expect(find.descendant(of: psalmRow, matching: find.text('Added to plan')), findsOneWidget);
  });

  testWidgets('family: add someone, change their track, remove them, bring them back', (tester) async {
    final store = await _phone(tester, ben: false);
    await pumpApp(tester, store: store);
    await _openYou(tester);
    await _tap(tester, 'Family');

    await tester.enterText(find.byType(TextField), 'Ben');
    await tester.pump();
    await _tap(tester, 'Child track');
    await _tap(tester, 'Add');
    var members = (_household(store)['members'] as List).cast<Map>();
    expect(members.map((m) => m['name']), ['Ann', 'Ben']);
    expect(members.last['track'], 'child');
    expect(_household(store)['activeMemberId'], 'ann', reason: 'adding someone does not change who is active');

    // Switch Ben's track with its tag.
    await tester.tap(find.bySemanticsLabel('Switch Ben to the adult track'));
    await tester.pumpAndSettle();
    members = (_household(store)['members'] as List).cast<Map>();
    expect(members.last['track'], 'adult');

    // Remove Ben: asks first; Keep leaves him.
    await tester.tap(find.bySemanticsLabel('Remove Ben'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Remove Ben?'), findsOneWidget);
    await tester.tap(find.text('Keep Ben'));
    await tester.pumpAndSettle();
    expect((_household(store)['members'] as List), hasLength(2));
    await tester.tap(find.bySemanticsLabel('Remove Ben'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Remove'));
    await tester.pumpAndSettle();
    expect((_household(store)['members'] as List), hasLength(1));
    expect(readRemoved(store).map((g) => g.name), ['Ben'], reason: 'remembered, so he can be brought back with his name');
  });

  testWidgets('a removed person whose progress is still here can be brought back, or folded into someone', (tester) async {
    final store = await _phone(tester, ben: true);
    await pumpApp(tester, store: store);
    await _openYou(tester);
    await _tap(tester, 'Family');
    await tester.tap(find.bySemanticsLabel('Remove Ben'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Remove'));
    await tester.pumpAndSettle();

    // His lesson is still on the phone, so he is offered back.
    expect(find.text('Bring back a removed person'), findsOneWidget);
    expect(find.textContaining('1 lesson · 1 day kept · 0 stones'), findsOneWidget);
    expect(find.text('Bring back Ben'), findsOneWidget);
    await _tap(tester, 'Bring back Ben');
    final members = (_household(store)['members'] as List).cast<Map>();
    expect(members.map((m) => m['name']), ['Ann', 'Ben']);
    expect(members.last['id'], 'ben', reason: 'under his old id, so his progress is his again');
    expect(find.text('Bring back a removed person'), findsNothing);
  });

  testWidgets('start over clears the person’s progress only after asking', (tester) async {
    final store = await _phone(tester, ben: true);
    await pumpApp(tester, store: store);
    await _openYou(tester);
    await _tap(tester, 'Start over');
    expect(find.textContaining('begin again from the welcome lesson'), findsOneWidget);
    await _tap(tester, 'Keep it');
    expect((jsonDecode(store.read(progressKey)!) as Map).keys, containsAll(['ann', 'ben']), reason: 'Keep it changes nothing');
    await _tap(tester, 'Start over');
    await _tap(tester, 'Erase progress');
    final saved = jsonDecode(store.read(progressKey)!) as Map;
    expect(saved.keys, ['ben'], reason: 'only Ann’s progress is cleared');
    expect(find.textContaining('progress is cleared'), findsOneWidget);
  });

  testWidgets('How it works explains the levels, the grades and spaced review', (tester) async {
    await pumpApp(tester, store: await _phone(tester));
    await _openYou(tester);
    await _tap(tester, 'How it works');
    expect(find.text('The five levels'), findsOneWidget);
    expect(find.textContaining('Bronze'), findsWidgets);
    expect(find.text('How each recall is graded'), findsOneWidget);
    for (final w in ['Forgot', 'Shaky', 'Solid', 'Effortless']) {
      expect(find.text(w), findsOneWidget);
    }
    await tester.ensureVisible(find.text('Spaced review'));
    expect(find.text('Spaced review'), findsOneWidget);
  });

  testWidgets('Vibration can be turned off on You, and stays off', (tester) async {
    final store = await _phone(tester);
    await pumpApp(tester, store: store);
    await _openYou(tester);
    await tester.scrollUntilVisible(find.text('Vibration'), 200, scrollable: find.byType(Scrollable).first);
    expect(Haptics.enabled, isTrue);
    await tester.tap(find.byType(Switch).last);
    await tester.pumpAndSettle();
    expect(Haptics.enabled, isFalse);
    expect(store.read('hr-haptics'), 'off');
    Haptics.enabled = true;
  });
}

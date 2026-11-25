import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/data/content_assets.dart';
import 'package:katekize/data/store.dart';
import 'package:katekize/engine/content.dart';
import 'package:katekize/engine/lesson.dart' as lesson;
import 'package:katekize/engine/types.dart';
import 'package:katekize/features/lesson/lesson_screen.dart';
import 'package:katekize/features/lesson/outcome.dart';
import 'package:katekize/features/lesson/session.dart';
import 'package:katekize/state/clock.dart';
import 'package:katekize/state/auth.dart';
import 'package:katekize/state/household.dart';
import 'package:katekize/state/sync.dart';
import 'package:katekize/ui/theme.dart';
import 'package:material_ui/material_ui.dart';

import 'fakes.dart' show FakeAuth;

/// A lesson on the first part of Westminster Shorter Catechism Q1, built by the engine (the same builders the app uses).
Future<({Session session, lesson.Unit unit})> _session(WidgetTester tester) async {
  await tester.runAsync(loadBundledContent);
  final item = getItem('wsc-1')!;
  final unit = lesson.unitsFor(item, Track.adult).first;
  final steps = lesson.buildLite(unit: unit, item: item, track: Track.adult, pool: allItems(), rng: lesson.seeded(7));
  final session = Session(
    label: 'Lesson 1',
    kind: 'learn',
    steps: steps,
    units: [unit],
    group: null,
    courseId: 'westminster-shorter',
    memberId: 'me',
    dayCourse: 'westminster-shorter',
  );
  return (session: session, unit: unit);
}

Future<ProviderContainer> _pump(WidgetTester tester, Session session, Store store) async {
  tester.view.physicalSize = const Size(1206, 2622);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        storeProvider.overrideWithValue(store),
        accountApiProvider.overrideWithValue(null),
        authProvider.overrideWithValue(FakeAuth(accounts: false)),
        clockProvider.overrideWithValue(() => DateTime(2026, 11, 24, 14)),
      ],
      child: MaterialApp(theme: katekizeTheme(), home: LessonScreen(session: session, track: Track.adult)),
    ),
  );
  await tester.pumpAndSettle();
  return ProviderScope.containerOf(tester.element(find.byType(LessonScreen)));
}

Future<void> _tap(WidgetTester tester, String text) async {
  await tester.ensureVisible(find.text(text).first);
  await tester.pumpAndSettle();
  await tester.tap(find.text(text).first);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('a lesson: read it, put it in order, fill the blanks, type it, done and saved', (tester) async {
    final s = await _session(tester);
    final steps = s.session.steps;
    expect(steps.map((x) => x.kind), ['intro', 'order', 'blanks', 'type']);
    final order = steps[1], blanks = steps[2], type = steps[3];
    expect(order.pieces, isTrue, reason: 'two phrases are put in order as phrases');
    final store = MemoryStore();
    final container = await _pump(tester, s.session, store);

    // Read it.
    expect(find.text('New question'), findsOneWidget);
    expect(find.text('What is the chief end of man?'), findsOneWidget);
    await _tap(tester, 'Continue');

    // Put the phrases in order.
    expect(find.text('Put the phrases in order'), findsOneWidget);
    for (final t in order.tiles!) {
      await _tap(tester, t);
    }
    await _tap(tester, 'Check');
    expect(find.text('That’s right.'), findsOneWidget);
    await _tap(tester, 'Continue');

    // Fill in the missing words.
    expect(find.text('Fill in the missing words'), findsOneWidget);
    final tokens = blanks.text!.split(' ');
    for (final (n, i) in blanks.blanks!.indexed) {
      await tester.enterText(find.byType(TextField).at(n), splitToken(tokens[i]).core);
    }
    await tester.pump();
    await _tap(tester, 'Check');
    expect(find.text('Well done.'), findsOneWidget);
    await _tap(tester, 'Continue');

    // Type it.
    expect(find.text('Type it from memory'), findsOneWidget);
    await tester.enterText(find.byType(TextField), type.text!);
    await tester.pump();
    await _tap(tester, 'Check');
    expect(find.text('Correct.'), findsOneWidget);
    await _tap(tester, 'Continue');

    // Done, and saved.
    expect(find.text('Lesson 1 complete'), findsOneWidget);
    expect(find.text('3 of 3 right the first time.'), findsOneWidget);
    final mine = container.read(progressProvider)['me']!;
    expect(mine.units, [s.unit.key], reason: 'the part is now learned');
    expect(mine.log.where((e) => e.kind != 'intro').length, 3, reason: 'each answer is in the log');
    expect(mine.cards.keys, contains('wsc-1'));
    expect(mine.today!.sessions.single.kind, 'lesson');
    expect(mine.days, hasLength(1));
    // …and on the phone's storage, in the website's own format.
    final stored = jsonDecode(store.read(progressKey)!) as Map;
    expect((stored['me'] as Map)['units'], [s.unit.key]);
  });

  testWidgets('a wrong answer is shown, then comes back at the end for a second try', (tester) async {
    final s = await _session(tester);
    await _pump(tester, s.session, MemoryStore());
    await _tap(tester, 'Continue');

    // Put the phrases in the wrong order.
    for (final t in s.session.steps[1].tiles!.reversed) {
      await _tap(tester, t);
    }
    await _tap(tester, 'Check');
    expect(find.textContaining('out of order'), findsOneWidget);
    expect(find.text('You’ll get another try at the end.'), findsOneWidget);
    expect(find.text('Man’s chief end is to glorify God, and to enjoy him forever.'), findsOneWidget, reason: 'the right answer is revealed');
    await _tap(tester, 'Continue');
    expect(find.text('Fill in the missing words'), findsOneWidget);
  });
}

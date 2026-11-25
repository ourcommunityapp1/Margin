import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/data/content_assets.dart';
import 'package:katekize/engine/content.dart';
import 'package:katekize/engine/lesson.dart' as lesson;
import 'package:katekize/engine/types.dart';
import 'package:katekize/features/lesson/lesson_screen.dart';
import 'package:katekize/features/lesson/outcome.dart';
import 'package:katekize/ui/theme.dart';
import 'package:material_ui/material_ui.dart';

/// Steps for the first part of Westminster Shorter Catechism Q1, built by the engine (the same builder the app uses).
Future<List<lesson.Step>> _steps(WidgetTester tester) async {
  await tester.runAsync(loadBundledContent);
  final item = getItem('wsc-1')!;
  final unit = lesson.unitsFor(item, Track.adult).first;
  return lesson.buildLite(unit: unit, item: item, track: Track.adult, pool: allItems(), rng: lesson.seeded(7));
}

Future<void> _pump(WidgetTester tester, List<lesson.Step> steps) async {
  tester.view.physicalSize = const Size(1206, 2622);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(MaterialApp(theme: katekizeTheme(), home: LessonScreen(steps: steps, track: Track.adult, label: 'Practice · Q1')));
  await tester.pumpAndSettle();
}

Future<void> _tap(WidgetTester tester, String text) async {
  await tester.ensureVisible(find.text(text).first);
  await tester.pumpAndSettle();
  await tester.tap(find.text(text).first);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('a practice lesson: read it, put it in order, fill the blanks, type it, done', (tester) async {
    final steps = await _steps(tester);
    expect(steps.map((s) => s.kind), ['intro', 'order', 'blanks', 'type']);
    final order = steps[1], blanks = steps[2], type = steps[3];
    expect(order.pieces, isTrue, reason: 'two phrases are put in order as phrases');
    await _pump(tester, steps);

    // Read it.
    expect(find.text('New question'), findsOneWidget);
    expect(find.text('What is the chief end of man?'), findsOneWidget);
    await _tap(tester, 'Continue');

    // Put the phrases in order.
    expect(find.text('Put the phrases in order'), findsOneWidget);
    expect(find.text('Check'), findsOneWidget);
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

    // Done: nothing saved yet, and the screen says so.
    expect(find.text('Practice complete'), findsOneWidget);
    expect(find.text('3 of 3 right the first time.'), findsOneWidget);
    expect(find.textContaining('nothing was saved yet'), findsOneWidget);
  });

  testWidgets('a wrong answer is shown, then comes back at the end for a second try', (tester) async {
    final steps = await _steps(tester);
    await _pump(tester, steps);
    await _tap(tester, 'Continue');

    // Put the phrases in the wrong order.
    for (final t in steps[1].tiles!.reversed) {
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

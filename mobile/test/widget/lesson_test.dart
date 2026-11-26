import 'dart:convert';

import 'package:flutter/services.dart' show SystemChannels;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/data/content_assets.dart';
import 'package:katekize/data/household.dart';
import 'package:katekize/data/store.dart';
import 'package:katekize/engine/content.dart';
import 'package:katekize/engine/lesson.dart' as lesson;
import 'package:katekize/engine/types.dart';
import 'package:katekize/features/lesson/lesson_screen.dart';
import 'package:katekize/features/lesson/outcome.dart';
import 'package:katekize/features/lesson/session.dart';
import 'package:katekize/features/window/light.dart';
import 'package:katekize/engine/progress.dart' show emptyProgress;
import 'package:katekize/state/clock.dart';
import 'package:katekize/state/auth.dart';
import 'package:katekize/state/household.dart';
import 'package:katekize/state/sync.dart';
import 'package:katekize/ui/theme.dart';
import 'package:material_ui/material_ui.dart';

import 'package:katekize/data/verses.dart';
import 'package:katekize/platform/speech.dart';

import 'fakes.dart' show FakeAuth, FakeSpeech, FakeVerses;

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
    before: windowLight(courseItems(getCourse('westminster-shorter')!), Track.adult, emptyProgress(), DateTime(2026, 11, 24)),
  );
  return (session: session, unit: unit);
}

Future<ProviderContainer> _pump(WidgetTester tester, Session session, Store store, {SpeechService? speech, VerseApi? verses}) async {
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
        speechProvider.overrideWithValue(speech ?? FakeSpeech()),
        verseApiProvider.overrideWithValue(verses ?? FakeVerses()),
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
    // The person doing the lesson (the done screen reads their progress).
    final store = MemoryStore({householdKey: householdToJson(addMember(emptyHousehold(), 'Ann', Track.adult, 'me', DateTime(2026, 11, 20)))});
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
    // The window shows the light this lesson earned.
    expect(find.text('New light: Q1'), findsOneWidget);
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

  testWidgets('the phone taps: lightly for a right answer, firmly for a wrong one, and at the end', (tester) async {
    final taps = <String>[];
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
      if (call.method == 'HapticFeedback.vibrate') taps.add(call.arguments as String);
      return null;
    });
    addTearDown(() => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, null));
    final s = await _session(tester);
    final store = MemoryStore({householdKey: householdToJson(addMember(emptyHousehold(), 'Ann', Track.adult, 'me', DateTime(2026, 11, 20)))});
    await _pump(tester, s.session, store);
    await _tap(tester, 'Continue');
    // Wrong first.
    for (final t in s.session.steps[1].tiles!.reversed) {
      await _tap(tester, t);
    }
    await _tap(tester, 'Check');
    expect(taps.where((t) => t == 'HapticFeedbackType.heavyImpact'), hasLength(1));
    expect(taps.where((t) => t == 'HapticFeedbackType.lightImpact'), isEmpty);
  });

  testWidgets('the feedback sheet sits above the keyboard when it is still up', (tester) async {
    final s = await _session(tester);
    await _pump(tester, s.session, MemoryStore());
    await _tap(tester, 'Continue');
    for (final t in s.session.steps[1].tiles!) {
      await _tap(tester, t);
    }
    // The keyboard comes up (the website's pages shrink for it; these do not, so the sheet must clear it).
    tester.view.viewInsets = const FakeViewPadding(bottom: 800); // 800 physical pixels = 267 points
    await tester.pumpAndSettle();
    await tester.tap(find.text('Check'));
    await tester.pumpAndSettle();
    final screenHeight = tester.view.physicalSize.height / tester.view.devicePixelRatio;
    final bottom = tester.getBottomLeft(find.text('Continue')).dy;
    expect(bottom, lessThanOrEqualTo(screenHeight - 800 / tester.view.devicePixelRatio + 1), reason: 'the Continue button is not behind the keyboard');
    addTearDown(tester.view.resetViewInsets);
  });

  testWidgets('first letters: typing every letter finishes the step and shows the feedback', (tester) async {
    await tester.runAsync(loadBundledContent);
    const text = 'The people who walk in darkness Will see a great';
    final step = lesson.Step(id: 'letters-1', itemId: 'wsc-1', kind: 'letters', review: true, text: text, lead: '');
    final session = Session(label: 'Practice', kind: 'review', steps: [step], units: const [], group: null, courseId: '', memberId: 'me', mode: 'item', dayCourse: 'westminster-shorter');
    await _pump(tester, session, MemoryStore());
    expect(find.text('Type the first letter of each word'), findsOneWidget);
    for (final ch in 'tpwwidwsag'.split('')) {
      await tester.enterText(find.byType(TextField), ch);
      await tester.pump();
    }
    await tester.pumpAndSettle();
    expect(find.text('Continue'), findsOneWidget, reason: 'the feedback sheet shows once the last word is typed');
  });

  testWidgets('a long typed answer keeps the whole field in view above the keyboard', (tester) async {
    final s = await _session(tester);
    final type = s.session.steps.last;
    final session = Session(
      label: s.session.label,
      kind: s.session.kind,
      steps: [type],
      units: s.session.units,
      group: null,
      courseId: s.session.courseId,
      memberId: s.session.memberId,
      dayCourse: s.session.dayCourse,
      before: s.session.before,
    );
    await _pump(tester, session, MemoryStore({householdKey: householdToJson(addMember(emptyHousehold(), 'Ann', Track.adult, 'me', DateTime(2026, 11, 20)))}));
    // The keyboard takes the bottom 340 points of an 874-point screen.
    tester.view.viewInsets = const FakeViewPadding(bottom: 340 * 3);
    addTearDown(tester.view.resetViewInsets);
    await tester.pumpAndSettle();
    final long = List.filled(6, 'and all their actions every one of them always').join(' ');
    await tester.enterText(find.byType(TextField), long);
    await tester.pumpAndSettle();
    final field = tester.getRect(find.byType(TextField));
    final check = tester.getRect(find.text('Check'));
    expect(field.bottom, lessThanOrEqualTo(check.top), reason: 'the field’s bottom edge is above Check, not cut off');
  });

  group('say it from memory', () {
    /// A session of one "say" step, made from the lesson's typing step.
    Future<({Session session, lesson.Step step})> sayOnly(WidgetTester tester) async {
      final s = await _session(tester);
      final type = s.session.steps.last;
      final say = type.copyWith(kind: 'say');
      return (
        session: Session(
          label: s.session.label,
          kind: s.session.kind,
          steps: [say],
          units: s.session.units,
          group: null,
          courseId: s.session.courseId,
          memberId: s.session.memberId,
          dayCourse: s.session.dayCourse,
          before: s.session.before,
        ),
        step: say,
      );
    }

    MemoryStore store() => MemoryStore({householdKey: householdToJson(addMember(emptyHousehold(), 'Ann', Track.adult, 'me', DateTime(2026, 11, 20)))});

    testWidgets('tap, say it, tap again: what was heard is graded', (tester) async {
      final s = await sayOnly(tester);
      final mic = FakeSpeech();
      await _pump(tester, s.session, store(), speech: mic);
      expect(find.text('Tap, then say the answer.'), findsOneWidget);
      await tester.tap(find.bySemanticsLabel('Start speaking'));
      await tester.pumpAndSettle();
      expect(mic.starts, 1);
      expect(mic.hints, isNotEmpty, reason: 'the answer’s rare words go with it, for ElevenLabs');
      expect(find.text('Listening. Tap again when you’re done.'), findsOneWidget);
      mic.say(s.step.text!);
      await tester.pumpAndSettle();
      expect(find.text(s.step.text!), findsOneWidget, reason: 'the words heard are shown as they come');
      await tester.tap(find.bySemanticsLabel('Stop and check'));
      await tester.pumpAndSettle();
      expect(find.text('Correct.'), findsOneWidget);
    });

    testWidgets('words that were not said are marked', (tester) async {
      final s = await sayOnly(tester);
      final mic = FakeSpeech();
      await _pump(tester, s.session, store(), speech: mic);
      await tester.tap(find.bySemanticsLabel('Start speaking'));
      await tester.pumpAndSettle();
      mic.say(s.step.text!.split(' ').take(2).join(' '));
      mic.end(); // a long pause ends it
      await tester.pumpAndSettle();
      expect(find.textContaining('weren’t heard'), findsOneWidget);
    });

    testWidgets('hearing nothing asks to try again and does not count', (tester) async {
      final s = await sayOnly(tester);
      final mic = FakeSpeech();
      await _pump(tester, s.session, store(), speech: mic);
      await tester.tap(find.bySemanticsLabel('Start speaking'));
      await tester.pumpAndSettle();
      mic.end();
      await tester.pumpAndSettle();
      expect(find.text('We didn’t hear anything. Tap and try again.'), findsOneWidget);
      expect(find.bySemanticsLabel('Start speaking'), findsOneWidget);
    });

    testWidgets('with the microphone refused it falls back to checking yourself', (tester) async {
      final s = await sayOnly(tester);
      await _pump(tester, s.session, store(), speech: FakeSpeech(allow: false));
      await tester.tap(find.bySemanticsLabel('Start speaking'));
      await tester.pumpAndSettle();
      expect(find.textContaining('This phone can’t listen right now'), findsOneWidget);
      expect(find.text('Say it aloud without looking. Then check yourself.'), findsOneWidget);
      await _tap(tester, 'Show the words');
      await _tap(tester, 'I said it all');
      expect(find.text('Correct.'), findsOneWidget);
    });

    testWidgets('“Can’t speak now, type it” turns it into typing and stops listening', (tester) async {
      final s = await sayOnly(tester);
      final mic = FakeSpeech();
      await _pump(tester, s.session, store(), speech: mic);
      await _tap(tester, 'Can’t speak now, type it');
      expect(find.text('Type it from memory'), findsOneWidget);
      expect(mic.cancels, greaterThan(0));
    });

    testWidgets('after “Can’t speak now”, nothing else in that lesson asks to speak, not even a second try', (tester) async {
      final s = await sayOnly(tester);
      final first = s.step.copyWith(id: 'say-1');
      final second = lesson.Step(id: 'say-2', itemId: 'wsc-2', kind: 'say', review: false, lead: 'What rule hath God given to direct us?', text: 'The word of God is the only rule');
      final session = Session(
        label: s.session.label,
        kind: s.session.kind,
        steps: [first, second],
        units: s.session.units,
        group: null,
        courseId: s.session.courseId,
        memberId: s.session.memberId,
        dayCourse: s.session.dayCourse,
        before: s.session.before,
      );
      final mic = FakeSpeech();
      await _pump(tester, session, store(), speech: mic);
      // The first: said, but only part of it, so it comes back at the end for a second try.
      await tester.tap(find.bySemanticsLabel('Start speaking'));
      await tester.pumpAndSettle();
      mic.say(first.text!.split(' ').take(2).join(' '));
      mic.end();
      await tester.pumpAndSettle();
      await _tap(tester, 'Continue');
      // The second: can't speak now.
      expect(find.bySemanticsLabel('Start speaking'), findsOneWidget);
      await _tap(tester, 'Can’t speak now, type it');
      expect(find.text('Type it from memory'), findsOneWidget);
      await tester.enterText(find.byType(TextField), second.text!);
      await tester.pumpAndSettle();
      await _tap(tester, 'Check');
      await _tap(tester, 'Continue');
      // The second try of the first: typed, never the microphone again.
      expect(find.text('Type it from memory'), findsOneWidget);
      expect(find.bySemanticsLabel('Start speaking'), findsNothing);
      expect(find.text('Can’t speak now, type it'), findsNothing);
    });
  });

  group('the verse', () {
    /// A session of one verse step, for the first verse in the bundled content.
    Future<({Session session, String itemId, String kjv, String ref})> verseOnly(WidgetTester tester) async {
      final s = await _session(tester);
      final itemId = verses.keys.first;
      final v = verses[itemId]!;
      final step = lesson.Step(id: 'v', itemId: itemId, kind: 'verse', review: false, ref: v.ref, text: v.text);
      return (
        session: Session(
          label: s.session.label,
          kind: s.session.kind,
          steps: [step],
          units: s.session.units,
          group: null,
          courseId: s.session.courseId,
          memberId: s.session.memberId,
          dayCourse: s.session.dayCourse,
          before: s.session.before,
        ),
        itemId: itemId,
        kjv: v.text,
        ref: v.ref,
      );
    }

    MemoryStore store() => MemoryStore({householdKey: householdToJson(addMember(emptyHousehold(), 'Ann', Track.adult, 'me', DateTime(2026, 11, 20)))});

    testWidgets('shows the NASB once it is fetched, tagged “NASB 2020” and linking to the Lockman Foundation', (tester) async {
      final s = await verseOnly(tester);
      final api = FakeVerses({s.itemId: 'The NASB words of this verse.'});
      await _pump(tester, s.session, store(), verses: api);
      await tester.pumpAndSettle();
      expect(api.asked, [s.itemId]);
      expect(find.text('The NASB words of this verse.'), findsOneWidget);
      expect(find.text('${s.ref} (NASB 2020)'), findsOneWidget);
      expect(find.bySemanticsLabel('${s.ref}, NASB 2020, opens lockman.org'), findsOneWidget);
      expect(find.text(s.kjv), findsNothing);
    });

    testWidgets('when it can’t be fetched the verse shows in the KJV that ships with the app', (tester) async {
      final s = await verseOnly(tester);
      await _pump(tester, s.session, store(), verses: FakeVerses());
      await tester.pumpAndSettle();
      expect(find.text(s.kjv), findsOneWidget);
      expect(find.text('${s.ref} (KJV)'), findsOneWidget);
      expect(find.textContaining('NASB'), findsNothing);
    });
  });
}

import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/engine/content.dart';
import 'package:katekize/engine/lesson.dart' show buildPractice, seeded, unitsFor;
import 'package:katekize/engine/models.dart' show StepResult;
import 'package:katekize/engine/progress.dart';
import 'package:katekize/engine/types.dart';
import 'package:katekize/features/lesson/session.dart';

import 'engine/content_loader.dart';

void main() {
  loadTestContent();
  final now = DateTime(2026, 11, 25, 10);

  test('a new person’s first lesson is the course’s welcome lesson', () {
    final s = buildLessonSession(course: getCourse('first-verses')!, track: Track.adult, mine: emptyProgress(), memberId: 'me', now: now);
    expect(s.label, 'Welcome');
    expect(s.kind, 'learn');
    expect(s.steps, isNotEmpty);
    expect(s.steps.first.kind, 'info', reason: 'the welcome cards come first');
    expect(s.units, hasLength(1));
    expect(s.courseId, 'first-verses');
  });

  test('practising one item is not a lesson of the course', () {
    final s = buildItemSession(dayCourse: 'westminster-shorter', item: getItem('wsc-1')!, track: Track.adult, mine: emptyProgress(), memberId: 'me', now: now);
    expect(s.label, 'Practice · Q1');
    expect(s.courseId, isEmpty);
    expect(s.units, isEmpty);
    expect(s.steps, isNotEmpty);
    expect(s.steps.every((x) => x.itemId == 'wsc-1'), isTrue);
  });

  test('“Learn it” teaches that one verse’s next part, not the course’s next lesson', () {
    final s = buildLessonSession(course: getCourse('first-verses')!, track: Track.adult, mine: emptyProgress(), memberId: 'me', now: now, mode: 'learn', learnItemId: 'fv-3');
    expect(s.kind, 'learn');
    expect(s.mode, 'learn');
    expect(s.units.single.itemId, 'fv-3');
    expect(s.steps.where((x) => x.kind != 'info').every((x) => x.itemId == 'fv-3' || x.review), isTrue);
  });

  test('practice on one verse is about two minutes: a varied run of quick steps, then the whole thing typed (lesson.test.ts)', () {
    final item = getItem('wsc-2')!;
    final steps = buildPractice(item: item, track: Track.adult, pool: courseItems(getCourse('westminster-shorter')!), rng: seeded(7));
    expect(steps.length, inInclusiveRange(4, 6));
    expect(steps.last.kind, 'type');
    expect(steps.every((s) => s.itemId == 'wsc-2' && s.review && s.part != null), isTrue);
    for (var i = 1; i < steps.length; i++) {
      expect(steps[i].kind, isNot(steps[i - 1].kind), reason: 'no step twice in a row');
    }
  });

  test('extra practice leaves out a course taken out of the plan', () {
    final us = unitsFor(getItem('fv-3')!, Track.adult);
    final p = finishSession(emptyProgress(),
        results: [
          StepResult(itemId: 'fv-3', kind: 'intro', correct: true, hints: 0, ms: 1, review: false),
          for (final u in us) StepResult(itemId: 'fv-3', kind: 'type', correct: true, hints: 0, ms: 1, review: false, part: u.key, of: us.length),
        ],
        learned: us,
        courseId: 'first-verses',
        now: DateTime(2026, 11, 1, 9));
    final later = DateTime(2026, 11, 25, 10);
    final kept = buildExtraSession(focus: null, track: Track.adult, mine: p, memberId: 'me', now: later);
    final removed = buildExtraSession(focus: null, track: Track.adult, mine: p, memberId: 'me', now: later, removed: ['first-verses']);
    expect(kept.steps.any((x) => x.itemId == 'fv-3'), isTrue);
    expect(removed.steps.any((x) => x.itemId == 'fv-3'), isFalse);
  });
}

import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/engine/fsrs.dart';

import 'fixture.dart';

Map<String, Object?> saved(FsrsCard c) => {
      'due': c.due.toIso8601String(),
      'stability': c.stability,
      'difficulty': c.difficulty,
      'scheduled_days': c.scheduledDays,
      'reps': c.reps,
      'lapses': c.lapses,
      'learning_steps': c.learningSteps,
      'state': c.state,
      if (c.lastReview != null) 'last_review': c.lastReview!.toIso8601String(),
    };

void main() {
  test('fsrs fixtures: every review of every run matches ts-fsrs', () {
    for (final run in loadFixtures('fsrs')) {
      var at = DateTime.parse(run['start'] as String);
      var card = createEmptyCard(at);
      final steps = (run['steps'] as List).cast<Map<String, dynamic>>();
      final out = run['out'] as List;
      for (var i = 0; i < steps.length; i++) {
        at = DateTime.fromMillisecondsSinceEpoch(at.millisecondsSinceEpoch + (steps[i]['gapMs'] as num).toInt(), isUtc: true);
        card = fsrsNext(card, at, (steps[i]['grade'] as num).toInt(), fuzz: run['fuzz'] as bool);
        expectSame(saved(card), out[i], 'run ${run['start']} fuzz=${run['fuzz']} step $i');
      }
    }
  });
}

// The five feedback bands (src/heir/test/feedback.test.ts).
import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/state/feedback.dart';

void main() {
  test('feedback bands: generous words, strict grade untouched', () {
    final t = 'God is a Spirit, infinite, eternal, and unchangeable'.split(' ');
    expect(mainWordShare(t, [for (final _ in t) true]), 1);
    // Missing only the small words still keeps nearly all the meaning.
    final smallMissed = [for (final w in t) !['is', 'a', 'and'].contains(w.replaceAll(',', ''))];
    expect(mainWordShare(t, smallMissed), greaterThan(0.85));
    // Missing main words costs much more.
    final mainMissed = [for (final w in t) !['Spirit,', 'infinite,', 'eternal,'].contains(w)];
    expect(mainWordShare(t, mainMissed), lessThan(0.6));
    expect(bandFor(ok: true), FeedbackBand.perfect);
    expect(bandFor(ok: true, slip: true), FeedbackBand.pass);
    expect(bandFor(ok: false, share: 0.8), FeedbackBand.good);
    expect(bandFor(ok: false, share: 0.6), FeedbackBand.growing);
    expect(bandFor(ok: false, share: 0.3), FeedbackBand.learning);
    expect(bandFor(ok: false, close: true), FeedbackBand.growing);
    expect(bandFor(ok: false), FeedbackBand.learning);
    // A generous band never turns a miss into a pass: only `ok` (the strict grade) gives perfect or pass.
    expect(bandFor(ok: false, share: 0.99), isNot(FeedbackBand.pass));
    expect(bandWords[FeedbackBand.learning], 'No problem, you’re still learning.');
  });
}

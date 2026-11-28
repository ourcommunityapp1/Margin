// Discover's search (src/app/heir/discover/page.tsx): every word must match, at least two letters, courses by title.
import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/features/discover/discover_screen.dart' show discover;

import 'engine/content_loader.dart';

void main() {
  loadTestContent();

  test('search finds verses by a word and courses by title, and needs two letters', () {
    expect(discover('s').items, isEmpty, reason: 'one letter is not a search');
    final shepherd = discover('shepherd');
    expect(shepherd.items, isNotEmpty);
    expect(shepherd.items.every((i) => '${i.prompt} ${i.text}'.toLowerCase().contains('shepherd')), isTrue);
    expect(discover('psalm 23').courses.map((c) => c.id), contains('psalm-23'));
    expect(discover('zzqq').items, isEmpty);
  });
}

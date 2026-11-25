// A practice lesson on one item, opened from the item screen (the website's /heir/lesson?mode=item). Builds the
// steps for the item's first part with the engine's lesson builder, then runs them.

import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
import '../../engine/lesson.dart' as lesson;
import '../../engine/types.dart';
import '../../ui/screen_parts.dart';
import '../../ui/widgets.dart';
import 'lesson_screen.dart';

class PracticeScreen extends StatefulWidget {
  const PracticeScreen({super.key, required this.itemId});
  final String itemId;

  @override
  State<PracticeScreen> createState() => _PracticeScreenState();
}

class _PracticeScreenState extends State<PracticeScreen> {
  // Adult track until the household (with its tracks) is stored on the phone.
  static const _track = Track.adult;
  late final Item? _item = getItem(widget.itemId);
  late final List<lesson.Step> _steps = _build();

  List<lesson.Step> _build() {
    final item = _item;
    if (item == null) return const [];
    final unit = lesson.unitsFor(item, _track).first;
    return lesson.buildLite(
      unit: unit,
      item: item,
      track: _track,
      pool: allItems(),
      rng: lesson.seeded(DateTime.now().millisecondsSinceEpoch & 0x7fffffff),
    );
  }

  @override
  Widget build(BuildContext context) {
    final item = _item;
    if (item == null || _steps.isEmpty) return const KPage(bare: true, children: [KComingCard('We couldn’t find that one.')]);
    return LessonScreen(steps: _steps, track: _track, label: 'Practice · ${itemLabel(item)}');
  }
}

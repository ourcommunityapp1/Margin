// One question or verse (src/app/heir/ui/item.tsx): the answer; once learned, its stone, how strong it is and how it has gone,
// then Practice (a mix of steps) and Review (the whole answer from memory); what it means, and the Scripture it rests on.
// The text is shown exactly as exported from the website, never retyped.
//
// Not yet here: "Explain" and related verses (they need the server).

import 'dart:math' as math;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
import '../../engine/keep.dart' show strongUntilFor;
import '../../engine/lesson.dart' show unitsFor;
import '../../engine/levels.dart' show levelShown, needsRefresh, nextStep, recited;
import '../../engine/tiers.dart';
import '../../engine/memory.dart' show partMemories;
import '../../engine/types.dart';
import '../../state/clock.dart';
import '../../state/household.dart';
import '../../state/item_stats.dart';
import '../../ui/stone.dart';
import '../../ui/screen_parts.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';

const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const _monthsLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

class ItemScreen extends ConsumerWidget {
  const ItemScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final k = context.k;
    final item = getItem(id);
    if (item == null) {
      return KPage(children: [
        Align(alignment: Alignment.centerLeft, child: KBack(onPressed: () => context.go('/courses'))),
        const KComingCard('We couldn’t find that one.'),
      ]);
    }
    final collection = getCollection(item.collection);
    final unit = collection?.unit ?? '';
    final label =
        '${collection?.title ?? ''} · ${unit == 'Question' ? 'Q' : unit == 'Verse' || unit == 'Commandment' ? '$unit ' : 'Part '}${item.number}';
    final track = ref.watch(meProvider)?.track ?? Track.adult;
    final mine = ref.watch(myProgressProvider);
    final now = ref.watch(clockProvider)();
    final learned = unitsFor(item, track).every((u) => mine.units.contains(u.key));

    return KPage(
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Row(
            children: [
              KBack(onPressed: () => context.canPop() ? context.pop() : context.go('/courses')),
              const SizedBox(width: 12),
              Expanded(child: Text(label, style: sans(15, weight: FontWeight.w600, color: k.ink))),
            ],
          ),
        ),
        KCard.column(
          gap: 14,
          children: [
            Text(item.prompt, style: serif(20, weight: FontWeight.w600, color: k.ink, height: 1.35)),
            Text(item.text, style: serif(24, color: k.ink, height: 1.45)),
            if (learned)
              _Progress(item: item, unit: unit, track: track, now: now)
            else
              KButton(
                'Practice this ${unit == 'Question' ? 'question' : unit == 'Verse' ? 'verse' : 'now'}',
                onPressed: () => context.push('/lesson?mode=item&item=${Uri.encodeQueryComponent(item.id)}'),
              ),
          ],
        ),
        if (item.meaning.isNotEmpty)
          KCard.column(
            gap: 14,
            children: [
              const KLabel('What it means'),
              for (final (i, m) in item.meaning.indexed)
                Container(
                  decoration: BoxDecoration(border: i == 0 ? null : Border(top: BorderSide(color: k.line))),
                  padding: EdgeInsets.only(top: i == 0 ? 0 : 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(m.question, style: sans(16, weight: FontWeight.w600, color: k.ink)),
                      const SizedBox(height: 4),
                      Text.rich(
                        TextSpan(
                          style: sans(16, color: k.ink, height: 1.5),
                          children: [
                            TextSpan(text: '${m.answer}.', style: sans(16, weight: FontWeight.w700, color: k.ink, height: 1.5)),
                            TextSpan(text: ' ${m.explain}'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        if (item.connected.isNotEmpty)
          KCard.column(
            gap: 10,
            children: [
              const KLabel('Connected Scripture'),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final r in item.connected)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                      decoration: BoxDecoration(color: k.well, borderRadius: BorderRadius.circular(10)),
                      child: Text(r, style: sans(14, weight: FontWeight.w600, color: k.ink)),
                    ),
                ],
              ),
            ],
          ),
      ],
    );
  }
}

/// Once learned: the stone and its strength ring, the stats, and Practice and Review (item.tsx, heir.css .hr-ring .hr-kv).
class _Progress extends ConsumerWidget {
  const _Progress({required this.item, required this.unit, required this.track, required this.now});
  final Item item;
  final String unit;
  final Track track;
  final DateTime now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final k = context.k;
    final mine = ref.watch(myProgressProvider);
    final level = levelShown(mine, item, track);
    final dim = needsRefresh(mine, item.id, now);
    final next = nextStep(item, track, mine, now);
    final strong = strongUntilFor(item, mine, track);
    final today = practisedToday(mine, item.id, now);
    final strength = today ? null : itemStrength(mine, item.id, now, partMemories(mine.log, mine.partSnap));
    final stats = itemStats(item, mine, track);
    final noun = unit == 'Question' ? 'answer' : unit == 'Verse' ? 'verse' : 'words';
    final hasRecited = recited(item, track, mine.log);
    final info = tierOf(level);
    String date(DateTime d) {
      final l = d.toLocal();
      return '${_months[l.month - 1]} ${l.day}${l.year == now.toLocal().year ? '' : ', ${l.year}'}';
    }

    String ago(DateTime d) {
      final a = DateTime(d.toLocal().year, d.toLocal().month, d.toLocal().day);
      final b = DateTime(now.toLocal().year, now.toLocal().month, now.toLocal().day);
      final days = (b.difference(a).inHours / 24).round();
      return days <= 0 ? 'Today' : days == 1 ? 'Yesterday' : '$days days ago';
    }

    final rows = <(String, String)>[
      if (stats.learnedAt != null) ('Learned', date(stats.learnedAt!)),
      if (stats.practised > 0) ('Practised', '${stats.practised} time${stats.practised == 1 ? '' : 's'} · ${stats.right} right'),
      if (stats.last != null) ('Last time', '${ago(stats.last!)}${stats.lastRight == false ? ' · a slip' : ''}'),
      if (stats.oftenMissed != null) ('Often missed', '\u201c${stats.oftenMissed}\u201d'),
      if (stats.due != null) ('Next review', stats.due!.isAfter(now) ? date(stats.due!) : 'Now'),
    ];

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: k.well, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              KStone(level: level, size: 44, dim: dim),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(info != null ? '${info.stone} · ${info.name}' : hasRecited ? 'Recited' : 'Not learned yet', style: sans(16, weight: FontWeight.w600, color: k.ink)),
                    if (dim) Text('Due for a refresh', style: sans(14, color: k.miss)),
                    if (strong != null && !dim)
                      Text(
                        strong.isAfter(now) ? 'Strong until about ${_monthsLong[strong.toLocal().month - 1]}${strong.toLocal().year == now.toLocal().year ? '' : ' ${strong.toLocal().year}'}' : 'Worth a review now',
                        style: sans(14, color: k.muted),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              if (today) const StrengthRing(value: 1, big: 'Today', small: 'practised') else if (strength != null) StrengthRing(value: strength, big: '${(strength * 100).round()}%', small: 'strength', band: strengthBand(strength)),
            ],
          ),
          if (rows.isNotEmpty) ...[
            const SizedBox(height: 10),
            for (final (i, r) in rows.indexed)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 9),
                decoration: BoxDecoration(border: i == rows.length - 1 ? null : Border(bottom: BorderSide(color: k.line))),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(r.$1, style: sans(15, color: k.muted)),
                    const SizedBox(width: 12),
                    Flexible(child: Text(r.$2, textAlign: TextAlign.right, style: sans(15, color: k.ink))),
                  ],
                ),
              ),
          ],
          if (next != null) ...[
            const SizedBox(height: 10),
            Text.rich(
              TextSpan(children: [
                TextSpan(text: 'Next: ${next.split(',').first}', style: const TextStyle(fontWeight: FontWeight.w600)),
                if (next.contains(',')) TextSpan(text: ', ${next.substring(next.indexOf(',') + 2)}'),
                const TextSpan(text: '.'),
              ]),
              style: sans(14, color: k.muted, height: 1.45),
            ),
          ],
          const SizedBox(height: 10),
          KButton('Practice', onPressed: () => context.push('/lesson?mode=item&item=${Uri.encodeQueryComponent(item.id)}')),
          const SizedBox(height: 4),
          Text('A mix of steps, chosen by how well you know it', textAlign: TextAlign.center, style: sans(13, color: k.muted)),
          const SizedBox(height: 10),
          KButton('Review', quiet: true, onPressed: () => context.push('/lesson?mode=keep&items=${Uri.encodeQueryComponent(item.id)}')),
          const SizedBox(height: 4),
          Text('Type or say the whole $noun from memory', textAlign: TextAlign.center, style: sans(13, color: k.muted)),
        ],
      ),
    );
  }
}

/// A ring 104 px across filled to [value] in the band's colour, with a big number and a small word in the middle.
class StrengthRing extends StatelessWidget {
  const StrengthRing({super.key, required this.value, required this.big, required this.small, this.band});
  final double value;
  final String big, small;
  final Band? band;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final colour = band == null ? k.muted : bandColor(band!);
    return Semantics(
      label: '$big $small',
      excludeSemantics: true,
      child: SizedBox(
        width: 104,
        height: 104,
        child: CustomPaint(
          painter: _RingPainter(value.clamp(0.0, 1.0), colour, k.line),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(big, style: serif(big.length > 4 ? 20 : 26, weight: FontWeight.w500, color: k.ink, height: 1)),
                const SizedBox(height: 2),
                Text(small, style: sans(11, color: k.muted)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter(this.value, this.colour, this.track);
  final double value;
  final Color colour, track;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = (Offset.zero & size).deflate(4);
    final p = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 8;
    canvas.drawArc(rect, 0, math.pi * 2, false, p..color = track);
    canvas.drawArc(rect, -math.pi / 2, math.pi * 2 * value, false, p..color = colour..strokeCap = StrokeCap.butt);
  }

  @override
  bool shouldRepaint(_RingPainter old) => old.value != value || old.colour != colour || old.track != track;
}

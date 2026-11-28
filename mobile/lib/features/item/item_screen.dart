// One question or verse (src/app/heir/ui/item.tsx): the passage open on the page with Practice (a mix of steps) and Review (the
// whole answer from memory) straight under it; once learned, one status card (strength ring, level, three numbers, a few
// facts, what's next), the passage word by word, strength over time; what it means, and the Scripture it rests on.
// The text is shown exactly as exported from the website, never retyped.
//
// Not yet here: "Explain" and related verses (they need the server).

import 'dart:math' as math;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
import '../../engine/lesson.dart' show unitsFor;
import '../../engine/levels.dart' show levelShown, needsRefresh, nextStep;
import '../../engine/tiers.dart';
import '../../engine/memory.dart' show partMemories;
import '../../engine/types.dart';
import '../../state/clock.dart';
import '../../state/household.dart';
import '../../state/item_stats.dart';
import '../courses/plan_buttons.dart';
import '../../ui/stone.dart';
import '../../ui/screen_parts.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';

const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
    // A verse is named by its reference alone (it saves a line); a question or creed part by its course and number.
    final verse = isVerse(item);
    final label = verse
        ? item.prompt
        : '${collection?.title ?? ''} · ${unit == 'Question' ? 'Q' : unit == 'Commandment' ? '$unit ' : 'Part '}${item.number}';
    final track = ref.watch(meProvider)?.track ?? Track.adult;
    final mine = ref.watch(myProgressProvider);
    final now = ref.watch(clockProvider)();
    final learned = unitsFor(item, track).every((u) => mine.units.contains(u.key));
    final owner = courses.where((c) => courseItems(c).any((i) => i.id == item.id)).firstOrNull;

    return KPage(
      top: 8,
      children: [
        Padding(
          padding: EdgeInsets.zero,
          child: Row(
            children: [
              KBack(onPressed: () => context.canPop() ? context.pop() : context.go('/courses')),
              const SizedBox(width: 12),
              Expanded(child: Text(label, style: sans(15, weight: FontWeight.w600, color: k.ink))),
            ],
          ),
        ),
        // The passage sits open on the page, with the two actions straight under it.
        Semantics(
          label: 'Passage',
          container: true,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(4, 4, 4, 2),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (unit == 'Question')
                  Text(item.prompt, style: serif(20, weight: FontWeight.w600, color: k.ink, height: 1.35))
                else if (!verse)
                  KLabel(item.prompt),
                if (!verse) const SizedBox(height: 12),
                Text(item.text, style: serif(25, color: k.ink, height: 1.45)),
              ],
            ),
          ),
        ),
        if (!learned) ...[
          if (owner != null)
            KButton('Learn it · 2 min', onPressed: () => context.push('/lesson?mode=learn&item=${Uri.encodeQueryComponent(item.id)}&course=${owner.id}'))
          else
            KButton(
              'Practice this ${unit == 'Question' ? 'question' : unit == 'Verse' ? 'verse' : 'now'}',
              onPressed: () => context.push('/lesson?mode=item&item=${Uri.encodeQueryComponent(item.id)}'),
            ),
          if (owner != null) ItemPlanButton(item: item, course: owner),
        ] else ...[
          Row(
            children: [
              Expanded(child: KButton('Practice', onPressed: () => context.push('/lesson?mode=item&item=${Uri.encodeQueryComponent(item.id)}'))),
              const SizedBox(width: 10),
              Expanded(
                child: Semantics(
                  label: 'Review: type or say the whole ${unit == 'Question' ? 'answer' : unit == 'Verse' ? 'verse' : 'words'} from memory',
                  excludeSemantics: true,
                  child: KButton('Review', outline: true, onPressed: () => context.push('/lesson?mode=keep&items=${Uri.encodeQueryComponent(item.id)}')),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _Status(item: item, track: track, now: now),
          if (owner != null) ItemPlanButton(item: item, course: owner),
          _WordByWord(item: item, track: track),
          _StrengthOverTime(item: item, now: now),
        ],
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

/// Once learned, one status card (item.tsx .hr-status): the strength ring (or the gem when it can't be told), the level and
/// how long it holds, three numbers, a few facts, and what the next level asks for.
class _Status extends ConsumerWidget {
  const _Status({required this.item, required this.track, required this.now});
  final Item item;
  final Track track;
  final DateTime now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final k = context.k;
    final mine = ref.watch(myProgressProvider);
    final level = levelShown(mine, item, track);
    final dim = needsRefresh(mine, item.id, now);
    final next = nextStep(item, track, mine, now);
    final strength = itemStrength(mine, item.id, now, partMemories(mine.log, mine.partSnap));
    final stats = itemStats(item, mine, track);
    final perfect = recitedPerfectly(item, track, mine.log);
    final practised = timesPracticed(item, mine.log);
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
      if (stats.last != null) ('Last time', '${ago(stats.last!)}${stats.lastRight == false ? ' · a slip' : ''}'),
      if (stats.oftenMissed != null) ('Often missed', '\u201c${stats.oftenMissed}\u201d'),
    ];
    Widget num(String big, String small) => Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(big, style: serif(22, weight: FontWeight.w600, color: k.ink, height: 1)),
              const SizedBox(height: 4),
              Text(small, style: sans(12.5, color: k.muted, height: 1.3)),
            ],
          ),
        );

    return Semantics(
      label: 'How it is going',
      container: true,
      child: KCard.column(
        gap: 22,
        children: [
          Row(
            children: [
              if (strength != null)
                StrengthRing(value: strength, big: '${(strength * 100).round()}%', small: '', band: strengthBand(strength), size: 92)
              else
                KStone(level: level, size: 56, dim: dim),
              const SizedBox(width: 18),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(info != null ? '${info.stone} · ${info.name}' : 'Not learned yet', style: sans(19, weight: FontWeight.w600, color: k.ink, height: 1.2)),
                    if (dim) ...[const SizedBox(height: 5), Text('Due for a refresh', style: sans(14, color: k.miss, height: 1.35))],
                  ],
                ),
              ),
            ],
          ),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              num('$perfect', 'recited perfectly'),
              const SizedBox(width: 8),
              num('$practised', 'times practised'),
            ],
          ),
          if (rows.isNotEmpty)
            Container(
              padding: const EdgeInsets.only(top: 6),
              decoration: BoxDecoration(border: Border(top: BorderSide(color: k.line))),
              child: Column(
                children: [
                  for (final r in rows)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 7),
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
              ),
            ),
          if (next != null)
            Text.rich(
              TextSpan(children: [
                TextSpan(text: 'Next: ${next.split(',').first}', style: const TextStyle(fontWeight: FontWeight.w700)),
                if (next.contains(',')) TextSpan(text: ', ${next.substring(next.indexOf(',') + 2)}'),
                const TextSpan(text: '.'),
              ]),
              style: sans(14, color: k.muted, height: 1.45),
            ),
        ],
      ),
    );
  }
}

/// The passage word by word (item.tsx .hr-words): every word its own chip, coloured by how reliably it's recalled.
class _WordByWord extends ConsumerWidget {
  const _WordByWord({required this.item, required this.track});
  final Item item;
  final Track track;

  static const _border = {
    WordBand.red: Color(0xFFE4745B),
    WordBand.yellow: Color(0xFFE9C464),
    WordBand.light: Color(0xFFA8D696),
    WordBand.dark: Color(0xFF3CA86E),
  };
  static const _fill = {
    WordBand.red: Color(0x47E4745B),
    WordBand.yellow: Color(0x3DE9C464),
    WordBand.light: Color(0x38A8D696),
    WordBand.dark: Color(0x663CA86E),
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final k = context.k;
    final cards = wordCards(item, track, ref.watch(myProgressProvider).log);
    if (!cards.any((c) => c.band != WordBand.none)) return const SizedBox.shrink();
    Widget swatch(WordBand b) => Container(
          width: 12,
          height: 12,
          margin: const EdgeInsets.only(right: 6),
          decoration: BoxDecoration(
            color: _fill[b] ?? k.well,
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: _border[b] ?? Colors.transparent),
          ),
        );
    Widget legend(WordBand b, String t) => Row(mainAxisSize: MainAxisSize.min, children: [swatch(b), Text(t, style: sans(12.5, color: k.muted))]);
    return Semantics(
      label: 'Word by word',
      container: true,
      child: KCard.column(
        gap: 12,
        children: [
          const KLabel('Word by word'),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final c in cards)
                Tooltip(
                  message: c.tries > 0 ? '${c.misses} miss${c.misses == 1 ? '' : 'es'} in ${c.tries} ${c.tries == 1 ? 'try' : 'tries'}' : 'Not tried yet',
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                    decoration: BoxDecoration(
                      color: _fill[c.band] ?? k.well,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: _border[c.band] ?? Colors.transparent),
                    ),
                    child: Text(c.word, style: serif(17, color: c.band == WordBand.none ? k.muted : k.ink, height: 1.3)),
                  ),
                ),
            ],
          ),
          Wrap(
            spacing: 14,
            runSpacing: 6,
            children: [
              legend(WordBand.red, 'Missed a lot'),
              legend(WordBand.yellow, 'Often'),
              legend(WordBand.light, 'Pretty good'),
              legend(WordBand.dark, 'Consistent'),
              legend(WordBand.none, 'Not tried yet'),
            ],
          ),
        ],
      ),
    );
  }
}

/// The model's chance of recalling it, day by day (or week by week), with the 85% target as a dashed line.
class _StrengthOverTime extends ConsumerWidget {
  const _StrengthOverTime({required this.item, required this.now});
  final Item item;
  final DateTime now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final k = context.k;
    final series = strengthSeries(item, ref.watch(myProgressProvider).log, now);
    if (series.length < 2) return const SizedBox.shrink();
    final last = series.last;
    final first = DateTime.fromMillisecondsSinceEpoch(series.first.at).toLocal();
    return Semantics(
      label: 'Strength over time, now ${(last.chance * 100).round()}%',
      container: true,
      excludeSemantics: true,
      child: KCard.column(
        gap: 10,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              const Flexible(child: KLabel('Strength over time')),
              const SizedBox(width: 12),
              Flexible(child: Text('85% is the target', textAlign: TextAlign.right, style: sans(13, color: k.muted))),
            ],
          ),
          AspectRatio(
            aspectRatio: 320 / 150,
            child: CustomPaint(
              painter: _LinePainter(
                [for (final p in series) p.chance],
                '${_months[first.month - 1]} ${first.day}',
                grid: k.line,
                text: k.muted,
                card: k.card,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LinePainter extends CustomPainter {
  _LinePainter(this.values, this.startLabel, {required this.grid, required this.text, required this.card});
  final List<double> values;
  final String startLabel;
  final Color grid, text, card;
  static const _green = Color(0xFFB9E3B0), _peach = Color(0xFFF3D8B6);

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 320;
    final l = 30 * s, r = 8 * s, t = 12 * s, b = 26 * s;
    double x(int i) => l + (size.width - l - r) * i / (values.length - 1);
    double y(double v) => t + (size.height - t - b) * (1 - v);
    void label(String str, Offset at, {TextAlign align = TextAlign.left, Color? color, FontWeight weight = FontWeight.w400}) {
      final tp = TextPainter(text: TextSpan(text: str, style: sans(10 * s, color: color ?? text, weight: weight)), textDirection: TextDirection.ltr)..layout();
      final dx = align == TextAlign.right ? at.dx - tp.width : at.dx;
      tp.paint(canvas, Offset(dx, at.dy - tp.height / 2));
    }

    final gridPaint = Paint()..color = grid..strokeWidth = 1;
    for (final v in [0.0, 0.5, 1.0]) {
      canvas.drawLine(Offset(l, y(v)), Offset(size.width - r, y(v)), gridPaint);
      label('${(v * 100).round()}%', Offset(l - 5 * s, y(v)), align: TextAlign.right);
    }
    // The 85% target, dashed.
    final dash = Paint()..color = _peach.withValues(alpha: 0.6)..strokeWidth = 1;
    for (var dx = l; dx < size.width - r; dx += 8 * s) {
      canvas.drawLine(Offset(dx, y(0.85)), Offset(math.min(dx + 4 * s, size.width - r), y(0.85)), dash);
    }
    final line = Path()..moveTo(x(0), y(values[0]));
    for (var i = 1; i < values.length; i++) {
      line.lineTo(x(i), y(values[i]));
    }
    final fill = Path.from(line)
      ..lineTo(x(values.length - 1), y(0))
      ..lineTo(x(0), y(0))
      ..close();
    canvas.drawPath(
      fill,
      Paint()..shader = LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [_green.withValues(alpha: 0.4), _green.withValues(alpha: 0.03)])
          .createShader(Rect.fromLTWH(0, t, size.width, size.height - t - b)),
    );
    canvas.drawPath(line, Paint()..color = _green..style = PaintingStyle.stroke..strokeWidth = 2 * s..strokeJoin = StrokeJoin.round);
    final end = Offset(x(values.length - 1), y(values.last));
    canvas.drawCircle(end, 4.5 * s, Paint()..color = _green);
    canvas.drawCircle(end, 4.5 * s, Paint()..color = card..style = PaintingStyle.stroke..strokeWidth = 2 * s);
    label('${(values.last * 100).round()}%', end + Offset(-8 * s, -11 * s), align: TextAlign.right, color: _green, weight: FontWeight.w700);
    label(startLabel, Offset(l, size.height - 8 * s));
    label('Now', Offset(size.width - r, size.height - 8 * s), align: TextAlign.right);
  }

  @override
  bool shouldRepaint(_LinePainter old) => old.values != values || old.grid != grid;
}

/// A ring ([size] across, 104 by default) filled to [value] in the band's colour, with a big number and a small word in the middle.
class StrengthRing extends StatelessWidget {
  const StrengthRing({super.key, required this.value, required this.big, required this.small, this.band, this.size = 104});
  final double value;
  final String big, small;
  final Band? band;
  final double size;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final colour = band == null ? k.muted : bandColor(band!);
    return Semantics(
      label: '$big $small',
      excludeSemantics: true,
      child: SizedBox(
        width: size,
        height: size,
        child: CustomPaint(
          painter: _RingPainter(value.clamp(0.0, 1.0), colour, k.line),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(big, style: serif(big.length > 4 ? 20 : 26, weight: FontWeight.w500, color: k.ink, height: 1)),
                if (small.isNotEmpty) ...[const SizedBox(height: 2), Text(small, style: sans(11, color: k.muted))],
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

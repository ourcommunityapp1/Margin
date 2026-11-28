// How it works (src/app/heir/how/page.tsx): what the levels mean, how each recall is graded, and how reviews are spaced.

import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../engine/tiers.dart';
import '../../ui/stone.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import 'plan_screen.dart' show gradeWords;

class HowScreen extends StatelessWidget {
  const HowScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    Widget h2(String t) => Semantics(header: true, child: Text(t, style: serif(22, weight: FontWeight.w600, color: k.ink, height: 1.2)));
    return KPage(
      bare: true,
      children: [
        Align(alignment: Alignment.centerLeft, child: KBack(onPressed: () => context.canPop() ? context.pop() : context.go('/you'))),
        Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Semantics(header: true, child: Text('How it works', style: serif(32, weight: FontWeight.w500, color: k.ink)))),
        KCard.column(
          gap: 14,
          children: [
            h2('The five levels'),
            Text(
              'Each question or verse climbs five levels. Recalling it from memory, with no hints, on different days and after time away is what moves it up. '
              'Extra practice keeps it fresh, but doesn’t move it up by itself.',
              style: sans(15, color: k.muted, height: 1.5),
            ),
            for (final t in tiers)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  KStone(level: t.n, size: 34),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text.rich(TextSpan(children: [
                          TextSpan(text: t.stone, style: sans(16, weight: FontWeight.w600, color: k.ink)),
                          TextSpan(text: ' · ${t.name}', style: sans(16, weight: FontWeight.w500, color: k.muted)),
                        ])),
                        const SizedBox(height: 2),
                        Text(t.means, style: sans(15, color: k.ink, height: 1.45)),
                      ],
                    ),
                  ),
                ],
              ),
          ],
        ),
        KCard.column(
          gap: 12,
          children: [
            h2('How each recall is graded'),
            Text('Only answers you produce yourself count: typing it, saying it, or its first letters. The grade decides when it comes back.', style: sans(15, color: k.muted, height: 1.5)),
            for (final (word, means) in gradeWords)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(width: 92, child: Text(word, style: sans(16, weight: FontWeight.w600, color: k.ink))),
                  const SizedBox(width: 12),
                  Expanded(child: Text(means, style: sans(15, color: k.muted, height: 1.45))),
                ],
              ),
          ],
        ),
        KCard.column(
          gap: 10,
          children: [
            h2('Spaced review'),
            Text(
              'Each review waits until you’re close to forgetting, which is when recalling it helps most. Something you find hard comes back soon; something you know well waits longer each time.',
              style: sans(15, color: k.ink, height: 1.5),
            ),
            Text(
              'A unit is locked in after a night’s sleep, all its questions together from memory. A day is kept by finishing a lesson or review, and Sundays are days of rest, '
              'with one more free day each week: learning on them counts, and skipping one never breaks the run.',
              style: sans(15, color: k.ink, height: 1.5),
            ),
          ],
        ),
      ],
    );
  }
}

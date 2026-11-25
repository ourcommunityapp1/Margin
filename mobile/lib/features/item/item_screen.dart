// One item, for reading (src/app/heir/ui/item.tsx): the question and the answer, what it means, and the Scripture
// it rests on. Practice happens in lessons. The text is shown exactly as exported from the website, never retyped.
//
// Not yet here: the stone and "Practice this" button (progress), "Explain" and related verses (server).

import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
import '../../ui/screen_parts.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';

class ItemScreen extends StatelessWidget {
  const ItemScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context) {
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
            // The website shows this once the item is learned; until progress is stored, it is always offered.
            KButton(
              'Practice this ${unit == 'Question' ? 'question' : unit == 'Verse' ? 'verse' : 'now'}',
              onPressed: () => context.push('/lesson?item=${Uri.encodeQueryComponent(item.id)}'),
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

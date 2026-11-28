// Discover (src/app/heir/discover/page.tsx): search every verse, answer and course by words, a reference or a title.
// Later: by topic.

import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
import '../../engine/types.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';

final _strip = RegExp(r'[^a-z0-9\s]'), _spaces = RegExp(r'\s+');
String _norm(String t) => t.toLowerCase().replaceAll(_strip, ' ').replaceAll(_spaces, ' ').trim();

/// The courses and the verses or answers matching every word of [q] (at least two letters), as on the website.
({List<Course> courses, List<Item> items}) discover(String q) {
  final term = _norm(q);
  if (term.length < 2) return (courses: const [], items: const []);
  final words = term.split(' ');
  bool all(String hay) => words.every(hay.contains);
  return (
    courses: courses.where((c) => all(_norm('${c.title} ${c.blurb}'))).take(6).toList(),
    items: allItems().where((i) => all(_norm('${i.prompt} ${i.text} ${itemLabel(i)}'))).take(30).toList(),
  );
}

class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key});

  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final hits = discover(_q);
    final term = _norm(_q);
    Widget row({required String title, String? sub, String? body, required VoidCallback onTap, bool first = false}) => InkWell(
          onTap: onTap,
          child: Container(
            width: double.infinity,
            decoration: BoxDecoration(border: first ? null : Border(top: BorderSide(color: k.line))),
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text.rich(TextSpan(children: [
                  TextSpan(text: title, style: sans(16, weight: FontWeight.w700, color: k.ink)),
                  if (sub != null) TextSpan(text: ' · $sub', style: sans(13, color: k.muted)),
                ])),
                if (body != null) ...[
                  const SizedBox(height: 4),
                  Text(body, maxLines: 2, overflow: TextOverflow.ellipsis, style: sans(14, color: k.muted, height: 1.4)),
                ],
              ],
            ),
          ),
        );
    return KPage(
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Row(children: [
            KBack(label: 'Learn', onPressed: () => context.canPop() ? context.pop() : context.go('/courses')),
            const SizedBox(width: 12),
            Semantics(header: true, child: Text('Discover', style: serif(28, weight: FontWeight.w500, color: k.ink))),
          ]),
        ),
        Semantics(
          label: 'Search verses, answers and courses',
          textField: true,
          child: TextField(
            autofocus: true,
            autocorrect: false,
            enableSuggestions: false,
            textCapitalization: TextCapitalization.none,
            onChanged: (v) => setState(() => _q = v),
            style: sans(16, color: k.ink),
            decoration: InputDecoration(
              hintText: 'A word, a reference, a title',
              hintStyle: sans(16, color: k.muted),
              filled: true,
              fillColor: k.card,
              contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 15),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(25), borderSide: BorderSide(color: k.edge)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(25), borderSide: BorderSide(color: k.edge)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(25), borderSide: BorderSide(color: k.ink)),
            ),
          ),
        ),
        if (term.length < 2)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Text('Try “shepherd”, “John 3”, “peace” or “Lord’s Prayer”. Searching by topic is coming.', style: sans(15, color: k.muted, height: 1.5)),
          ),
        if (term.length >= 2 && hits.courses.isEmpty && hits.items.isEmpty)
          Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Text('Nothing found for “${_q.trim()}”.', style: sans(15, color: k.muted))),
        if (hits.courses.isNotEmpty)
          KCard.column(
            gap: 4,
            children: [
              const KLabel('Courses'),
              for (final (i, c) in hits.courses.indexed) row(title: c.title, body: c.short, first: i == 0, onTap: () => context.push('/courses/${c.id}')),
            ],
          ),
        if (hits.items.isNotEmpty)
          KCard.column(
            gap: 4,
            children: [
              const KLabel('Verses and answers'),
              for (final (n, i) in hits.items.indexed)
                row(
                  title: itemLabel(i),
                  sub: getCollection(i.collection)?.title,
                  body: i.text,
                  first: n == 0,
                  onTap: () => context.push('/item/${Uri.encodeComponent(i.id)}'),
                ),
            ],
          ),
      ],
    );
  }
}

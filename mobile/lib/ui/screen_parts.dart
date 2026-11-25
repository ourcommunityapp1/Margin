// Pieces several screens share: the big serif title, the round initial, the settings row with a chevron, and
// the card a screen shows where engine-driven content will go.

import 'package:material_ui/material_ui.dart';

import 'theme.dart';
import 'widgets.dart';

/// A tab's title ("Courses", "Progress"): serif 34, a little space above.
class KTitle extends StatelessWidget {
  const KTitle(this.text, {super.key, this.size = 34});
  final String text;
  final double size;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(4, 20, 4, 0),
        child: Semantics(
          header: true,
          child: Text(text, style: serif(size, weight: FontWeight.w500, color: context.k.ink, height: 1.15)),
        ),
      );
}

/// A person's initial in a round card-coloured button.
class KInitial extends StatelessWidget {
  const KInitial(this.initial, {super.key, this.size = 44, this.onTap, this.label});
  final String initial;
  final double size;
  final VoidCallback? onTap;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final circle = SizedBox(
      width: size,
      height: size,
      child: Center(
        child: Text(initial, style: sans(size * 0.39, weight: FontWeight.w600, color: k.ink)),
      ),
    );
    return Semantics(
      button: onTap != null,
      label: label,
      excludeSemantics: label != null,
      child: Material(
        color: k.card,
        shape: const CircleBorder(),
        child: onTap == null ? circle : InkWell(customBorder: const CircleBorder(), onTap: onTap, child: circle),
      ),
    );
  }
}

/// A settings row (ui/you.tsx Row): a title, a quiet line under it, a chevron.
class KLinkRow extends StatelessWidget {
  const KLinkRow({super.key, required this.title, required this.sub, required this.onTap, this.first = false});
  final String title;
  final String sub;
  final VoidCallback onTap;
  final bool first;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return Semantics(
      button: true,
      child: InkWell(
        onTap: onTap,
        child: Container(
          constraints: const BoxConstraints(minHeight: 64),
          decoration: BoxDecoration(border: first ? null : Border(top: BorderSide(color: k.line))),
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: sans(16, weight: FontWeight.w600, color: k.ink)),
                    const SizedBox(height: 2),
                    Text(sub, style: sans(14, color: k.muted)),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              KIcon('<path d="M9 6l6 6-6 6"/>', size: 16, color: k.muted, strokeWidth: 2.2),
            ],
          ),
        ),
      ),
    );
  }
}

/// Where a screen's engine-driven content will go, until the engine is ported. One plain sentence.
class KComingCard extends StatelessWidget {
  const KComingCard(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) => KCard(
        child: Text(text, style: sans(15, color: context.k.muted, height: 1.5)),
      );
}

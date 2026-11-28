// The dark rose card (heir.css .hr-rose-card), used by the lesson screens. Today used to show one per lesson in a carousel;
// it is now one big thing with quiet rows (today_screen.dart).

import 'package:material_ui/material_ui.dart';

const _roseBg = Color(0xFF15181B);

/// The dark card (`.hr-rose-card`).
class RoseCard extends StatelessWidget {
  const RoseCard({super.key, required this.children, this.padding = const EdgeInsets.fromLTRB(18, 22, 18, 20), this.gap = 16, this.fill = false});
  final List<Widget> children;

  /// Fill the height it is given, spreading the pieces (a carousel card); otherwise hug them.
  final bool fill;
  final EdgeInsets padding;
  final double gap;

  @override
  Widget build(BuildContext context) => DecoratedBox(
        decoration: BoxDecoration(
          color: _roseBg,
          borderRadius: BorderRadius.circular(36),
          boxShadow: const [BoxShadow(color: Color(0x4D14181C), blurRadius: 50, offset: Offset(0, 24))],
        ),
        child: Padding(
          padding: padding,
          child: fill ? LayoutBuilder(builder: (context, box) => _spread(box)) : _column(),
        ),
      );

  Widget _column() => Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [for (var i = 0; i < children.length; i++) ...[if (i > 0) SizedBox(height: gap), children[i]]],
      );

  // A card of a set height spreads its pieces; with very large text it scrolls instead of overflowing.
  Widget _spread(BoxConstraints box) => SingleChildScrollView(
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: box.maxHeight),
          child: IntrinsicHeight(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: children,
            ),
          ),
        ),
      );
}

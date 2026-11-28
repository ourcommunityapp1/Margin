// A level's gem (ui/stone.tsx, .hr-stone.gem): Stone, Bronze, Silver, Gold or Diamond, drawn from its colours in
// engine/tiers.dart. Level 0 is a dashed outline; an overdue item's gem fades until its next good review.

import 'package:material_ui/material_ui.dart';

import '../engine/tiers.dart';
import '../features/lesson/step_frame.dart' show DashedBox;

class KStone extends StatelessWidget {
  const KStone({super.key, required this.level, this.size = 28, this.dim = false});
  final int level;
  final double size;
  final bool dim;

  @override
  Widget build(BuildContext context) {
    final tier = tierOf(level);
    final radius = (size * 0.3).roundToDouble();
    final label = tier == null ? 'Not yet earned' : '${tier.stone}, ${tier.name}${dim ? ', needs a refresh' : ''}';
    if (tier == null) return Semantics(image: true, label: label, child: DashedBox(radius: radius, width: size, height: size));
    final r = BorderRadius.circular(radius);
    // linear-gradient(150deg, gem, edge): from the top, slightly left, to the bottom, slightly right.
    const begin = Alignment(-0.5, -0.87), end = Alignment(0.5, 0.87);
    Widget stone = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: r,
        gradient: LinearGradient(begin: begin, end: end, colors: [Color(tier.color), Color(tier.edge)]),
        boxShadow: const [
          BoxShadow(color: Color(0x24141C1C), blurRadius: 2, offset: Offset(0, 1)),
          BoxShadow(color: Color(0x1A141C1C), blurRadius: 8, offset: Offset(0, 3)),
        ],
      ),
      child: ClipRRect(
        borderRadius: r,
        child: Stack(fit: StackFit.expand, children: [
          if (tier.id == 'diamond') ...[
            // Two flat facets of light, as on the website.
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, stops: [0, 0.18, 0.18, 1],
                    colors: [Color(0xD9FFFFFF), Color(0xD9FFFFFF), Color(0x00FFFFFF), Color(0x00FFFFFF)]),
              ),
            ),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(begin: Alignment.topRight, end: Alignment.bottomLeft, stops: [0, 0.22, 0.22, 1],
                    colors: [Color(0x59FFFFFF), Color(0x59FFFFFF), Color(0x00FFFFFF), Color(0x00FFFFFF)]),
              ),
            ),
          ] else
            // A soft highlight near the top left.
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(center: Alignment(-0.4, -0.52), radius: 0.65, colors: [Color(0xBFFFFFFF), Color(0x00FFFFFF)]),
              ),
            ),
          // The rim and a little shade at the bottom.
          DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: r,
              gradient: const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0x00000000), Color(0x30000000)], stops: [0.7, 1]),
              border: Border.all(color: const Color(0x52FFFFFF)),
            ),
          ),
        ]),
      ),
    );
    if (dim) {
      stone = Opacity(
        opacity: 0.5,
        child: ColorFiltered(
          colorFilter: const ColorFilter.matrix(<double>[
            0.3, 0.6, 0.1, 0, 0, //
            0.3, 0.6, 0.1, 0, 0,
            0.3, 0.6, 0.1, 0, 0,
            0, 0, 0, 1, 0,
          ]),
          child: stone,
        ),
      );
    }
    return Semantics(image: true, label: label, child: stone);
  }
}

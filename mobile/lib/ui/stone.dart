// A level's stone, as a close-up of the real stone in a rounded square (ui/stone.tsx, .hr-stone). Level 0 is a dashed
// outline; an overdue item's stone fades until its next good review.

import 'package:material_ui/material_ui.dart';

import '../engine/levels.dart';
import '../features/lesson/step_frame.dart' show DashedBox;

class KStone extends StatelessWidget {
  const KStone({super.key, required this.level, this.size = 28, this.dim = false});
  final int level;
  final double size;
  final bool dim;

  @override
  Widget build(BuildContext context) {
    final info = levelInfo(level);
    final radius = (size * 0.27).roundToDouble();
    final label = info == null ? 'Not yet earned' : '${info.name}${dim ? ', needs a refresh' : ''}';
    if (info == null) return Semantics(image: true, label: label, child: DashedBox(radius: radius, width: size, height: size));
    Widget stone = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        boxShadow: const [BoxShadow(color: Color(0x24141C1C), blurRadius: 8, offset: Offset(0, 3))],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.asset('assets/images/stones/${info.id}.jpg', fit: BoxFit.cover),
            DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(radius),
                gradient: const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0x00000000), Color(0x33000000)], stops: [0.6, 1]),
                border: Border.all(color: const Color(0x52FFFFFF)),
              ),
            ),
          ],
        ),
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

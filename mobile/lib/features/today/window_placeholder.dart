// A plain arch where a course's stained-glass window will go (phase 3, ADR-0007). It is deliberately colourless: a
// window is only ever shown lit as far as it has been earned, so until the real ones exist nothing coloured is drawn.

import 'package:material_ui/material_ui.dart';

class WindowPlaceholder extends StatelessWidget {
  const WindowPlaceholder({super.key, this.size = 240});
  final double size;

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
        child: SizedBox(width: size * 0.78, height: size, child: CustomPaint(painter: _ArchPainter())),
      );
}

class _ArchPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final r = size.width / 2;
    Path arch(double inset) {
      final w = size.width - inset * 2, rr = w / 2;
      return Path()
        ..moveTo(inset, size.height - inset)
        ..lineTo(inset, rr + inset)
        ..arcToPoint(Offset(size.width - inset, rr + inset), radius: Radius.circular(rr))
        ..lineTo(size.width - inset, size.height - inset)
        ..close();
    }

    canvas.drawPath(arch(1), Paint()..color = const Color(0x0DFFFFFF));
    canvas.drawPath(arch(1), Paint()..color = const Color(0x24FFFFFF)..style = PaintingStyle.stroke..strokeWidth = 1.5);
    canvas.drawPath(arch(size.width * 0.09), Paint()..color = const Color(0x14FFFFFF)..style = PaintingStyle.stroke..strokeWidth = 1);
    canvas.drawLine(Offset(r, size.width * 0.18), Offset(r, size.height - 1), Paint()..color = const Color(0x14FFFFFF)..strokeWidth = 1);
  }

  @override
  bool shouldRepaint(_ArchPainter old) => false;
}

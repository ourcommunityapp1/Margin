// A course's window: the small stone-ringed copy (src/app/heir/ui/glass/mini.tsx, .hr-mini) for lists, and the round
// window in a stone frame with a gold arc for how far the light has come (round.tsx, .hr-round) for cards.
// Panes you have learned are lit; the rest rest dark. Never lit beyond what is earned (see light.dart).

import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:material_ui/material_ui.dart';

import 'glass_render.dart';

/// The glass alone, in a circle: loads and draws the picture, a dark circle until it is ready.
class _GlassCircle extends StatefulWidget {
  const _GlassCircle({required this.base, required this.lit, required this.dusty, required this.started, required this.size});
  final String base;
  final List<double> lit;
  final List<bool>? dusty;
  final bool started;
  final double size;

  @override
  State<_GlassCircle> createState() => _GlassCircleState();
}

class _GlassCircleState extends State<_GlassCircle> {
  ui.Image? _image;
  String _asked = '';

  String get _key => '${widget.base}|${widget.lit.join(',')}|${widget.dusty?.join(',')}|${widget.started}';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(_GlassCircle old) {
    super.didUpdateWidget(old);
    if (_key != _asked) _load();
  }

  void _load() {
    final key = _asked = _key;
    windowImage(widget.base, widget.lit, widget.dusty, started: widget.started).then((img) {
      if (mounted && key == _asked) setState(() => _image = img);
    }).catchError((Object _) {
      // Leave the dark circle.
    });
  }

  @override
  Widget build(BuildContext context) => SizedBox(
        width: widget.size,
        height: widget.size,
        child: ClipOval(
          child: ColoredBox(
            color: const Color(0xFF0B0D0F),
            child: _image == null ? null : RawImage(image: _image, width: widget.size, height: widget.size, fit: BoxFit.cover, filterQuality: FilterQuality.medium),
          ),
        ),
      );
}

/// The small window for a list: a ring of stone around the glass.
class MiniWindow extends StatelessWidget {
  const MiniWindow({super.key, required this.base, required this.lit, this.dusty, this.size = 64, this.started = false, this.label});
  final String base;
  final List<double> lit;
  final List<bool>? dusty;
  final double size;

  /// The course has some progress (its dark glass rests a little brighter).
  final bool started;
  final String? label;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      image: true,
      label: label,
      child: Container(
        width: size,
        height: size,
        padding: const EdgeInsets.all(3),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFFA69B89), Color(0xFF6F675A), Color(0xFF4A443C)], stops: [0, 0.55, 1]),
          boxShadow: const [BoxShadow(color: Color(0x59000000), spreadRadius: 1, blurRadius: 0), BoxShadow(color: Color(0x2E000000), blurRadius: 12, offset: Offset(0, 4))],
        ),
        child: _GlassCircle(base: base, lit: lit, dusty: dusty, started: started, size: size - 6),
      ),
    );
  }
}

/// The round window in a stone frame, with a gold arc that traces how far round the light has come and a small notch
/// where the next pane will light.
class RoundWindow extends StatelessWidget {
  const RoundWindow({super.key, required this.base, required this.lit, this.dusty, required this.share, this.size = 240, this.started = true, this.label});
  final String base;
  final List<double> lit;
  final List<bool>? dusty;

  /// The share of the window lit, 0 to 1, for the gold arc.
  final double share;
  final double size;
  final bool started;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final glass = size * 292 / 324, inset = (size - glass) / 2;
    return Semantics(
      image: true,
      label: label ?? 'Your window: ${(share * 100).round()}% lit',
      child: SizedBox(
        width: size,
        height: size,
        child: Stack(
          children: [
            Positioned(left: inset, top: inset, child: _GlassCircle(base: base, lit: lit, dusty: dusty, started: started, size: glass)),
            Positioned.fill(child: CustomPaint(painter: _FramePainter(share.clamp(0.0, 1.0)))),
          ],
        ),
      ),
    );
  }
}

class _FramePainter extends CustomPainter {
  _FramePainter(this.share);
  final double share;

  @override
  void paint(Canvas canvas, Size size) {
    // Frame geometry in a 324-unit box (round.tsx).
    canvas.scale(size.width / 324);
    const c = Offset(162, 162);
    Paint ring(double w, {Color? color, Shader? shader}) => Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = w
      ..color = color ?? const Color(0xFF000000)
      ..shader = shader;
    canvas.drawCircle(c, 148, ring(5, color: const Color(0xFF0B0D0F)));
    canvas.drawCircle(
      c,
      156,
      ring(
        11,
        shader: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFFA69B89), Color(0xFF7C7364), Color(0xFF4F483F)], stops: [0, 0.5, 1])
            .createShader(const Rect.fromLTWH(0, 0, 324, 324)),
      ),
    );
    canvas.drawCircle(c, 161.5, ring(1, color: const Color(0x73000000)));
    canvas.drawCircle(c, 150.6, ring(0.8, color: const Color(0x38FFF0D7)));
    if (share > 0) {
      canvas.drawArc(Rect.fromCircle(center: c, radius: 152.5), -math.pi / 2, 2 * math.pi * share, false, ring(2.4, color: const Color(0xFFF1C46B))..strokeCap = StrokeCap.round);
    }
    if (share < 1) {
      final a = -math.pi / 2 + 2 * math.pi * share;
      final notch = Offset(c.dx + 156 * math.cos(a), c.dy + 156 * math.sin(a));
      canvas.drawCircle(notch, 6, Paint()..color = const Color(0x66F1C46B)..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3));
      canvas.drawCircle(notch, 4, Paint()..color = const Color(0xFFFFE2A8));
    }
  }

  @override
  bool shouldRepaint(_FramePainter old) => old.share != share;
}

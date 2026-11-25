// A course's window: the small stone-ringed copy (src/app/heir/ui/glass/mini.tsx, .hr-mini) for lists, and the round
// window in a stone frame with a gold arc for how far the light has come (round.tsx, .hr-round) for cards.
// Panes you have learned are lit; the rest rest dark, with a dim light moving behind a course you have not started.
// Never lit beyond what is earned (see light.dart).
//
// A window shows its quick small picture first, then swaps in the sharp full-size one. Lit panes glow a little past the
// lead, and the moving light is a soft gradient over a brighter copy of the dark glass.

import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/scheduler.dart';
import 'package:material_ui/material_ui.dart';

import 'glass_motion.dart';
import 'glass_render.dart';

export 'glass_motion.dart' show CircleMotion, GlassMotion, ListMotion;

final int _clockStart = DateTime.now().millisecondsSinceEpoch;

/// One shared clock, so a light passing down a list moves from one window into the next.
int _nowMs() => DateTime.now().millisecondsSinceEpoch - _clockStart;

/// The glass alone, in a circle: loads and draws the picture, a dark circle until it is ready.
class _GlassCircle extends StatefulWidget {
  const _GlassCircle({required this.base, required this.lit, required this.dusty, required this.started, required this.size, required this.sharp, this.motion, this.inList = false});
  final String base;
  final List<double> lit;
  final List<bool>? dusty;
  final bool started;
  final double size;

  /// Use the full-size glass (cards), not just the small copy (lists).
  final bool sharp;
  final GlassMotion? motion;
  final bool inList;

  @override
  State<_GlassCircle> createState() => _GlassCircleState();
}

class _GlassCircleState extends State<_GlassCircle> with SingleTickerProviderStateMixin {
  ui.Image? _small, _full, _peak;
  String _asked = '';
  Ticker? _ticker;
  final _repaint = ValueNotifier<int>(0);

  bool get _anyLit => widget.lit.any((f) => f > 0);

  /// The moving light is for a course not yet begun (and only where the person has not asked for less motion).
  bool get _moving => widget.motion != null && !widget.started && !_anyLit && !(MediaQuery.maybeDisableAnimationsOf(context) ?? false);

  double get _rest => _moving ? (widget.inList ? restList : restMoving) : (widget.started || _anyLit ? restStarted : restUnstarted);

  String get _key => '${widget.base}|${widget.lit.join(',')}|${widget.dusty?.join(',')}|${widget.started}|${widget.sharp}|$_moving|${widget.inList}';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _load();
  }

  @override
  void didUpdateWidget(_GlassCircle old) {
    super.didUpdateWidget(old);
    if (_key != _asked) _load();
  }

  void _load() {
    final key = _asked = _key;
    final rest = _rest;
    bool stale() => !mounted || key != _asked;
    windowImage(widget.base, widget.lit, widget.dusty, rest: rest).then((img) {
      if (!stale()) setState(() => _small = img);
    }).catchError((Object _) {});
    if (widget.sharp) {
      windowImage(widget.base, widget.lit, widget.dusty, rest: rest, tier: GlassTier.full).then((img) {
        if (!stale()) setState(() => _full = img);
      }).catchError((Object _) {});
    } else {
      _full = null;
    }
    if (_moving) {
      // The same glass at the brightness of the middle of the light, drawn through a moving gradient over the dark one.
      final mix = 0.45 * (1 - (peakBrightness - rest) / (1 - rest));
      windowImage(widget.base, widget.lit, widget.dusty, rest: peakBrightness, restMix: mix, tier: widget.sharp ? GlassTier.full : GlassTier.small).then((img) {
        if (!stale()) setState(() => _peak = img);
      }).catchError((Object _) {});
      _ticker ??= createTicker((_) => _repaint.value++)..start();
    } else {
      _peak = null;
      _ticker?.dispose();
      _ticker = null;
    }
  }

  @override
  void dispose() {
    _ticker?.dispose();
    _repaint.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final image = _full ?? _small;
    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: ClipOval(
        child: ColoredBox(
          color: const Color(0xFF0B0D0F),
          child: image == null
              ? null
              : RepaintBoundary(
                  child: CustomPaint(
                    painter: _GlassPainter(image: image, peak: _peak, motion: _moving ? widget.motion : null, glow: _anyLit, repaint: _repaint),
                    size: Size.square(widget.size),
                  ),
                ),
        ),
      ),
    );
  }
}

class _GlassPainter extends CustomPainter {
  _GlassPainter({required this.image, required this.peak, required this.motion, required this.glow, required Listenable repaint}) : super(repaint: repaint);
  final ui.Image image;
  final ui.Image? peak;
  final GlassMotion? motion;
  final bool glow;

  void _draw(Canvas canvas, ui.Image img, Rect dst, Paint paint) =>
      canvas.drawImageRect(img, Rect.fromLTWH(0, 0, img.width.toDouble(), img.height.toDouble()), dst, paint);

  @override
  void paint(Canvas canvas, Size size) {
    final dst = Offset.zero & size;
    final paint = Paint()..filterQuality = FilterQuality.medium;
    _draw(canvas, image, dst, paint);

    // Glow: lit glass spills a little light past the lead (the website's blur pass), added over the picture.
    if (glow) {
      canvas.saveLayer(dst, Paint()..blendMode = BlendMode.plus..color = const Color(0x59FFFFFF)..imageFilter = ui.ImageFilter.blur(sigmaX: size.width * 0.025, sigmaY: size.width * 0.025));
      _draw(canvas, image, dst, paint);
      canvas.restore();
    }

    // The moving light: the brighter copy of the dark glass, seen only where the light is.
    final m = motion, bright = peak;
    if (m == null || bright == null) return;
    final s = lightAt(m, _nowMs());
    if (s == null) return;
    final radius = LightLook.r * size.width * 2.2;
    final center = Offset(s.x * size.width, s.y * size.height);
    canvas.saveLayer(dst, Paint());
    _draw(canvas, bright, dst, paint);
    final stops = [for (final d in [0.0, 0.4, 0.8, 1.2, 1.6, 2.0, 2.2]) s.k * lightReach(d * LightLook.r)];
    canvas.drawRect(
      dst,
      Paint()
        ..blendMode = BlendMode.dstIn
        ..shader = ui.Gradient.radial(
          center,
          radius,
          [for (final a in stops) Color.fromRGBO(255, 255, 255, a.clamp(0, 1))],
          const [0, 0.18, 0.36, 0.55, 0.73, 0.91, 1],
        ),
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(_GlassPainter old) => old.image != image || old.peak != peak || old.motion != motion || old.glow != glow;
}

/// The small window for a list: a ring of stone around the glass.
class MiniWindow extends StatelessWidget {
  const MiniWindow({super.key, required this.base, required this.lit, this.dusty, this.size = 64, this.started = false, this.label, this.motion, this.inList = false});
  final String base;
  final List<double> lit;
  final List<bool>? dusty;
  final double size;

  /// The course has some progress (its dark glass rests a little brighter, and nothing moves behind it).
  final bool started;
  final String? label;

  /// A dim light moving behind the dark glass of a course not yet begun.
  final GlassMotion? motion;

  /// In the Courses list: dark glass rests a little brighter, so no window reads as black.
  final bool inList;

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
        child: _GlassCircle(base: base, lit: lit, dusty: dusty, started: started, size: size - 6, sharp: size >= 140, motion: motion, inList: inList),
      ),
    );
  }
}

/// The round window in a stone frame, with a gold arc that traces how far round the light has come and a small notch
/// where the next pane will light.
class RoundWindow extends StatelessWidget {
  const RoundWindow({super.key, required this.base, required this.lit, this.dusty, required this.share, this.size = 240, this.started = true, this.label, this.beam});
  final String base;
  final List<double> lit;
  final List<bool>? dusty;

  /// The share of the window lit, 0 to 1, for the gold arc.
  final double share;
  final double size;
  final bool started;
  final String? label;

  /// A dim light moving behind the dark glass of a course not yet begun.
  final GlassMotion? beam;

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
            Positioned(left: inset, top: inset, child: _GlassCircle(base: base, lit: lit, dusty: dusty, started: started, size: glass, sharp: size >= 140, motion: beam)),
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

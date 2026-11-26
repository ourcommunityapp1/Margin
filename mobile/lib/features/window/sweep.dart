// A window lighting up pane by pane, as the website's glass does (glass/window.tsx `revealTo`, glass/mini.tsx `reveal`):
// the panes to light are taken question by question in `sweepOrder`, each starts a moment after the one before
// (clamp(2400 / panes, 6, 130) ms apart, so any sweep takes about two and a half seconds) and fades up over 400 ms.
//
// It draws the window twice, once dark and once with those panes lit, and blends each pane from one to the other as its turn
// comes, recomputing only the pixels that are changing. The last picture equals the still window's lit panes exactly (dust
// is added after, by the still window).

import 'dart:async';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/scheduler.dart';
import 'package:material_ui/material_ui.dart';

import 'glass_render.dart';
import 'light.dart';

const _fade = 400; // ms each pane takes to come up

/// The panes [lit] lights, in the order the light reaches them: question by question, each in its sweep order.
List<int> sweepIds(Glass d, List<double> lit) => _sweep(d, lit, null).ids;

/// The panes lit by [lit] but not by [from], in sweep order, and where each question's new panes end (indexes into ids).
({List<int> ids, Set<int> ends}) _sweep(Glass d, List<double> lit, List<double>? from) {
  final p = d.flat.length, n = lit.length;
  final ids = <int>[];
  final ends = <int>{};
  for (var i = 0; i < n; i++) {
    final own = sweepOrder(d.flat.sublist((i * p) ~/ n, ((i + 1) * p) ~/ n), d.centres);
    final had = from == null || i >= from.length ? 0 : (from[i].clamp(0.0, 1.0) * own.length).round();
    final on = (lit[i].clamp(0.0, 1.0) * own.length).round();
    if (on <= had) continue;
    ids.addAll(own.sublist(had, on));
    // A question whose glass is now whole: its last pane gets a firmer tap.
    if (on == own.length) ends.add(ids.length - 1);
  }
  return (ids: ids, ends: ends);
}

/// Runs one sweep and publishes each new picture in [image]. [done] completes when every pane is up.
class GlassSweep {
  GlassSweep._(this._d, this._dark, this._lit, this._ids, this._ends, this._frameMs) : _out = Uint8List.fromList(_dark), _alpha = Float64List(_ids.length);

  final Glass _d;
  final Uint8List _dark, _lit, _out;
  final List<int> _ids;
  final Set<int> _ends;

  /// Called as each pane starts to come on ([last] when it completes a question's glass).
  void Function(bool last)? onPane;
  final Float64List _alpha;
  final int _frameMs;
  final image = ValueNotifier<ui.Image?>(null);
  final _done = Completer<void>();
  Ticker? _ticker;
  bool _decoding = false, _disposed = false;
  int _lastFrame = -1 << 30;

  Future<void> get done => _done.future;

  /// How long the whole sweep takes, in ms.
  int get length => _ids.isEmpty ? 0 : (_ids.length - 1) * stagger + _fade;
  int get stagger => _ids.isEmpty ? 0 : math.max(6, math.min(130, 2400 ~/ _ids.length));

  /// Prepares a sweep for a window lit to [lit] (from dark, or from [from] already lit), at the [tier] the window is drawn in.
  /// [fromDusty] is the dust on the glass already lit. Null if nothing new would light.
  static Future<GlassSweep?> prepare(String base, List<double> lit, {required double rest, GlassTier tier = GlassTier.small, List<double>? from, List<bool>? fromDusty}) async {
    final d = await loadGlass(base, tier);
    final sw = _sweep(d, lit, from);
    final ids = sw.ids;
    if (ids.isEmpty) return null;
    final before = from == null ? List.filled(d.count + 1, 0) : paneStates(count: d.count, flat: d.flat, lit: from, dusty: fromDusty, centres: d.centres);
    final on = [...before];
    for (final id in ids) {
      on[id] = 1;
    }
    final off = tier == GlassTier.full;
    final dark = off ? await renderPixelsOff(d, before, rest: rest) : renderPixels(d, before, rest: rest);
    final litPx = off ? await renderPixelsOff(d, on, rest: rest) : renderPixels(d, on, rest: rest);
    // The full-size picture is four megabytes: about twenty pictures a second is plenty for it.
    return GlassSweep._(d, dark, litPx, ids, sw.ends, tier == GlassTier.full ? 50 : 30);
  }

  /// Starts the sweep. [vsync] drives it.
  void start(TickerProvider vsync) {
    _publish();
    _ticker = vsync.createTicker(_tick)..start();
  }

  void _tick(Duration elapsed) {
    final t = elapsed.inMilliseconds;
    var changed = false, all = true;
    final step = stagger;
    for (var k = 0; k < _ids.length; k++) {
      final a = ((t - k * step) / _fade).clamp(0.0, 1.0);
      if (a < 1) all = false;
      if (a == _alpha[k]) continue;
      if (_alpha[k] == 0) onPane?.call(_ends.contains(k));
      _alpha[k] = a;
      _blend(_ids[k], a);
      changed = true;
    }
    if (all) {
      _ticker?.stop();
      _publish(last: true);
      return;
    }
    if (changed && t - _lastFrame >= _frameMs) {
      _lastFrame = t;
      _publish();
    }
  }

  void _blend(int id, double a) {
    final px = _d.panes[id];
    if (px == null) return;
    for (final p in px) {
      final q = p * 4;
      for (var c = 0; c < 3; c++) {
        final from = _dark[q + c], to = _lit[q + c];
        _out[q + c] = (from + (to - from) * a).round();
      }
    }
  }

  void _publish({bool last = false}) {
    if (_disposed || (_decoding && !last)) return;
    _decoding = true;
    final bytes = Uint8List.fromList(_out);
    ui.decodeImageFromPixels(bytes, _d.size, _d.size, ui.PixelFormat.rgba8888, (img) {
      _decoding = false;
      if (_disposed) return;
      // Earlier pictures may still be on screen for a frame: they are left to be collected, never disposed here.
      image.value = img;
      if (last && !_done.isCompleted) _done.complete();
    });
  }

  void dispose() {
    _disposed = true;
    _ticker?.dispose();
    image.dispose();
    if (!_done.isCompleted) _done.complete();
  }
}

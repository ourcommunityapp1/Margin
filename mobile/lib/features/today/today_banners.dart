// The lines above Today's cards (today.tsx, heir.css .hr-day-line .hr-day-banner .hr-live .hr-day-warn).

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../state/household.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import 'today_cards.dart';

/// "Today · 1 of 3 done · about 12 min left".
class DayLine extends StatelessWidget {
  const DayLine({super.key, required this.done, required this.total, required this.minutesLeft});
  final int done, total, minutesLeft;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(
              child: Text.rich(
                TextSpan(children: [
                  TextSpan(text: 'Today', style: sans(14, weight: FontWeight.w600, color: roseInk)),
                  TextSpan(text: ' · $done of $total done'),
                ]),
                style: sans(14, color: roseMuted),
              ),
            ),
            const SizedBox(width: 12),
            Flexible(child: Text('about $minutesLeft min left', textAlign: TextAlign.right, style: sans(14, color: roseMuted))),
          ],
        ),
      );
}

/// "Today's lessons are done · 18 min".
class DoneBanner extends StatelessWidget {
  const DoneBanner({super.key, required this.minutes});
  final int minutes;

  @override
  Widget build(BuildContext context) => Semantics(
        liveRegion: true,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            color: const Color(0x1FF3D8B6),
            border: Border.all(color: const Color(0x52F3D8B6)),
          ),
          child: _doneRow(minutes, roseInk, const Color(0xFFC9C1B3)),
        ),
      );
}

Widget _doneRow(int minutes, Color ink, Color muted) => Row(
      children: [
        const DayTick(),
        const SizedBox(width: 10),
        Expanded(child: Text('Today’s lessons are done', style: sans(15, weight: FontWeight.w600, color: ink))),
        Text('$minutes min', style: sans(15, weight: FontWeight.w600, color: muted)),
      ],
    );

/// The optional evening or morning recall. Put away, it stays away for that evening (or morning) on this phone.
/// When the day's cards are done it also carries that news, so there is one banner, not two.
class LiveOffer {
  const LiveOffer({required this.key, required this.when, required this.mode, required this.title, required this.line});
  final String key; // 'rise' or 'night'
  final String when;
  final String mode;
  final String title, line;
}

class LiveBanner extends ConsumerStatefulWidget {
  const LiveBanner({super.key, required this.offer, required this.doneMinutes});
  final LiveOffer offer;

  /// Set when the day's cards are done: the banner then also says so.
  final int? doneMinutes;

  @override
  ConsumerState<LiveBanner> createState() => _LiveBannerState();
}

class _LiveBannerState extends ConsumerState<LiveBanner> {
  late bool _away = ref.read(storeProvider).read(_storeKey) == '1';
  String get _storeKey => 'hr-live-away:${widget.offer.key}:${widget.offer.when}';

  void _putAway() {
    setState(() => _away = true);
    ref.read(storeProvider).write(_storeKey, '1');
  }

  @override
  Widget build(BuildContext context) {
    final o = widget.offer;
    final done = widget.doneMinutes;
    if (_away) return done == null ? const SizedBox.shrink() : DoneBanner(minutes: done);
    final rise = o.key == 'rise';
    final ink = rise ? const Color(0xFF2A1E12) : const Color(0xFFE6ECF7);
    final border = rise ? const Color(0x99FFE2BA) : const Color(0x59C0B0E8).withValues(alpha: 0.35);
    return Semantics(
      container: true,
      label: o.title,
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 10, 10, 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: rise ? const [Color(0xF2F6D6AA), Color(0xEBECB88C)] : const [Color(0xEB263868), Color(0xEB161E3E)],
          ),
          border: Border.all(color: rise ? border : const Color(0x5996B0E8)),
        ),
        child: DefaultTextStyle(
          style: sans(15, color: ink),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (done != null) ...[
                Padding(padding: const EdgeInsets.only(right: 4), child: _doneRow(done, ink, ink.withValues(alpha: 0.75))),
                Container(height: 8),
                Container(height: 1, color: const Color(0x3896B0E8)),
                Container(height: 8),
              ],
              Row(
                children: [
                  Container(
                    width: 26,
                    height: 26,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: rise ? const Color(0x24784614) : const Color(0x3396B0E8)),
                    child: Center(child: KIcon(rise ? _sun : _moon, size: 18, color: ink, strokeWidth: 2)),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: InkWell(
                      onTap: () => context.push('/lesson?mode=${o.mode}'),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(o.title, style: sans(15, weight: FontWeight.w700, color: ink, height: 1.25)),
                          Text(o.line, style: sans(13, color: ink.withValues(alpha: 0.78), height: 1.25)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Semantics(
                    button: true,
                    child: Material(
                      color: rise ? const Color(0xFF5A3A1C) : const Color(0xFFDCE6FA),
                      borderRadius: BorderRadius.circular(999),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(999),
                        onTap: () => context.push('/lesson?mode=${o.mode}'),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          child: Text('Start', style: sans(14, weight: FontWeight.w700, color: rise ? const Color(0xFFFBEBD3) : const Color(0xFF142042))),
                        ),
                      ),
                    ),
                  ),
                  Semantics(
                    button: true,
                    label: 'Not ${rise ? 'this morning' : 'tonight'}',
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: _putAway,
                      child: SizedBox(
                        width: 34,
                        height: 34,
                        child: Center(child: Opacity(opacity: 0.7, child: KIcon('<path d="M6 6l12 12M18 6L6 18"/>', size: 16, color: ink, strokeWidth: 2.2))),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  static const _moon = '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>';
  static const _sun = '<circle cx="12" cy="13" r="4"/><path d="M12 3v3M4.9 6.9l2.1 2.1M19.1 6.9 17 9M2 17h20M5 21h14"/>';
}

/// Words about to leave your count, or already gone. One line, at most.
class KeepWarning extends StatelessWidget {
  const KeepWarning(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          color: const Color(0x38964A2A),
          border: Border.all(color: const Color(0x4DF0A789)),
        ),
        child: Text(text, style: sans(14, color: const Color(0xFFF0C4AE), height: 1.4)),
      );
}

// The floating tab bar (heir.css .hr-tabs, ui/tabs.tsx): frosted in the page's own ink, rounded 26,
// 16 above the bottom edge. Today, Courses, Progress, and Friends once signed in.

import 'dart:ui' show ImageFilter;

import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import 'theme.dart';
import 'widgets.dart';

class KTab {
  const KTab(this.label, this.icon);
  final String label;
  final String icon;
}

class KTabBar extends StatelessWidget {
  const KTabBar({super.key, required this.tabs, required this.current, required this.onTap, this.dots = const {}});

  final List<KTab> tabs;
  final int current;
  final ValueChanged<int> onTap;

  /// Tabs that show a small dot (Progress, when your place on the leaderboard changed), with what it means.
  final Map<int, String> dots;

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.paddingOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(14, 0, 14, bottom + KSize.tabBarBottom),
      child: Center(
        heightFactor: 1,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 492),
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(26),
              boxShadow: const [BoxShadow(color: Color(0x59000000), blurRadius: 24, offset: Offset(0, 8))],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(26),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: KColors.frame.withValues(alpha: 0.82),
                    borderRadius: BorderRadius.circular(26),
                    border: Border.all(color: const Color(0x12FFFFFF)),
                  ),
                  child: Semantics(
                    container: true,
                    label: 'Main',
                    child: Row(
                      children: [
                        for (final (i, t) in tabs.indexed) ...[
                          if (i > 0) const SizedBox(width: 4),
                          Expanded(child: _TabButton(tab: t, selected: i == current, dot: dots[i], onTap: () => onTap(i))),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  const _TabButton({required this.tab, required this.selected, required this.onTap, this.dot});
  final KTab tab;
  final bool selected;
  final VoidCallback onTap;
  final String? dot;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final color = selected ? k.ink : k.muted;
    return Semantics(
      selected: selected,
      button: true,
      label: dot == null ? tab.label : '${tab.label}. $dot',
      excludeSemantics: true,
      child: Material(
        color: selected ? k.well : Colors.transparent,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () {
            if (!selected) HapticFeedback.selectionClick();
            onTap();
          },
          child: SizedBox(
            height: 56,
            child: Stack(
              alignment: Alignment.center,
              children: [
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    KIcon(tab.icon, color: color),
                    const SizedBox(height: 4),
                    Text(tab.label, style: sans(12, weight: FontWeight.w600, color: color, height: 1)),
                  ],
                ),
                // .hr-tabs .hr-dot: 9px gold, ringed in the page's ink, just right of the icon's centre.
                if (dot != null)
                  Positioned(
                    top: 6,
                    left: 0,
                    right: 0,
                    child: Center(
                      child: Transform.translate(
                        offset: const Offset(12.5, 0),
                        child: Container(
                          width: 9,
                          height: 9,
                          decoration: const BoxDecoration(
                            color: Color(0xFFE8B867),
                            shape: BoxShape.circle,
                            boxShadow: [BoxShadow(color: KColors.frame, spreadRadius: 2)],
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

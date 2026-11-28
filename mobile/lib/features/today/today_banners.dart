// The warning line above Today (heir.css .hr-day-warn).

import 'package:material_ui/material_ui.dart';

import '../../ui/theme.dart';

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

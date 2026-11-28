// Reminders: a daily reminder at a time you pick, and an evening and morning recall. Scheduled on the phone, so they work
// without an account and without a server. Only turning one on asks the phone for permission.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../platform/reminders.dart';
import '../../state/reminders.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import '../lesson/step_frame.dart' show WellButton;

class RemindersScreen extends ConsumerStatefulWidget {
  const RemindersScreen({super.key});

  @override
  ConsumerState<RemindersScreen> createState() => _RemindersScreenState();
}

class _RemindersScreenState extends ConsumerState<RemindersScreen> {
  String _note = '';

  Future<void> _change(ReminderSettings next) async {
    final ok = await ref.read(remindersProvider.notifier).set(next);
    if (!mounted) return;
    setState(() => _note = ok ? '' : 'Notifications are off for Katekize on this phone. Turn them on in the phone’s Settings, then try again.');
  }

  Future<void> _pickTime(ReminderSettings s) async {
    final t = await showTimePicker(context: context, initialTime: TimeOfDay(hour: s.hour, minute: s.minute));
    if (t != null) await _change(s.copyWith(minutes: t.hour * 60 + t.minute));
  }

  Widget _toggle(String title, String sub, bool value, ValueChanged<bool> onChanged) {
    final k = context.k;
    return Semantics(
      toggled: value,
      label: title,
      child: InkWell(
        onTap: () => onChanged(!value),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: sans(16, weight: FontWeight.w700, color: k.ink)),
                  Text(sub, style: sans(13, color: k.muted, height: 1.4)),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Switch(value: value, onChanged: onChanged, activeThumbColor: k.card, activeTrackColor: k.good),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final s = ref.watch(remindersProvider);
    return KPage(
      bare: true,
      children: [
        Padding(padding: const EdgeInsets.only(top: 8), child: Align(alignment: Alignment.centerLeft, child: KBack(onPressed: () => context.canPop() ? context.pop() : context.go('/you')))),
        Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Semantics(header: true, child: Text('Reminders', style: serif(30, weight: FontWeight.w500, color: k.ink)))),
        KCard.column(
          gap: 14,
          children: [
            _toggle('Daily reminder', 'A nudge to do today’s Katekize', s.daily, (v) => _change(s.copyWith(daily: v))),
            if (s.daily) WellButton('At ${timeLabel(s.hour, s.minute)}', onPressed: () => _pickTime(s)),
            _toggle('Evening and morning recalls', 'A reminder before sleep to lock in what you learned, and one in the morning to recall it', s.recalls, (v) => _change(s.copyWith(recalls: v))),
          ],
        ),
        if (_note.isNotEmpty) Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Text(_note, style: sans(15, color: k.miss, height: 1.45))),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Text(
            'Reminders stay on this phone. Nothing about them is sent anywhere, and a reminder for something you’ve already done today is skipped.',
            style: sans(13, color: k.muted, height: 1.5),
          ),
        ),
      ],
    );
  }
}

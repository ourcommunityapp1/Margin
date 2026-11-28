// You (src/app/heir/ui/you.tsx): who you are, settings, and signing in or out. Copy matches the website.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
import '../../engine/planner.dart' show defaultGoal;
import '../../state/auth.dart';
import '../../platform/reminders.dart' show reminderSummary;
import '../../state/household.dart';
import '../../state/haptics.dart';
import '../../state/reminders.dart';
import '../../state/sync.dart';
import '../../ui/screen_parts.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import '../lesson/step_frame.dart' show WellButton;

class YouScreen extends ConsumerStatefulWidget {
  const YouScreen({super.key});

  @override
  ConsumerState<YouScreen> createState() => _YouScreenState();
}

class _YouScreenState extends ConsumerState<YouScreen> {
  bool _armed = false, _cleared = false;

  void _erase(String id) {
    ref.read(progressProvider.notifier).update((p) => {...p}..remove(id));
    setState(() {
      _armed = false;
      _cleared = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final me = ref.watch(meProvider);
    final household = ref.watch(householdProvider);
    final accounts = ref.watch(accountsProvider);
    final email = ref.watch(emailProvider).value;
    final sync = ref.watch(syncProvider);
    final course = courseFor(household.plan?.course);
    final others = household.members.length - 1;
    final signedIn = accounts && email != null;

    return KPage(
      bare: true,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Align(alignment: Alignment.centerLeft, child: KBack(onPressed: () => context.canPop() ? context.pop() : context.go('/today'))),
        ),
        if (me != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Row(
              children: [
                KInitial(me.initial, size: 56),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Semantics(header: true, child: Text(me.name, style: serif(28, weight: FontWeight.w500, color: k.ink, height: 1.1))),
                      const SizedBox(height: 2),
                      Text('${me.track.name == 'child' ? 'Child' : 'Adult'} track${accounts ? (signedIn ? ' · signed in' : ' · not signed in') : ''}', style: sans(14, color: k.muted)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        Semantics(
          label: 'Settings',
          child: KCard(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
            child: Column(
              children: [
                KLinkRow(
                  first: true,
                  title: 'Course and daily goal',
                  sub: course != null ? '${course.title} · ${household.plan?.minutes ?? defaultGoal} min a day' : 'Choose a course',
                  onTap: () => context.push('/plan'),
                ),
                KLinkRow(title: 'Family', sub: others > 0 ? 'You and $others more on this phone' : 'Just you · add someone', onTap: () => context.push('/family')),
                if (accounts && !signedIn) KLinkRow(title: 'Sign in', sub: 'Keep your progress on every phone', onTap: () => context.push('/signin?next=/you')),
                if (signedIn) KLinkRow(title: 'Your profile', sub: 'Name, username, city, who can find you', onTap: () => context.push('/profile')),
                if (signedIn) KLinkRow(title: 'Linked accounts', sub: 'See a family member’s progress, view only', onTap: () => context.push('/linked')),
                KLinkRow(title: 'Reminders', sub: reminderSummary(ref.watch(remindersProvider)), onTap: () => context.push('/reminders')),
                const _VibrationRow(),
                KLinkRow(title: 'How it works', sub: 'Stones, grading and spaced review', onTap: () => context.push('/how')),
                KLinkRow(title: 'About Katekize', sub: 'Sources and credits', onTap: () => context.push('/about')),
                if (signedIn) KLinkRow(title: 'Delete my account', sub: 'Remove your account and everything in it', onTap: () => context.push('/delete-account')),
              ],
            ),
          ),
        ),
        if (signedIn) ...[
          Text(
            'Signed in as $email${sync.state == SyncState.offline ? ' · couldn’t reach the server; changes are kept on this phone' : ''}',
            textAlign: TextAlign.center,
            style: sans(14, color: k.muted),
          ),
          if (sync.note != null && sync.state != SyncState.offline) Text(sync.note!, textAlign: TextAlign.center, style: sans(13, color: k.muted, height: 1.45)),
          if (sync.summary != null && sync.state == SyncState.synced)
            Text('Your account holds: ${sync.summary}', textAlign: TextAlign.center, style: sans(13, color: k.muted, height: 1.45)),
        ],
        KCard.column(
          gap: 10,
          children: [
            if (signedIn) WellButton('Sign out', onPressed: () => ref.read(syncProvider.notifier).signOut()),
            if (me != null)
              if (_cleared)
                Text('${me.name}’s progress is cleared. The next lesson starts from the welcome.', style: sans(15, color: k.ink, height: 1.5))
              else if (_armed) ...[
                Text('Clear ${me.name}’s lessons, stones, days kept and awards on this phone, and begin again from the welcome lesson?', style: sans(15, color: k.ink, height: 1.5)),
                Row(
                  children: [
                    Expanded(child: WellButton('Keep it', onPressed: () => setState(() => _armed = false))),
                    const SizedBox(width: 10),
                    Expanded(child: _Danger('Erase progress', k, () => _erase(me.id))),
                  ],
                ),
              ] else
                KButton('Start over', quiet: true, onPressed: () => setState(() => _armed = true)),
          ],
        ),
      ],
    );
  }
}

class _Danger extends StatelessWidget {
  const _Danger(this.label, this.k, this.onTap);
  final String label;
  final KColors k;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: k.miss,
        borderRadius: BorderRadius.circular(KSize.cardRadius),
        child: InkWell(
          borderRadius: BorderRadius.circular(KSize.cardRadius),
          onTap: onTap,
          child: SizedBox(height: KSize.buttonHeight, child: Center(child: Text(label, style: sans(16, weight: FontWeight.w600, color: k.card, height: 1)))),
        ),
      );
}

/// Vibration on or off: the small taps for answers, windows lighting up, stones and choices.
class _VibrationRow extends ConsumerWidget {
  const _VibrationRow();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final k = context.k;
    final on = ref.watch(hapticsOnProvider);
    return MergeSemantics(
      child: Container(
        constraints: const BoxConstraints(minHeight: 64),
        decoration: BoxDecoration(border: Border(top: BorderSide(color: k.line))),
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Vibration', style: sans(16, weight: FontWeight.w600, color: k.ink)),
                  const SizedBox(height: 2),
                  Text('Small taps as you answer and as your window lights up', style: sans(14, color: k.muted)),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Switch(value: on, onChanged: (v) => ref.read(hapticsOnProvider.notifier).set(v), activeThumbColor: k.card, activeTrackColor: k.good),
          ],
        ),
      ),
    );
  }
}

// You (src/app/heir/ui/you.tsx): who you are, settings, and signing in or out. Copy matches the website.
// Rows for screens not built yet (plan, family, how it works, about) are left out until those screens exist.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../state/auth.dart';
import '../../state/household.dart';
import '../../state/sync.dart';
import '../../ui/screen_parts.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';

class YouScreen extends ConsumerWidget {
  const YouScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final k = context.k;
    final me = ref.watch(meProvider);
    final accounts = ref.watch(accountsProvider);
    final email = ref.watch(emailProvider).value;
    final sync = ref.watch(syncProvider);

    return KPage(
      bare: true,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Align(
            alignment: Alignment.centerLeft,
            child: KBack(onPressed: () => context.canPop() ? context.pop() : context.go('/today')),
          ),
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
                      Semantics(
                        header: true,
                        child: Text(me.name, style: serif(28, weight: FontWeight.w500, color: k.ink, height: 1.1)),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Adult track${accounts ? (email != null ? ' · signed in' : ' · not signed in') : ''}',
                        style: sans(14, color: k.muted),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        if (accounts && email == null)
          KCard(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
            child: KLinkRow(
              first: true,
              title: 'Sign in',
              sub: 'Keep your progress on every phone',
              onTap: () => context.push('/signin?next=/you'),
            ),
          ),
        if (accounts && email != null) ...[
          Text(
            'Signed in as $email${sync.state == SyncState.offline ? ' · couldn’t reach the server; changes are kept on this phone' : ''}',
            textAlign: TextAlign.center,
            style: sans(14, color: k.muted),
          ),
          if (sync.note != null && sync.state != SyncState.offline)
            Text(sync.note!, textAlign: TextAlign.center, style: sans(13, color: k.muted, height: 1.45)),
          if (sync.summary != null && sync.state == SyncState.synced)
            Text('Your account holds: ${sync.summary}', textAlign: TextAlign.center, style: sans(13, color: k.muted, height: 1.45)),
          KCard(
            child: _WellButton('Sign out', onPressed: () => ref.read(syncProvider.notifier).signOut()),
          ),
        ],
      ],
    );
  }
}

/// The quieter filled button on You (`.hr-btn` with the well colour).
class _WellButton extends StatelessWidget {
  const _WellButton(this.label, {required this.onPressed});
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return Material(
      color: k.well,
      borderRadius: BorderRadius.circular(KSize.cardRadius),
      child: InkWell(
        borderRadius: BorderRadius.circular(KSize.cardRadius),
        onTap: onPressed,
        child: SizedBox(
          height: KSize.buttonHeight,
          child: Center(child: Text(label, style: sans(17, weight: FontWeight.w600, color: k.ink, height: 1))),
        ),
      ),
    );
  }
}

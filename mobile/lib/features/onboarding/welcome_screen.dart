// The first screen (src/app/heir/welcome/page.tsx). Copy matches the website.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../state/auth.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';

class WelcomeScreen extends ConsumerWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final k = context.k;
    final accounts = ref.watch(accountsProvider);
    final email = ref.watch(emailProvider).value;
    return KPage(
      bare: true,
      pushDown: true,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 40),
          child: Column(
            children: [
              const KMark(width: 54, height: 62),
              const SizedBox(height: 16),
              Text('Katekize', style: serif(30, weight: FontWeight.w500, color: k.ink, spacing: 0.5)),
            ],
          ),
        ),
        KCard.column(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
          gap: 22,
          children: [
            Text.rich(
              TextSpan(
                style: serif(30, color: k.ink, height: 1.18),
                children: [
                  TextSpan(text: 'Remember.', style: serif(30, weight: FontWeight.w600, color: k.ink, height: 1.18)),
                  TextSpan(
                    text: ' Scripture, catechisms and creeds, learned together and kept for life.',
                    style: TextStyle(color: k.muted),
                  ),
                ],
              ),
            ),
            // Scripture: copied exactly from the website; never retyped.
            Text(
              '“and if children, then heirs—heirs of God and fellow heirs with Christ.” Romans 8:17',
              style: sans(15, color: k.muted, height: 1.5),
            ),
            KButton('Get started', onPressed: () => context.go('/start')),
            if (accounts && email == null)
              Transform.translate(
                offset: const Offset(0, -8),
                child: Center(
                  child: TextButton(
                    onPressed: () => context.push('/signin?next=/today'),
                    style: TextButton.styleFrom(foregroundColor: k.ink, padding: const EdgeInsets.all(6)),
                    child: Text('Already set up? Sign in', style: sans(15, color: k.ink)),
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

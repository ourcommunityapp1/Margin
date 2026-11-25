// First run (src/app/heir/start/page.tsx): a name, what to memorize, a daily goal, then the first lesson.
//
// So far only the name step. Choosing a course and a daily goal need the course content and the engine's
// household and planner rules, which are still being ported; this screen gains those steps then.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../state/household.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';

class StartScreen extends ConsumerStatefulWidget {
  const StartScreen({super.key});

  @override
  ConsumerState<StartScreen> createState() => _StartScreenState();
}

class _StartScreenState extends ConsumerState<StartScreen> {
  final _name = TextEditingController();

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  void _continue() {
    if (_name.text.trim().isEmpty) return;
    ref.read(meProvider.notifier).setName(_name.text);
    context.go('/today');
  }

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return KPage(
      bare: true,
      pushDown: true,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const KMark(width: 24, height: 28),
              const SizedBox(width: 10),
              Text('Katekize', style: serif(24, weight: FontWeight.w500, color: k.ink)),
            ],
          ),
        ),
        KCard.column(
          children: [
            Semantics(
              header: true,
              child: Text('What’s your name?', style: serif(28, weight: FontWeight.w600, color: k.ink, height: 1.2)),
            ),
            ListenableBuilder(
              listenable: _name,
              builder: (context, _) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  KTextField(
                    controller: _name,
                    label: 'What’s your name?',
                    autofocus: true,
                    maxLength: 40,
                    autofillHints: const [AutofillHints.givenName],
                    textCapitalization: TextCapitalization.words,
                    textInputAction: TextInputAction.next,
                    onSubmitted: (_) => _continue(),
                  ),
                  const SizedBox(height: 16),
                  KButton('Continue', onPressed: _name.text.trim().isEmpty ? null : _continue),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }
}

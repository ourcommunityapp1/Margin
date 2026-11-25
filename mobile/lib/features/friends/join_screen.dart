// Accepting an invite to link accounts (src/app/heir/ui/join.tsx): each account can then see the other's progress, view only.
// Signed-out visitors are sent to sign in first (the router does that) and come back here.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../data/social.dart';
import '../../state/household.dart';
import '../../state/social.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';

class JoinScreen extends ConsumerStatefulWidget {
  const JoinScreen({super.key, required this.code});
  final String code;

  @override
  ConsumerState<JoinScreen> createState() => _JoinScreenState();
}

class _JoinScreenState extends ConsumerState<JoinScreen> {
  String _state = 'working'; // working, linked, failed
  String _error = '';

  @override
  void initState() {
    super.initState();
    Future.microtask(_accept);
  }

  Future<void> _accept() async {
    final api = ref.read(socialApiProvider);
    if (widget.code.isEmpty || api == null) return;
    try {
      await api.acceptInvite(widget.code);
      if (mounted) setState(() => _state = 'linked');
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e is SocialFailure && e.message.isNotEmpty ? e.message : 'That invite didn’t work.';
          _state = 'failed';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final someone = ref.watch(householdProvider).members.isNotEmpty;
    Widget heading(String t) => Text(t, style: serif(26, weight: FontWeight.w600, color: k.ink, height: 1.2));
    final List<Widget> body;
    if (widget.code.isEmpty) {
      body = [heading('This invite link is incomplete. Ask for a new one.')];
    } else if (_state == 'working') {
      body = [heading('Linking your accounts…')];
    } else if (_state == 'linked') {
      body = [
        Text.rich(
          TextSpan(children: [
            TextSpan(text: 'You’re linked. ', style: serif(28, weight: FontWeight.w600, color: k.ink, height: 1.18)),
            TextSpan(text: 'You each keep your own account and progress, and can see each other’s. Neither of you can change the other’s.', style: serif(28, color: k.muted, height: 1.18)),
          ]),
        ),
        KButton(someone ? 'See Linked accounts' : 'Set up my own account', onPressed: () => context.go(someone ? '/linked' : '/start')),
      ];
    } else {
      body = [heading('That invite didn’t work.'), Text('$_error Ask the person who invited you to send a new one.', style: sans(16, color: k.ink, height: 1.5))];
    }
    return KPage(bare: true, children: [const SizedBox(height: 24), KCard.column(gap: 18, children: body)]);
  }
}

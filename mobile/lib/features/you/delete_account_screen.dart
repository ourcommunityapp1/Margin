// Delete my account (required inside the app by the App Store and Google Play; ADR-0010). Says plainly what goes, asks for
// the word DELETE, then asks the server to delete the account and clears this phone.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../data/household.dart';
import '../../data/social.dart';
import '../../state/auth.dart';
import '../../state/household.dart';
import '../../state/social.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';

class DeleteAccountScreen extends ConsumerStatefulWidget {
  const DeleteAccountScreen({super.key});

  @override
  ConsumerState<DeleteAccountScreen> createState() => _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends ConsumerState<DeleteAccountScreen> {
  final _word = TextEditingController();
  bool _busy = false;
  String _error = '';

  @override
  void dispose() {
    _word.dispose();
    super.dispose();
  }

  Future<void> _delete() async {
    final api = ref.read(socialApiProvider);
    if (api == null) return;
    setState(() {
      _busy = true;
      _error = '';
    });
    try {
      await api.deleteAccount();
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = e is SocialFailure ? e.message : 'Couldn’t delete the account right now. Try again.';
        });
      }
      return;
    }
    // The account is gone. Clear this phone too, so nothing of it is left, and sign out (which may find nothing to sign out).
    try {
      await ref.read(authProvider).signOut();
    } catch (_) {/* the account no longer exists */}
    ref.read(progressProvider.notifier).replaceFromRemote({});
    ref.read(householdProvider.notifier).replaceFromRemote(emptyHousehold());
    if (mounted) context.go('/welcome');
  }

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final email = ref.watch(emailProvider).value;
    final ready = _word.text.trim() == 'DELETE';
    return KPage(
      bare: true,
      children: [
        Padding(padding: const EdgeInsets.only(top: 8), child: Align(alignment: Alignment.centerLeft, child: KBack(onPressed: () => context.canPop() ? context.pop() : context.go('/you')))),
        Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Semantics(header: true, child: Text('Delete my account', style: serif(30, weight: FontWeight.w500, color: k.ink)))),
        KCard.column(
          gap: 12,
          children: [
            Text('This permanently deletes${email == null ? ' your account' : ' the account for $email'} and everything in it:', style: sans(16, weight: FontWeight.w600, color: k.ink, height: 1.45)),
            for (final line in const [
              'Your sign-in',
              'Everyone in your family, and all their progress, answers and days kept',
              'Your profile, friends, friend requests and blocks',
              'Links to any linked accounts',
            ])
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('•  ', style: sans(16, color: k.muted)), Expanded(child: Text(line, style: sans(16, color: k.ink, height: 1.45)))]),
            Text('It also clears Katekize from this phone. It can’t be undone, and we can’t bring it back. If you only want to leave the friends part, delete your profile instead (Your profile, at the bottom).', style: sans(14, color: k.muted, height: 1.5)),
          ],
        ),
        KCard.column(
          gap: 10,
          children: [
            const KLabel('Type DELETE to confirm'),
            KTextField(controller: _word, label: 'Type DELETE to confirm', textCapitalization: TextCapitalization.characters, onChanged: (_) => setState(() {})),
            if (_error.isNotEmpty) Text(_error, style: sans(15, color: k.miss, height: 1.45)),
            Opacity(
              opacity: ready && !_busy ? 1 : 0.45,
              child: Material(
                color: k.miss,
                borderRadius: BorderRadius.circular(KSize.cardRadius),
                child: InkWell(
                  borderRadius: BorderRadius.circular(KSize.cardRadius),
                  onTap: ready && !_busy ? _delete : null,
                  child: SizedBox(height: KSize.buttonHeight, child: Center(child: Text(_busy ? 'Deleting…' : 'Delete my account', style: sans(16, weight: FontWeight.w600, color: k.card, height: 1)))),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

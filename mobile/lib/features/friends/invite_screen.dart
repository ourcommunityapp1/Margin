// Opening a friend's invite (src/app/heir/ui/invite.tsx). Signed-out visitors sign in first (the router sends them); then
// they make a profile if they have none, see who invited them, and choose to accept.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../data/social.dart';
import '../../state/social.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';

class InviteScreen extends ConsumerStatefulWidget {
  const InviteScreen({super.key, required this.code});
  final String code;

  @override
  ConsumerState<InviteScreen> createState() => _InviteScreenState();
}

class _InviteScreenState extends ConsumerState<InviteScreen> {
  InvitePeek? _peek;
  String? _done;
  bool _busy = false, _asked = false;
  String _error = '';

  Future<void> _ask() async {
    final api = ref.read(socialApiProvider);
    if (api == null) return;
    try {
      final p = await api.peekFriendInvite(widget.code);
      if (mounted) setState(() => _peek = p);
    } catch (_) {
      if (mounted) setState(() => _peek = const InvitePeek('invalid'));
    }
  }

  Future<void> _accept() async {
    setState(() {
      _busy = true;
      _error = '';
    });
    try {
      final name = await ref.read(socialApiProvider)!.acceptFriendInvite(widget.code);
      if (mounted) setState(() => _done = name);
    } catch (e) {
      if (mounted) setState(() => _error = e is SocialFailure ? e.message : 'Something went wrong. Try again.');
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final profile = ref.watch(myProfileProvider);
    final has = profile.value != null;
    if (has && !_asked && widget.code.isNotEmpty) {
      _asked = true;
      Future.microtask(_ask);
    }
    Widget heading(String t) => Text(t, style: serif(28, weight: FontWeight.w600, color: k.ink, height: 1.18));
    Widget muted(String t) => Text(t, style: sans(16, color: k.muted, height: 1.5));
    final peek = _peek;
    final List<Widget> body;
    if (widget.code.isEmpty) {
      body = [heading('This invite link is incomplete.'), muted('Ask for a new one.')];
    } else if (profile.isLoading && !profile.hasValue) {
      body = [heading('One moment…')];
    } else if (!has) {
      body = [
        heading('Someone invited you to Katekize.'),
        muted('Make a profile first so your friend can find you. It takes a minute. Friends see your name and progress, never your answers.'),
        KButton('Make my profile', onPressed: () => context.push('/profile?next=${Uri.encodeComponent('/invite?code=${widget.code}')}')),
      ];
    } else if (_done != null) {
      body = [
        heading('You and $_done are friends.'),
        muted('You can see each other’s streaks and words in memory, and you’re on each other’s community board.'),
        KButton('See my friends', onPressed: () => context.go('/friends')),
      ];
    } else if (peek == null) {
      body = [heading('One moment…')];
    } else if (peek.status == 'ok') {
      body = [
        heading('${peek.name} invited you to be friends on Katekize.'),
        muted('Friends see each other’s streaks, words in memory, stones and courses. Never answers.'),
        if (_error.isNotEmpty) Text(_error, style: sans(15, color: k.miss)),
        KButton('Be friends with ${peek.name}', busy: _busy, busyLabel: 'Adding…', onPressed: _accept),
        KButton('Not now', quiet: true, onPressed: () => context.go('/today')),
      ];
    } else if (peek.status == 'friends') {
      body = [heading('You and ${peek.name} are already friends.'), KButton('See my friends', onPressed: () => context.go('/friends'))];
    } else if (peek.status == 'own') {
      body = [heading('This is your own invite.'), muted('Send it to someone who isn’t on Katekize yet.'), KButton('Back to Friends', onPressed: () => context.go('/friends'))];
    } else if (peek.status == 'used') {
      body = [heading('This invite was already used or has expired.'), muted('Ask your friend to send a new one.')];
    } else {
      body = [heading('That invite didn’t work.'), muted('Ask your friend to send a new one.')];
    }
    return KPage(bare: true, children: [const SizedBox(height: 24), KCard.column(gap: 16, children: body)]);
  }
}

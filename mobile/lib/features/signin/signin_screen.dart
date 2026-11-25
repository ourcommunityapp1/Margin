// Sign in with a code sent by email (src/app/heir/ui/signin.tsx). Copy matches the website.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../state/auth.dart';
import '../../state/household.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';

final _looksLikeEmail = RegExp(r'.+@.+\..+');

class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key, this.next = '/today'});

  /// Where to go once signed in.
  final String next;

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends ConsumerState<SignInScreen> {
  final _email = TextEditingController();
  final _code = TextEditingController();
  bool _sent = false;
  bool _busy = false;
  String _error = '';

  @override
  void dispose() {
    _email.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_busy || !_looksLikeEmail.hasMatch(_email.text)) return;
    setState(() {
      _busy = true;
      _error = '';
    });
    try {
      await ref.read(authProvider).sendCode(_email.text);
      if (mounted) setState(() => _sent = true);
    } on AuthFailure {
      if (mounted) setState(() => _error = 'We couldn’t send a code. Check the address and try again.');
    } catch (_) {
      if (mounted) setState(() => _error = 'We couldn’t send a code. Check the address and try again.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    if (_busy || _code.text.trim().length < 6) return;
    setState(() {
      _busy = true;
      _error = '';
    });
    try {
      await ref.read(authProvider).verifyCode(_email.text, _code.text);
    } on AuthFailure {
      if (mounted) setState(() => _error = 'That code didn’t work. Check it, or send a new one.');
    } catch (_) {
      if (mounted) setState(() => _error = 'That code didn’t work. Check it, or send a new one.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    // Already signed in, or no accounts in this build: go on.
    ref.listen(emailProvider, (_, next) {
      if (next.value != null) context.go(widget.next);
    });
    final someone = ref.watch(meProvider) != null;

    return KPage(
      bare: true,
      pushDown: true,
      children: [
        Align(alignment: Alignment.centerLeft, child: KBack(onPressed: () => context.canPop() ? context.pop() : context.go('/welcome'))),
        KCard.column(
          gap: 18,
          children: [
            Text.rich(
              TextSpan(
                style: serif(28, color: k.ink, height: 1.18),
                children: [
                  TextSpan(text: 'Sign in.', style: serif(28, weight: FontWeight.w600, color: k.ink, height: 1.18)),
                  TextSpan(
                    text: someone
                        ? ' Your progress on this phone will be saved to your account, and kept on every phone you sign in on.'
                        : ' One account for the family, so progress is kept on every phone.',
                    style: TextStyle(color: k.muted),
                  ),
                ],
              ),
            ),
            if (!_sent)
              ListenableBuilder(
                listenable: _email,
                builder: (context, _) => Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const KLabel('Your email'),
                    const SizedBox(height: 12),
                    KTextField(
                      controller: _email,
                      label: 'Your email',
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.email],
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(),
                    ),
                    const SizedBox(height: 12),
                    KButton(
                      'Email me a code',
                      busy: _busy,
                      busyLabel: 'Sending…',
                      onPressed: _looksLikeEmail.hasMatch(_email.text) ? _send : null,
                    ),
                  ],
                ),
              )
            else
              ListenableBuilder(
                listenable: _code,
                builder: (context, _) => Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    KLabel('The code we sent to ${_email.text.trim()}'),
                    const SizedBox(height: 12),
                    KTextField(
                      controller: _code,
                      label: 'The code we sent to ${_email.text.trim()}',
                      keyboardType: TextInputType.number,
                      autofillHints: const [AutofillHints.oneTimeCode],
                      letterSpacing: 4,
                      autofocus: true,
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) => _verify(),
                    ),
                    const SizedBox(height: 12),
                    KButton(
                      'Sign in',
                      busy: _busy,
                      busyLabel: 'Checking…',
                      onPressed: _code.text.trim().length >= 6 ? _verify : null,
                    ),
                    const SizedBox(height: 12),
                    KButton(
                      'Use a different email',
                      quiet: true,
                      onPressed: () => setState(() {
                        _sent = false;
                        _code.clear();
                      }),
                    ),
                  ],
                ),
              ),
            if (_error.isNotEmpty)
              Semantics(liveRegion: true, child: Text(_error, style: sans(15, color: k.ink))),
          ],
        ),
      ],
    );
  }
}

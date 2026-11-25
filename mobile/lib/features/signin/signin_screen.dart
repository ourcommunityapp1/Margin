// Sign in with a code sent by email (src/app/heir/ui/signin.tsx). Copy matches the website.

import 'package:flutter/gestures.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../data/config.dart';
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
  final _password = TextEditingController();
  bool _sent = false;
  bool _busy = false;
  String _error = '';

  @override
  void dispose() {
    _email.dispose();
    _code.dispose();
    _password.dispose();
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

  Future<void> _withPassword() async {
    if (_busy || _password.text.isEmpty) return;
    setState(() {
      _busy = true;
      _error = '';
    });
    try {
      await ref.read(authProvider).signInWithPassword(_email.text, _password.text);
    } catch (_) {
      if (mounted) setState(() => _error = 'That password didn’t work.');
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
                    // Only for the store reviewers' account, which can't receive an emailed code.
                    if (_email.text.trim().toLowerCase() == Config.reviewerEmail) ...[
                      const SizedBox(height: 18),
                      const KLabel('Password'),
                      const SizedBox(height: 12),
                      KTextField(controller: _password, label: 'Password', obscureText: true, textInputAction: TextInputAction.go, onSubmitted: (_) => _withPassword()),
                      const SizedBox(height: 12),
                      KButton('Sign in with password', quiet: true, busy: _busy, busyLabel: 'Signing in…', onPressed: _withPassword),
                    ],
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
            const _AgeNote(),
          ],
        ),
      ],
    );
  }
}

/// What signing in means (the same line as the website's sign-in): confirms 13+, and a profile is made for the account.
class _AgeNote extends StatefulWidget {
  const _AgeNote();

  @override
  State<_AgeNote> createState() => _AgeNoteState();
}

class _AgeNoteState extends State<_AgeNote> {
  late final TapGestureRecognizer _tap = TapGestureRecognizer()..onTap = () => launchUrl(Uri.parse('https://katekize.com/privacy'), mode: LaunchMode.externalApplication);

  @override
  void dispose() {
    _tap.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final style = sans(13, color: k.muted, height: 1.5);
    return Text.rich(
      TextSpan(
        style: style,
        children: [
          const TextSpan(text: 'By signing in you confirm you\u2019re 13 or older. Your account gets a profile so friends can find you; you can change that any time on Your profile. '),
          TextSpan(text: 'How Katekize uses it', recognizer: _tap, style: style.copyWith(decoration: TextDecoration.underline)),
          const TextSpan(text: '.'),
        ],
      ),
    );
  }
}

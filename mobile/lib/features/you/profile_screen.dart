// Your profile (src/app/heir/ui/social.tsx ProfileScreen): name, username, city, and who can find you. Wording matches
// the website. Children in the family are never searchable and never shown.

import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../data/social.dart';
import '../../engine/types.dart';
import '../../state/auth.dart';
import '../../state/household.dart';
import '../../state/social.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import '../lesson/step_frame.dart' show WellButton;

enum _Avail { idle, checking, free, taken, bad }

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key, this.next});

  /// Where to go after making a profile for the first time (for example from a friend's invite).
  final String? next;

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _first = TextEditingController(), _last = TextEditingController(), _username = TextEditingController();
  final _city = TextEditingController(), _region = TextEditingController();
  bool _loaded = false, _creating = false, _discoverable = true, _fof = true, _ageOk = false, _busy = false, _saved = false, _confirmDelete = false;
  MyProfile? _profile;
  _Avail _avail = _Avail.idle;
  String _availNote = '', _error = '';
  Timer? _timer;
  int _check = 0;

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (final c in [_first, _last, _username, _city, _region]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    final api = ref.read(socialApiProvider);
    if (api == null) return;
    try {
      final p = await api.getProfile();
      if (!mounted) return;
      setState(() {
        _profile = p;
        _creating = p == null;
        _loaded = true;
        if (p != null) {
          _first.text = p.firstName;
          _last.text = p.lastName;
          _username.text = p.username;
          _city.text = p.city ?? '';
          _region.text = p.region ?? '';
          _discoverable = p.discoverable;
          _fof = p.fofVisible;
        } else {
          final adult = ref.read(householdProvider).members.where((m) => m.track == Track.adult).firstOrNull;
          if (adult != null) _first.text = adult.name.trim().split(RegExp(r'\s+')).first;
        }
      });
    } catch (_) {
      if (mounted) setState(() => _error = 'Couldn’t load your profile. Check your connection.');
    }
  }

  // Checks the username as it's typed.
  void _usernameChanged(String raw) {
    final name = raw.trim();
    _timer?.cancel();
    final mine = _profile?.username;
    if (name.isEmpty || name == mine) {
      setState(() {
        _avail = _Avail.idle;
        _availNote = '';
      });
      return;
    }
    final bad = usernameProblem(name);
    if (bad != null) {
      setState(() {
        _avail = _Avail.bad;
        _availNote = bad;
      });
      return;
    }
    setState(() => _avail = _Avail.checking);
    final mark = ++_check;
    _timer = Timer(const Duration(milliseconds: 400), () async {
      try {
        final free = await ref.read(socialApiProvider)!.usernameFree(name);
        if (!mounted || mark != _check) return;
        setState(() {
          _avail = free ? _Avail.free : _Avail.taken;
          _availNote = free ? 'Available' : '@$name is taken. Try @${name}_2';
        });
      } catch (_) {
        if (mounted && mark == _check) {
          setState(() {
            _avail = _Avail.idle;
            _availNote = '';
          });
        }
      }
    });
  }

  bool get _ready => _first.text.trim().isNotEmpty && _last.text.trim().isNotEmpty && usernameProblem(_username.text) == null && _avail != _Avail.taken && (!_creating || _ageOk);

  Future<void> _save() async {
    final api = ref.read(socialApiProvider);
    if (api == null) return;
    setState(() {
      _busy = true;
      _error = '';
      _saved = false;
    });
    try {
      final p = await api.saveProfile(ProfileEdit(
        first: _first.text.trim(),
        last: _last.text.trim(),
        username: _username.text.trim(),
        city: _city.text.trim(),
        region: _region.text.trim(),
        discoverable: _discoverable,
        fof: _fof,
        ageOk: _ageOk,
      ));
      if (!mounted) return;
      ref.invalidate(myProfileProvider);
      final wasCreating = _creating;
      setState(() {
        _profile = p;
        _creating = false;
        _saved = true;
        _avail = _Avail.idle;
        _availNote = '';
      });
      final next = widget.next;
      if (wasCreating && next != null && next.startsWith('/')) context.go(next);
    } on SocialFailure catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Couldn’t save. Check your connection and try again.');
    }
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _delete() async {
    final api = ref.read(socialApiProvider);
    if (api == null) return;
    try {
      await api.deleteProfile();
      ref.invalidate(myProfileProvider);
      if (mounted) context.go('/you');
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e is SocialFailure ? e.message : 'Couldn’t delete. Try again.';
          _confirmDelete = false;
        });
      }
    }
  }

  Widget _field(String label, TextEditingController c, {List<String>? hints, int? max, TextCapitalization cap = TextCapitalization.words, ValueChanged<String>? onChanged}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        KLabel(label),
        const SizedBox(height: 6),
        KTextField(controller: c, label: label, autofillHints: hints, maxLength: max, textCapitalization: cap, onChanged: (v) {
          setState(() => _saved = false);
          onChanged?.call(v);
        }),
      ],
    );
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
                  Text(sub, style: sans(13, color: k.muted)),
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
    final signedIn = ref.watch(emailProvider).value != null && ref.watch(accountsProvider);
    final first = _first.text.trim().isEmpty ? 'Landon' : _first.text.trim();
    final last = _last.text.trim().isEmpty ? 'Whitlock' : _last.text.trim();
    return KPage(
      bare: true,
      children: [
        Padding(padding: const EdgeInsets.only(top: 8), child: Align(alignment: Alignment.centerLeft, child: KBack(onPressed: () => context.canPop() ? context.pop() : context.go('/you')))),
        Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Semantics(header: true, child: Text('Your profile', style: serif(30, weight: FontWeight.w500, color: k.ink)))),
        if (!signedIn)
          Text('Sign in to make a profile.', style: sans(16, color: k.muted))
        else if (!_loaded)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Text(_error.isNotEmpty ? _error : 'Loading…', style: sans(16, color: _error.isNotEmpty ? k.miss : k.muted)),
          )
        else ...[
          KCard.column(
            gap: 12,
            children: [
              _field('First name', _first, hints: const ['givenName'], max: 40),
              _field('Last name', _last, hints: const ['familyName'], max: 40),
              Text('Friends see $first $last. Everyone else sees $first ${last[0].toUpperCase()}.', style: sans(13, color: k.muted)),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _field('Username', _username, max: 20, cap: TextCapitalization.none, onChanged: _usernameChanged),
                  const SizedBox(height: 6),
                  Text(
                    _avail == _Avail.checking ? 'Checking…' : (_availNote.isNotEmpty ? _availNote : '3 to 20 letters, numbers or underscores. No two people can have the same one.'),
                    style: sans(13, color: _avail == _Avail.free ? k.good : (_avail == _Avail.taken || _avail == _Avail.bad) ? k.miss : k.muted),
                  ),
                ],
              ),
              _field('City (optional)', _city, hints: const ['addressCity'], max: 60),
              _field('State', _region, hints: const ['addressState'], max: 30),
            ],
          ),
          KCard.column(
            gap: 14,
            children: [
              _toggle('Let people find me', 'In search, by name or username', _discoverable, (v) => setState(() {
                    _discoverable = v;
                    _saved = false;
                  })),
              _toggle('Friends of friends see my rank', 'On the community board', _fof, (v) => setState(() {
                    _fof = v;
                    _saved = false;
                  })),
              if (_creating) _toggle('I’m 13 or older', 'Needed to make a profile', _ageOk, (v) => setState(() => _ageOk = v)),
            ],
          ),
          Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Text('Children in your family are never searchable and never shown to anyone.', style: sans(13, color: k.muted))),
          if (_error.isNotEmpty) Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Text(_error, style: sans(15, color: k.miss))),
          if (_saved) Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Text('Saved.', style: sans(15, color: k.good))),
          KButton(_creating ? 'Make my profile' : 'Save', busy: _busy, busyLabel: 'Saving…', onPressed: _ready ? _save : null),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Text('Your name, username and place are what friends and search can see.', style: sans(13, color: k.muted, height: 1.5)),
          ),
          if (!_creating)
            KCard.column(
              gap: 10,
              children: [
                if (!_confirmDelete)
                  KButton('Delete my profile', quiet: true, onPressed: () => setState(() => _confirmDelete = true))
                else ...[
                  Text('Delete your profile? You’ll disappear from search, and your friendships and requests end. Your lessons and progress are not touched.', style: sans(15, color: k.ink, height: 1.5)),
                  Row(
                    children: [
                      Expanded(child: WellButton('Keep it', onPressed: () => setState(() => _confirmDelete = false))),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Material(
                          color: k.miss,
                          borderRadius: BorderRadius.circular(KSize.cardRadius),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(KSize.cardRadius),
                            onTap: _delete,
                            child: SizedBox(height: KSize.buttonHeight, child: Center(child: Text('Delete', style: sans(16, weight: FontWeight.w600, color: k.card, height: 1)))),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
        ],
      ],
    );
  }
}

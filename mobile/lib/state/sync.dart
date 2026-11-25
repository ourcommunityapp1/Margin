// Keeping the phone and the account together (the sync parts of src/app/heir/ui/provider.tsx).
//
// The household and progress always live on the phone. When signed in, they are also kept in the account:
//   - on sign-in (and when the app comes back to the front) the account's copy is READ and merged into the phone's:
//     progress is merged, never overwritten, so a lesson done on another phone is kept;
//   - after a change on this phone, the change is WRITTEN to the account (a moment later, so quick changes go together).
// Reading is always on. Writing only happens when it is switched on (Config.syncWrites), because it changes the live data
// the website uses too.

import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../data/account.dart';
import '../data/config.dart';
import '../data/household.dart';
import '../data/sync_rules.dart';
import '../engine/memory.dart' show setPersonCal, setPopulationCal;
import '../engine/progress.dart';
import 'auth.dart';
import 'household.dart';

enum SyncState { local, synced, saving, offline }

/// Where syncing stands, for the You screen.
class SyncInfo {
  const SyncInfo(this.state, {this.note, this.summary});
  final SyncState state;

  /// A plain sentence about anything the person should know ("not uploaded: saving is switched off").
  final String? note;

  /// What the account holds, after a read ("Landon: 41 answers").
  final String? summary;
}

/// Whether writing to the account is on. Tests override this.
final syncWritesProvider = Provider<bool>((ref) => Config.syncWrites);

/// The account database, or null without accounts. Tests override this with a fake.
final accountApiProvider = Provider<AccountApi?>((ref) {
  if (!ref.watch(authProvider).accounts) return null;
  return SupabaseAccountApi(Supabase.instance.client, ref.read(storeProvider));
});

class SyncController extends Notifier<SyncInfo> {
  RemoteHousehold? _remote;
  Timer? _householdTimer, _progressTimer;
  int _epoch = 0;

  AccountApi? get _api => ref.read(accountApiProvider);
  bool get _writes => ref.read(syncWritesProvider);
  String? get _email => ref.read(authProvider).email;

  @override
  SyncInfo build() {
    ref.onDispose(() {
      _householdTimer?.cancel();
      _progressTimer?.cancel();
    });
    ref.listen<AsyncValue<String?>>(emailProvider, (_, next) {
      if (next.hasValue) arrive(next.value);
    });
    // The first look, once the app is up (the session may already be saved on the phone).
    Future.microtask(() {
      final email = _email;
      // Unless a read has already begun (the sign-in listener or a refresh got there first).
      if (email != null && _epoch == 0) arrive(email);
    });
    return const SyncInfo(SyncState.local);
  }

  /// Someone signed in (or was already): read the account and bring it together with the phone.
  Future<void> arrive(String? email) async {
    final api = _api;
    if (api == null) return;
    final mine = ++_epoch;
    if (email == null) {
      _remote = null;
      state = const SyncInfo(SyncState.local);
      return;
    }
    try {
      final found = await api.loadRemote();
      if (mine != _epoch) return;
      final pick = chooseOnSignIn(ref.read(householdProvider), found?.household);
      _remote = found;
      if (pick.upload) {
        if (!_writes) {
          state = const SyncInfo(SyncState.local, note: 'This phone has a family your account doesn’t have yet. It has not been uploaded: saving to your account is switched off.');
          return;
        }
        state = const SyncInfo(SyncState.saving);
        _remote = await api.saveRemote(pick.household, found);
        if (mine != _epoch) return;
      }
      ref.read(householdProvider.notifier).replaceFromRemote(pick.household);
      if (_remote != null) {
        await _pull();
        if (mine != _epoch) return;
        // The model's fitted corrections, before anything is ranked.
        final cal = await api.loadCalibration(activeMember(pick.household)?.id);
        setPopulationCal(cal.population);
        setPersonCal(cal.person);
      }
      state = SyncInfo(SyncState.synced, summary: _summary());
    } catch (e) {
      if (mine != _epoch) return;
      state = SyncInfo(SyncState.offline, note: 'Couldn’t reach your account. Changes are kept on this phone.', summary: e.runtimeType.toString());
    }
  }

  /// A short account of what the family holds, to show what a read found.
  String _summary() {
    final h = ref.read(householdProvider);
    final p = ref.read(progressProvider);
    final lines = [for (final m in h.members) '${m.name}: ${memberProgress(p, m.id).log.length} answers, ${memberProgress(p, m.id).days.length} days'];
    return lines.isEmpty ? 'No one in the account yet' : lines.join(' · ');
  }

  /// The account's progress for these people, merged with this phone's. The merged copy is kept on the phone, and (when
  /// writing is on) sent back wherever the phone had something the account didn't.
  Future<void> _pull() async {
    final api = _api, remote = _remote;
    if (api == null || remote == null) return;
    final memberIds = remote.household.members.map((m) => m.id).toList();
    final local = ref.read(progressProvider);
    final theirs = await api.loadProgressRows(remote.householdId);
    final merged = <String, MemberProgress>{...local};
    final send = <String, MemberProgress>{};
    for (final id in memberIds) {
      final a = local[id], b = theirs[id];
      final m = a != null && b != null ? mergeProgress(b, a) : (a ?? b);
      if (m == null) {
        merged.remove(id);
        continue;
      }
      merged[id] = m;
      if (b == null || !sameProgress(b, m)) send[id] = m;
    }
    // People removed within the last 30 days still have progress on the account: bring it in, so "Bring back a removed
    // person" can restore them from any phone.
    for (final e in theirs.entries) {
      if (!memberIds.contains(e.key) && !merged.containsKey(e.key)) merged[e.key] = e.value;
    }
    ref.read(progressProvider.notifier).replaceFromRemote(merged);
    if (send.isNotEmpty && _writes) await api.saveProgressRows(remote.householdId, send);
  }

  /// Back on the app (another phone may have saved a lesson): bring the account's progress in.
  Future<void> refresh() async {
    if (_api == null || _remote == null || _email == null) return;
    try {
      await _pull();
      state = SyncInfo(SyncState.synced, summary: _summary());
    } catch (_) {
      state = const SyncInfo(SyncState.offline, note: 'Couldn’t reach your account. Changes are kept on this phone.');
    }
  }

  // ── Changes made on this phone ──

  void householdChanged(Household h) {
    final api = _api;
    if (api == null || _email == null || !_writes) return;
    state = const SyncInfo(SyncState.saving);
    _householdTimer?.cancel();
    _householdTimer = Timer(const Duration(milliseconds: 600), () async {
      try {
        _remote = await api.saveRemote(h, _remote);
        state = SyncInfo(SyncState.synced, summary: state.summary);
      } catch (_) {
        state = const SyncInfo(SyncState.offline, note: 'Couldn’t reach your account. Changes are kept on this phone.');
      }
    });
  }

  void progressChanged() {
    final api = _api;
    if (api == null || _email == null || _remote == null || !_writes) return;
    state = const SyncInfo(SyncState.saving);
    _progressTimer?.cancel();
    _progressTimer = Timer(const Duration(milliseconds: 800), () async {
      final remote = _remote;
      if (remote == null) return;
      try {
        final ids = remote.memberRows.map((m) => m.id).toSet();
        final mine = {for (final e in ref.read(progressProvider).entries) if (ids.contains(e.key)) e.key: e.value};
        final saved = await api.saveProgressRows(remote.householdId, mine);
        // Bring in anything another phone added, without undoing changes made while this was saving.
        final cur = ref.read(progressProvider);
        final out = {...cur};
        for (final e in saved.entries) {
          out[e.key] = out[e.key] != null ? mergeProgress(out[e.key]!, e.value) : e.value;
        }
        ref.read(progressProvider.notifier).replaceFromRemote(out);
        state = SyncInfo(SyncState.synced, summary: state.summary);
      } catch (_) {
        state = const SyncInfo(SyncState.offline, note: 'Couldn’t reach your account. Changes are kept on this phone.');
      }
    });
  }

  /// Signing out also clears this phone's family (the website does the same), so the next person starts fresh.
  Future<void> signOut() async {
    await ref.read(authProvider).signOut();
    ref.read(householdProvider.notifier).replaceFromRemote(emptyHousehold());
    _remote = null;
  }
}

final syncProvider = NotifierProvider<SyncController, SyncInfo>(SyncController.new);

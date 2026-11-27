// The app's side of the account database (src/app/heir/ui/cloud.ts): loading the family and progress, and saving them.
// Behind an interface so tests use a fake instead of the real database.
//
// READS and WRITES are kept apart on purpose. The reads (`loadRemote`, `loadProgressRows`, `loadCalibration`) only look
// at rows the signed-in account is allowed to see. The writes (`saveRemote`, `saveProgressRows`) change the live
// database; the sync controller only calls them when writing is switched on (see Config.syncWrites).

import 'dart:convert';

import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../engine/dayplan.dart' show dayEvents;
import '../engine/memory.dart' show Cal;
import '../engine/progress.dart';
import 'household.dart';
import 'store.dart';
import 'sync_rules.dart';

/// The account's household as stored.
class RemoteHousehold {
  const RemoteHousehold({required this.householdId, required this.household, required this.memberRows});
  final String householdId;
  final Household household;
  final List<MemberRow> memberRows;
}

abstract interface class AccountApi {
  // ── Reads ──

  /// The signed-in account's own household, or null if it has none.
  Future<RemoteHousehold?> loadRemote();

  /// The account's progress, one entry per person.
  Future<Map<String, MemberProgress>> loadProgressRows(String householdId);

  /// The model's fitted corrections (population-wide, and this person's own once there are enough answers).
  Future<({Cal? population, Cal? person})> loadCalibration(String? memberId);

  // ── Writes (live database) ──

  /// Writes the whole household. Small enough that sending it all is simpler and safer than tracking edits.
  Future<RemoteHousehold> saveRemote(Household h, RemoteHousehold? known);

  /// Merges these people's progress with the account's and saves the result there. Returns what was saved.
  Future<Map<String, MemberProgress>> saveProgressRows(String householdId, Map<String, MemberProgress> mine);
}

const _modelVersion = 'fsrs6-default-v1';
const _sentKey = 'heir-answers-sent-v1';

class SupabaseAccountApi implements AccountApi {
  SupabaseAccountApi(this._db, this._store);
  final SupabaseClient _db;
  final Store _store;

  /// Card events already sent this run.
  final _sentEvents = <String>{};

  // ───────────────────────────── Reads ─────────────────────────────

  @override
  Future<RemoteHousehold?> loadRemote() async {
    final me = _db.auth.currentUser?.id;
    if (me == null) return null;
    final hh = await _db.from('heir_households').select('id, plan, active_member_id').eq('owner_id', me).maybeSingle();
    if (hh == null) return null;
    final members = await _db.from('heir_members').select('id, household_id, name, track, created_at').eq('household_id', hh['id'] as String).isFilter('deleted_at', null);
    final rows = [for (final m in members) MemberRow.fromJson(m)];
    final household = fromRows(
      HouseholdRow(id: hh['id'] as String, plan: (hh['plan'] as Map?)?.cast<String, dynamic>(), activeMemberId: hh['active_member_id'] as String?),
      rows,
    );
    return RemoteHousehold(householdId: hh['id'] as String, household: household, memberRows: rows);
  }

  @override
  Future<Map<String, MemberProgress>> loadProgressRows(String householdId) async {
    final data = await _db.from('heir_progress').select('member_id, data').eq('household_id', householdId);
    return parseProgress(jsonEncode({for (final r in data) r['member_id'] as String: r['data']}));
  }

  @override
  Future<({Cal? population, Cal? person})> loadCalibration(String? memberId) async {
    try {
      final data = await _db.from('heir_model_params').select('scope, member_id, a, b').eq('model_version', _modelVersion).order('fitted_at', ascending: false).limit(30);
      Cal? pick(bool Function(Map<String, dynamic>) f) {
        for (final r in data) {
          if (f(r)) return Cal((r['a'] as num).toDouble(), (r['b'] as num).toDouble());
        }
        return null;
      }

      return (
        population: pick((r) => r['scope'] == 'population'),
        person: memberId == null ? null : pick((r) => r['scope'] == 'member' && r['member_id'] == memberId),
      );
    } catch (_) {
      // A missing table or no fit yet means none.
      return (population: null, person: null);
    }
  }

  // ───────────────────────────── Writes ─────────────────────────────

  @override
  Future<RemoteHousehold> saveRemote(Household h, RemoteHousehold? known) async {
    var householdId = known?.householdId;
    if (householdId == null) {
      final row = await _db.from('heir_households').insert({'plan': h.plan?.toJson(), 'active_member_id': h.activeMemberId}).select('id').single();
      householdId = row['id'] as String;
    }
    final rows = toRows(h, householdId);
    if (rows.members.isNotEmpty) {
      // deleted_at: null also brings back a person who was removed (their row, and so their progress, is still there).
      await _db.from('heir_members').upsert([for (final m in rows.members) {...m.toJson(), 'deleted_at': null}]);
    }
    // A removed person is only marked removed, so their lessons, stones and days stay for 30 days and can be brought back.
    final gone = removedMemberIds(known?.memberRows ?? const [], h);
    if (gone.isNotEmpty) {
      await _db.from('heir_members').update({'deleted_at': DateTime.now().toUtc().toIso8601String()}).inFilter('id', gone);
    }
    await _db.from('heir_households').update({
      'plan': rows.household.plan,
      'active_member_id': rows.household.activeMemberId,
      'tz': await _timeZone(),
      'updated_at': DateTime.now().toUtc().toIso8601String(),
    }).eq('id', householdId);
    return RemoteHousehold(householdId: householdId, household: h, memberRows: rows.members);
  }

  @override
  Future<Map<String, MemberProgress>> saveProgressRows(String householdId, Map<String, MemberProgress> mine) async {
    if (mine.isEmpty) return {};
    final theirs = await loadProgressRows(householdId);
    final merged = {for (final e in mine.entries) e.key: theirs[e.key] != null ? mergeProgress(withoutFutureToday(theirs[e.key]!), e.value) : e.value};
    final changed = [for (final id in mine.keys) if (theirs[id] == null || !sameProgress(theirs[id]!, merged[id]!)) id];
    if (changed.isNotEmpty) {
      final at = DateTime.now().toUtc().toIso8601String();
      await _db.from('heir_progress').upsert([for (final id in changed) {'member_id': id, 'household_id': householdId, 'data': merged[id]!.toJson(), 'updated_at': at}]);
    }
    // Every answer also goes up as its own row. A failure here never fails the save above: sent again next time.
    try {
      await _sendAnswers(householdId, merged);
    } catch (_) {}
    try {
      await _sendEvents(householdId, merged);
    } catch (_) {}
    return merged;
  }

  Map<String, String> _readSent() {
    try {
      return (jsonDecode(_store.read(_sentKey) ?? '{}') as Map).cast<String, String>();
    } catch (_) {
      return {};
    }
  }

  /// Sends answers this phone hasn't sent yet. Sending one twice is harmless (same id, ignored).
  Future<void> _sendAnswers(String householdId, Map<String, MemberProgress> progress) async {
    final sent = _readSent();
    for (final e in progress.entries) {
      final fresh = unsent(e.value.log, sent[e.key] ?? '');
      if (fresh.isEmpty) continue;
      final rows = toAnswerRows(householdId, e.key, fresh);
      for (var i = 0; i < rows.length; i += 400) {
        await _db.from('heir_answers').upsert(rows.sublist(i, i + 400 > rows.length ? rows.length : i + 400), onConflict: 'id', ignoreDuplicates: true);
      }
      sent[e.key] = fresh.last.at;
      await _store.write(_sentKey, jsonEncode(sent));
    }
  }

  /// What happened to each recommended card on Today (shown, opened, finished). Sent once each.
  Future<void> _sendEvents(String householdId, Map<String, MemberProgress> progress) async {
    final rows = [
      for (final e in progress.entries)
        for (final ev in dayEvents(e.value.today)) {...ev.toJson(), 'household_id': householdId, 'member_id': e.key},
    ].where((r) => !_sentEvents.contains('${r['member_id']}|${r['card_id']}|${r['event']}')).toList();
    if (rows.isEmpty) return;
    await _db.from('heir_events').upsert(rows, onConflict: 'member_id,card_id,event', ignoreDuplicates: true);
    for (final r in rows) {
      _sentEvents.add('${r['member_id']}|${r['card_id']}|${r['event']}');
    }
  }

  Future<String?> _timeZone() async {
    try {
      return (await FlutterTimezone.getLocalTimezone()).identifier;
    } catch (_) {
      return null;
    }
  }
}

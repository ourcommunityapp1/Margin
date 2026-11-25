// Turning a household into database rows and back, and answers into rows (src/heir/sync.ts and answers.ts). Pure, so the
// sync rules are tested without a database.

import '../engine/models.dart';
import '../engine/types.dart';
import 'household.dart';

class MemberRow {
  const MemberRow({required this.id, required this.householdId, required this.name, required this.track, required this.createdAt});
  final String id, householdId, name, track, createdAt;

  factory MemberRow.fromJson(Map<String, dynamic> j) => MemberRow(
        id: j['id'] as String,
        householdId: j['household_id'] as String,
        name: j['name'] as String,
        track: j['track'] as String,
        createdAt: j['created_at'] as String,
      );

  Map<String, Object?> toJson() => {'id': id, 'household_id': householdId, 'name': name, 'track': track, 'created_at': createdAt};
}

/// The household row: `plan` is a JSON object or null.
class HouseholdRow {
  const HouseholdRow({required this.id, required this.plan, required this.activeMemberId});
  final String id;
  final Map<String, dynamic>? plan;
  final String? activeMemberId;
}

Plan? planFromJson(Object? v) {
  if (v is! Map) return null;
  final course = v['course'];
  if (course is! String) return null;
  final m = v['minutes'];
  return Plan(course: course, minutes: m is num ? m.toInt() : null);
}

({HouseholdRow household, List<MemberRow> members}) toRows(Household h, String householdId) => (
      household: HouseholdRow(id: householdId, plan: h.plan?.toJson(), activeMemberId: h.activeMemberId),
      members: [for (final m in h.members) MemberRow(id: m.id, householdId: householdId, name: m.name, track: trackName(m.track), createdAt: m.createdAt)],
    );

Household fromRows(HouseholdRow household, List<MemberRow> members) {
  final list = [...members]..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  final people = [for (final m in list) Member(id: m.id, name: m.name, track: m.track == 'child' ? Track.child : Track.adult, createdAt: m.createdAt)];
  final active = people.any((m) => m.id == household.activeMemberId) ? household.activeMemberId : (people.isEmpty ? null : people.first.id);
  return Household(members: people, activeMemberId: active, plan: planFromJson(household.plan));
}

/// Members that exist in the database but not in the household any more: these are marked removed (not deleted).
List<String> removedMemberIds(List<MemberRow> before, Household after) {
  final keep = after.members.map((m) => m.id).toSet();
  return [for (final m in before) if (!keep.contains(m.id)) m.id];
}

/// On first sign-in, a household that only lived on this phone is carried up, unless the account already has one.
({Household household, bool upload}) chooseOnSignIn(Household local, Household? remote) {
  if (remote != null && remote.members.isNotEmpty) return (household: remote, upload: false);
  if (local.members.isNotEmpty) return (household: local, upload: true);
  return (household: remote ?? local, upload: false);
}

// ---- Answers: one row each, so the account keeps the whole history even though the phone trims its copy.

/// Positions of missed words: whole numbers in range, at most 60; null when there are none.
List<int>? _cleanMissed(List<int>? m) {
  final ok = [for (final n in m ?? const <int>[]) if (n >= 0 && n < 400) n].take(60).toList();
  return ok.isEmpty ? null : ok;
}

/// Rows for the `heir_answers` table. Only answers with an id are sent: that id is what makes sending one twice harmless.
List<Map<String, Object?>> toAnswerRows(String householdId, String memberId, List<LogEntry> entries) => [
      for (final e in entries)
        if (e.id != null)
          {
            'id': e.id,
            'household_id': householdId,
            'member_id': memberId,
            'item_id': e.itemId,
            'kind': e.kind,
            'correct': e.correct,
            'misses': e.misses,
            'words': e.words,
            'hints': e.hints < 0 ? 0 : e.hints,
            'ms': e.ms < 0 ? 0 : e.ms,
            'review': e.review,
            'part': e.part,
            'session_at': e.at,
            'local_day': e.day,
            'missed': _cleanMissed(e.missed),
            'p_recall': e.p != null && e.p! >= 0 && e.p! <= 1 ? e.p : null,
            'model_version': e.mv,
          },
    ];

/// Answers newer than the last one this phone sent ([since] is that answer's time), oldest first.
List<LogEntry> unsent(List<LogEntry> entries, String since) =>
    [for (final e in entries) if (e.id != null && e.at.compareTo(since) > 0) e]..sort((a, b) => a.at.compareTo(b.at));

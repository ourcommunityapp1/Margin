// The family on this phone: who is memorizing, who is active, and the shared plan. A port of src/heir/household.ts,
// reading and writing the same JSON the website keeps (ADR-0004), so a household can move between them.
// Pure functions, no storage and no Flutter.

import 'dart:convert';
import 'dart:math' as math;

import '../engine/models.dart' show iso;
import '../engine/types.dart';

class Member {
  const Member({required this.id, required this.name, required this.track, required this.createdAt});
  final String id, name, createdAt;
  final Track track;

  Member copyWith({String? name, Track? track}) => Member(id: id, name: name ?? this.name, track: track ?? this.track, createdAt: createdAt);

  Map<String, Object?> toJson() => {'id': id, 'name': name, 'track': trackName(track), 'createdAt': createdAt};
}

/// What the household is memorizing: a course id from the content, and the daily goal in minutes (5, 15 or 25).
class Plan {
  const Plan({required this.course, this.minutes});
  final String course;
  final int? minutes;

  Map<String, Object?> toJson() => {'course': course, if (minutes != null) 'minutes': minutes};
}

class Household {
  const Household({this.members = const [], this.activeMemberId, this.plan});
  final List<Member> members;
  final String? activeMemberId;
  final Plan? plan;

  Household copyWith({List<Member>? members, String? activeMemberId, bool clearActive = false, Plan? plan}) => Household(
        members: members ?? this.members,
        activeMemberId: clearActive ? null : (activeMemberId ?? this.activeMemberId),
        plan: plan ?? this.plan,
      );

  Map<String, Object?> toJson() => {
        'members': [for (final m in members) m.toJson()],
        'activeMemberId': activeMemberId,
        'plan': plan?.toJson(),
      };
}

Household emptyHousehold() => const Household();

/// Adds someone. The name is tidied (spaces squeezed, 40 characters at most); an empty name adds no one.
Household addMember(Household h, String name, Track track, String id, DateTime now) {
  final clean = name.trim().replaceAll(RegExp(r'\s+'), ' ');
  final short = clean.length > 40 ? clean.substring(0, 40) : clean;
  if (short.isEmpty) return h;
  final member = Member(id: id, name: short, track: track, createdAt: iso(now));
  return Household(members: [...h.members, member], activeMemberId: h.activeMemberId ?? id, plan: h.plan);
}

Household updateMember(Household h, String id, {String? name, Track? track}) => Household(
      members: [
        for (final m in h.members)
          if (m.id == id) m.copyWith(name: (name ?? m.name).trim().isEmpty ? m.name : (name ?? m.name).trim(), track: track) else m,
      ],
      activeMemberId: h.activeMemberId,
      plan: h.plan,
    );

Household removeMember(Household h, String id) {
  final members = h.members.where((m) => m.id != id).toList();
  final active = h.activeMemberId == id ? (members.isEmpty ? null : members.first.id) : h.activeMemberId;
  return Household(members: members, activeMemberId: active, plan: h.plan);
}

Household setActive(Household h, String id) =>
    h.members.any((m) => m.id == id) ? Household(members: h.members, activeMemberId: id, plan: h.plan) : h;

Household setPlan(Household h, Plan plan) {
  final minutes = plan.minutes ?? h.plan?.minutes;
  return Household(members: h.members, activeMemberId: h.activeMemberId, plan: Plan(course: plan.course, minutes: minutes));
}

Member? activeMember(Household h) {
  for (final m in h.members) {
    if (m.id == h.activeMemberId) return m;
  }
  return null;
}

String householdToJson(Household h) => jsonEncode(h.toJson());

/// Reads a stored household defensively: anything malformed becomes an empty household.
Household parseHousehold(String? raw) {
  if (raw == null || raw.isEmpty) return emptyHousehold();
  try {
    final v = jsonDecode(raw);
    if (v is! Map || v['members'] is! List) return emptyHousehold();
    final members = <Member>[
      for (final m in v['members'] as List)
        if (m is Map && m['id'] is String && m['name'] is String)
          Member(
            id: m['id'] as String,
            name: m['name'] as String,
            track: m['track'] == 'child' ? Track.child : Track.adult,
            createdAt: m['createdAt'] is String ? m['createdAt'] as String : '1970-01-01T00:00:00.000Z',
          ),
    ];
    final storedActive = v['activeMemberId'];
    final active = members.any((m) => m.id == storedActive) ? storedActive as String : (members.isEmpty ? null : members.first.id);
    // Older plans named a collection; the Apostles' Creed now lives in the Creeds course.
    final p = v['plan'];
    final named = p is Map ? (p['course'] is String ? p['course'] as String : p['collection'] is String ? p['collection'] as String : null) : null;
    final m = p is Map ? p['minutes'] : null;
    final minutes = m is num && m >= 1 && m <= 120 ? m.toInt() : null;
    final plan = named == null ? null : Plan(course: named == 'apostles-creed' ? 'creeds' : named, minutes: minutes);
    return Household(members: members, activeMemberId: active, plan: plan);
  } catch (_) {
    return emptyHousehold();
  }
}

/// A random version-4 UUID, so ids can be stored as they are when the household syncs (ui/ids.ts).
String newId() {
  final r = math.Random.secure();
  String hex(int n) => List.generate(n, (_) => r.nextInt(16).toRadixString(16)).join();
  return '${hex(8)}-${hex(4)}-4${hex(3)}-${(8 + r.nextInt(4)).toRadixString(16)}${hex(3)}-${hex(12)}';
}

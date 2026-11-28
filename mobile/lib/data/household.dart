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
  const Plan({required this.course, this.minutes, this.removed = const [], this.verses = const [], this.extra = const {}});
  final String course;
  final int? minutes;

  /// Courses taken out of the plan (their progress is kept). The daily course is out of the plan if it is listed here.
  final List<String> removed;

  /// Verses or answers added to the plan on their own (item ids).
  final List<String> verses;

  /// Any other fields a newer website or app saved on the plan: kept as they are, so saving here never drops them.
  final Map<String, Object?> extra;

  Map<String, Object?> toJson() => {
        ...extra,
        'course': course,
        if (minutes != null) 'minutes': minutes,
        if (removed.isNotEmpty) 'removed': removed,
        if (verses.isNotEmpty) 'verses': verses,
      };
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

/// Adds a course to the plan as the daily course (the one new lessons come from). Courses already in the plan stay in it, for
/// reviews; a course that had been removed comes back.
Household setPlan(Household h, Plan plan) {
  final minutes = plan.minutes ?? h.plan?.minutes;
  final removed = (plan.removed.isNotEmpty ? plan.removed : h.plan?.removed ?? const <String>[]).where((id) => id != plan.course).toList();
  final verses = plan.verses.isNotEmpty ? plan.verses : h.plan?.verses ?? const <String>[];
  return Household(
    members: h.members,
    activeMemberId: h.activeMemberId,
    plan: Plan(course: plan.course, minutes: minutes, removed: removed, verses: verses, extra: h.plan?.extra ?? const {}),
  );
}

/// The daily course: where new lessons come from. Null when it has been taken out of the plan.
String? dailyCourse(Plan? plan) => plan != null && !plan.removed.contains(plan.course) ? plan.course : null;

/// Is this course in the plan? The daily course always is; any other is once you've started it, until you remove it.
bool inPlan(Plan? plan, String courseId, bool started) => dailyCourse(plan) == courseId || (started && !(plan?.removed.contains(courseId) ?? false));

/// Takes a course out of the plan (its progress is kept). If it was the daily course, [next] takes over (another course in
/// the plan), else there is none.
Household removeFromPlan(Household h, String courseId, String? next) {
  final plan = h.plan;
  if (plan == null) return h;
  final removed = {...plan.removed, courseId}.where((id) => id != next).toList();
  final course = plan.course == courseId && next != null ? next : plan.course;
  return Household(
    members: h.members,
    activeMemberId: h.activeMemberId,
    plan: Plan(course: course, minutes: plan.minutes, removed: removed, verses: plan.verses, extra: plan.extra),
  );
}

/// Adds one verse or answer to the plan on its own. A household with no plan yet gets one, with this item's course named
/// but taken out, so there is no daily course.
Household addVerse(Household h, String itemId, String courseId) {
  final base = h.plan ?? Plan(course: courseId, removed: [courseId]);
  final verses = {...base.verses, itemId}.toList();
  return Household(
    members: h.members,
    activeMemberId: h.activeMemberId,
    plan: Plan(course: base.course, minutes: base.minutes, removed: base.removed, verses: verses, extra: base.extra),
  );
}

/// Takes one verse or answer out of the plan. (If its course is in the plan it stays in it through the course.)
Household removeVerse(Household h, String itemId) {
  final plan = h.plan;
  if (plan == null) return h;
  return Household(
    members: h.members,
    activeMemberId: h.activeMemberId,
    plan: Plan(course: plan.course, minutes: plan.minutes, removed: plan.removed, verses: plan.verses.where((id) => id != itemId).toList(), extra: plan.extra),
  );
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
    final plan = parsePlan(v['plan']);
    return Household(members: members, activeMemberId: active, plan: plan);
  } catch (_) {
    return emptyHousehold();
  }
}

/// Reads a stored plan leniently (as the website's parseHousehold does): null when it names no course. Fields this app
/// doesn't know are kept in [Plan.extra], so writing the plan back never drops them.
Plan? parsePlan(Object? p) {
  if (p is! Map) return null;
  // Older plans named a collection; the Apostles' Creed now lives in the Creeds course.
  final named = p['course'] is String ? p['course'] as String : p['collection'] is String ? p['collection'] as String : null;
  if (named == null) return null;
  final m = p['minutes'];
  final minutes = m is num && m >= 1 && m <= 120 ? m.toInt() : null;
  final removed = p['removed'] is List ? (p['removed'] as List).whereType<String>().take(40).toList() : const <String>[];
  final verses = p['verses'] is List
      ? (p['verses'] as List).whereType<String>().where((x) => RegExp(r'^[A-Za-z0-9._-]{1,40}$').hasMatch(x)).take(200).toList()
      : const <String>[];
  const known = {'course', 'collection', 'minutes', 'removed', 'verses'};
  final extra = {for (final e in p.entries) if (e.key is String && !known.contains(e.key)) e.key as String: e.value};
  return Plan(course: named == 'apostles-creed' ? 'creeds' : named, minutes: minutes, removed: removed, verses: verses, extra: extra);
}

/// A random version-4 UUID, so ids can be stored as they are when the household syncs (ui/ids.ts).
String newId() {
  final r = math.Random.secure();
  String hex(int n) => List.generate(n, (_) => r.nextInt(16).toRadixString(16)).join();
  return '${hex(8)}-${hex(4)}-4${hex(3)}-${(8 + r.nextInt(4)).toRadixString(16)}${hex(3)}-${hex(12)}';
}

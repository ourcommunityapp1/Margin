// The people side of the account database (src/app/heir/ui/cloud.ts: your profile, and linking two accounts). Behind an
// interface so tests use a fake. Every call goes through a database function that decides what the signed-in person may
// see or change; the app never reads other people's rows except what a link allows (view only).

import 'dart:convert';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../engine/progress.dart';
import 'board.dart';
import '../engine/types.dart';
import 'household.dart';

/// Where invite links point (the website's join page opens them; the phone app will too, once links are set up).
const siteOrigin = 'https://katekize.com';

/// The signed-in person's public profile (what friends and search can see).
class MyProfile {
  const MyProfile({
    required this.username,
    required this.firstName,
    required this.lastName,
    this.city,
    this.region,
    this.discoverable = true,
    this.fofVisible = true,
    this.friendsCount = 0,
  });

  final String username, firstName, lastName;
  final String? city, region;
  final bool discoverable, fofVisible;
  final int friendsCount;

  factory MyProfile.fromJson(Map<String, dynamic> j) => MyProfile(
        username: j['username'] as String? ?? '',
        firstName: j['first_name'] as String? ?? '',
        lastName: j['last_name'] as String? ?? '',
        city: j['city'] as String?,
        region: j['region'] as String?,
        discoverable: j['discoverable'] as bool? ?? true,
        fofVisible: j['fof_visible'] as bool? ?? true,
        friendsCount: (j['friends_count'] as num?)?.toInt() ?? 0,
      );
}

/// What the person typed into the profile form.
class ProfileEdit {
  const ProfileEdit({
    required this.first,
    required this.last,
    required this.username,
    this.city = '',
    this.region = '',
    this.discoverable = true,
    this.fof = true,
    this.ageOk = false,
  });
  final String first, last, username, city, region;
  final bool discoverable, fof, ageOk;
}

/// Another account linked to this one: its family and their progress, for reading only.
class LinkedAccount {
  const LinkedAccount({required this.ownerId, this.plan, this.members = const [], this.progress = const {}});
  final String ownerId;
  final Plan? plan;
  final List<({String id, String name, Track track})> members;
  final Map<String, MemberProgress> progress;
}

enum Relation { none, friend, requested, incoming, me }

Relation _relation(Object? v) => switch (v) {
      'friend' => Relation.friend,
      'requested' => Relation.requested,
      'incoming' => Relation.incoming,
      'me' => Relation.me,
      _ => Relation.none,
    };

/// Someone found by search or opened from a list. What is filled in depends on the relation: the database only
/// returns a friend's streak, words and stones to a friend.
class Person {
  const Person({
    required this.username,
    required this.name,
    this.city,
    this.region,
    this.friendsCount = 0,
    this.mutual = 0,
    this.relation = Relation.none,
    this.friendsSince,
    this.wordsInMemory = 0,
    this.stones,
    this.streak = 0,
    this.lastDay,
    this.courses = const [],
    this.friends = const [],
  });

  final String username, name;
  final String? city, region, friendsSince, lastDay;
  final int friendsCount, mutual, wordsInMemory, streak;
  final Relation relation;

  /// How many of each stone, in order (null when not shown).
  final List<int>? stones;
  final List<({String course, int learned, int total})> courses;
  final List<({String username, String name})> friends;

  Person withRelation(Relation r) => Person(
        username: username,
        name: name,
        city: city,
        region: region,
        friendsCount: friendsCount,
        mutual: mutual,
        relation: r,
        friendsSince: friendsSince,
        wordsInMemory: wordsInMemory,
        stones: stones,
        streak: streak,
        lastDay: lastDay,
        courses: courses,
        friends: friends,
      );

  factory Person.fromJson(Map<String, dynamic> j) => Person(
        username: j['username'] as String? ?? '',
        name: j['name'] as String? ?? '',
        city: j['city'] as String?,
        region: j['region'] as String?,
        friendsCount: (j['friends_count'] as num?)?.toInt() ?? 0,
        mutual: (j['mutual'] as num?)?.toInt() ?? 0,
        relation: _relation(j['relation']),
        friendsSince: j['friends_since'] as String?,
        wordsInMemory: (j['words_in_memory'] as num?)?.toInt() ?? 0,
        stones: (j['stones'] as List?)?.map((e) => (e as num).toInt()).toList(),
        streak: (j['streak'] as num?)?.toInt() ?? 0,
        lastDay: j['last_day'] as String?,
        courses: [
          for (final c in (j['courses'] as List? ?? const []))
            (course: (c as Map)['course'] as String, learned: (c['learned'] as num).toInt(), total: (c['total'] as num).toInt()),
        ],
        friends: [for (final f in (j['friends'] as List? ?? const [])) (username: (f as Map)['username'] as String, name: f['name'] as String)],
      );
}

class FriendRow {
  const FriendRow({required this.username, required this.name, this.city, this.region, this.friendsSince, this.wordsInMemory = 0, this.streak = 0, this.lastDay});
  final String username, name;
  final String? city, region, friendsSince, lastDay;
  final int wordsInMemory, streak;

  factory FriendRow.fromJson(Map<String, dynamic> j) => FriendRow(
        username: j['username'] as String? ?? '',
        name: j['name'] as String? ?? '',
        city: j['city'] as String?,
        region: j['region'] as String?,
        friendsSince: j['friends_since'] as String?,
        wordsInMemory: (j['words_in_memory'] as num?)?.toInt() ?? 0,
        streak: (j['streak'] as num?)?.toInt() ?? 0,
        lastDay: j['last_day'] as String?,
      );
}

class RequestRow {
  const RequestRow({required this.id, required this.username, required this.name, this.city, this.region, this.friendsCount = 0, this.mutual = 0});
  final String id, username, name;
  final String? city, region;
  final int friendsCount, mutual;

  factory RequestRow.fromJson(Map<String, dynamic> j) => RequestRow(
        id: j['id'] as String? ?? '',
        username: j['username'] as String? ?? '',
        name: j['name'] as String? ?? '',
        city: j['city'] as String?,
        region: j['region'] as String?,
        friendsCount: (j['friends_count'] as num?)?.toInt() ?? 0,
        mutual: (j['mutual'] as num?)?.toInt() ?? 0,
      );
}

/// Who a friend invite is from, before it is accepted.
class InvitePeek {
  const InvitePeek(this.status, {this.name, this.username});

  /// ok, friends (already), used, own, or invalid.
  final String status;
  final String? name, username;
}

/// "Franklin, TN"; either part alone; or empty.
String place(String? city, String? region) => [city?.trim(), region?.trim()].where((x) => x != null && x.isNotEmpty).join(', ');

/// "38 friends", "1 friend".
String friendsCount(int n) => '$n ${n == 1 ? 'friend' : 'friends'}';

/// "12-day streak", or when it was last kept.
String streakLine(int streak, String? lastDay, String today) {
  if (streak > 0) return '$streak-day streak';
  if (lastDay == null) return 'No lessons yet';
  final days = DateTime.parse(today).difference(DateTime.parse(lastDay)).inDays;
  return days <= 1 ? 'Last lesson yesterday' : 'Last lesson $days days ago';
}

const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/// "Mar 2026".
String sinceLabel(String? iso) {
  final d = iso == null ? null : DateTime.tryParse(iso)?.toLocal();
  return d == null ? '' : '${_months[d.month - 1]} ${d.year}';
}

/// A message to show when the server turned something down (its own words, which are written for people).
class SocialFailure implements Exception {
  const SocialFailure(this.message);
  final String message;
  @override
  String toString() => message;
}

abstract interface class SocialApi {
  // ── Your profile ──
  Future<MyProfile?> getProfile();
  Future<bool> usernameFree(String name);
  Future<MyProfile> saveProfile(ProfileEdit p);
  Future<void> deleteProfile();

  // ── Linking accounts (a couple): each can view the other's family and progress, and nothing more ──
  /// Makes a single-use invite code, good for a week.
  Future<String> createInvite();

  /// Links this account with the one that made the code. Throws [SocialFailure] saying why not.
  Future<void> acceptInvite(String code);
  Future<void> unlink(String ownerId);
  Future<List<LinkedAccount>> loadLinked();

  // ── Friends (every call goes through a database function that decides what each person may see) ──
  Future<List<Person>> search(String q);
  Future<Person?> viewPerson(String username);
  Future<List<FriendRow>> listFriends();
  Future<({List<RequestRow> incoming, List<RequestRow> outgoing})> listRequests();

  /// Returns 'requested', or 'friends' when they had already asked you.
  Future<String> sendRequest(String username);
  Future<void> answerRequest(String id, bool accept);
  Future<void> cancelRequest(String id);
  Future<void> unfriend(String username);
  Future<void> block(String username);
  Future<void> report(String username, String note);

  /// A single-use friend invite code, good for a week.
  Future<String> createFriendInvite();
  Future<InvitePeek> peekFriendInvite(String code);

  /// Becomes friends with whoever made the code; returns their name.
  Future<String> acceptFriendInvite(String code);

  // ── The community board ──
  Future<Board> getBoard(Period period);
  Future<BoardStatus> getBoardStatus();
  Future<void> markBoardSeen(Period period);
}

class SupabaseSocialApi implements SocialApi {
  SupabaseSocialApi(this._db);
  final SupabaseClient _db;

  Future<T> _call<T>(String fn, [Map<String, dynamic>? args]) async {
    try {
      final data = await _db.rpc(fn, params: args);
      return data as T;
    } on PostgrestException catch (e) {
      throw SocialFailure(e.message.isEmpty ? 'Something went wrong. Try again.' : e.message);
    }
  }

  @override
  Future<MyProfile?> getProfile() async {
    final data = await _call<Object?>('heir_profile_get');
    return data is Map ? MyProfile.fromJson(data.cast<String, dynamic>()) : null;
  }

  @override
  Future<bool> usernameFree(String name) async => (await _call<Object?>('heir_username_free', {'p_name': name})) == true;

  @override
  Future<MyProfile> saveProfile(ProfileEdit p) async {
    final data = await _call<Object?>('heir_profile_save', {
      'p_first': p.first,
      'p_last': p.last,
      'p_username': p.username,
      'p_city': p.city,
      'p_region': p.region,
      'p_discoverable': p.discoverable,
      'p_fof': p.fof,
      'p_age_ok': p.ageOk,
    });
    return MyProfile.fromJson((data as Map).cast<String, dynamic>());
  }

  @override
  Future<void> deleteProfile() async {
    await _call<Object?>('heir_profile_delete');
  }

  @override
  Future<String> createInvite() async => (await _call<Object?>('heir_create_invite')) as String;

  @override
  Future<void> acceptInvite(String code) async {
    await _call<Object?>('heir_accept_invite', {'p_code': code});
  }

  @override
  Future<void> unlink(String ownerId) async {
    await _call<Object?>('heir_unlink', {'p_other': ownerId});
  }

  @override
  Future<List<LinkedAccount>> loadLinked() async {
    final me = _db.auth.currentUser?.id;
    if (me == null) return [];
    final hhs = await _db.from('heir_households').select('id, owner_id, plan').neq('owner_id', me);
    if (hhs.isEmpty) return [];
    final ids = [for (final h in hhs) h['id'] as String];
    final members = await _db.from('heir_members').select('id, household_id, name, track, created_at').inFilter('household_id', ids).isFilter('deleted_at', null).order('created_at');
    final rows = await _db.from('heir_progress').select('member_id, household_id, data').inFilter('household_id', ids);
    final progress = parseProgress(jsonEncode({for (final r in rows) r['member_id'] as String: r['data']}));
    return [
      for (final h in hhs)
        () {
          final mine = [for (final m in members) if (m['household_id'] == h['id']) m];
          final plan = h['plan'];
          return LinkedAccount(
            ownerId: h['owner_id'] as String,
            plan: plan is Map && plan['course'] is String ? Plan(course: plan['course'] as String, minutes: (plan['minutes'] as num?)?.toInt()) : null,
            members: [for (final m in mine) (id: m['id'] as String, name: m['name'] as String, track: m['track'] == 'child' ? Track.child : Track.adult)],
            progress: {for (final m in mine) if (progress[m['id']] != null) m['id'] as String: progress[m['id']]!},
          );
        }(),
    ];
  }

  List<Map<String, dynamic>> _maps(Object? v) => [for (final e in (v as List? ?? const [])) (e as Map).cast<String, dynamic>()];

  @override
  Future<List<Person>> search(String q) async => [for (final m in _maps(await _call<Object?>('heir_search', {'p_q': q}))) Person.fromJson(m)];

  @override
  Future<Person?> viewPerson(String username) async {
    final d = await _call<Object?>('heir_profile_view', {'p_username': username});
    return d is Map ? Person.fromJson(d.cast<String, dynamic>()) : null;
  }

  @override
  Future<List<FriendRow>> listFriends() async => [for (final m in _maps(await _call<Object?>('heir_friends_list'))) FriendRow.fromJson(m)];

  @override
  Future<({List<RequestRow> incoming, List<RequestRow> outgoing})> listRequests() async {
    final d = ((await _call<Object?>('heir_requests_list')) as Map).cast<String, dynamic>();
    return (incoming: [for (final m in _maps(d['incoming'])) RequestRow.fromJson(m)], outgoing: [for (final m in _maps(d['outgoing'])) RequestRow.fromJson(m)]);
  }

  @override
  Future<String> sendRequest(String username) async => (await _call<Object?>('heir_request_send', {'p_username': username})) as String;

  @override
  Future<void> answerRequest(String id, bool accept) async {
    await _call<Object?>('heir_request_answer', {'p_id': id, 'p_accept': accept});
  }

  @override
  Future<void> cancelRequest(String id) async {
    await _call<Object?>('heir_request_cancel', {'p_id': id});
  }

  @override
  Future<void> unfriend(String username) async {
    await _call<Object?>('heir_unfriend', {'p_username': username});
  }

  @override
  Future<void> block(String username) async {
    await _call<Object?>('heir_block', {'p_username': username});
  }

  @override
  Future<void> report(String username, String note) async {
    await _call<Object?>('heir_report', {'p_username': username, 'p_reason': 'abuse', 'p_note': note});
  }

  @override
  Future<String> createFriendInvite() async => (await _call<Object?>('heir_friend_invite_create')) as String;

  @override
  Future<InvitePeek> peekFriendInvite(String code) async {
    final d = await _call<Object?>('heir_friend_invite_peek', {'p_code': code});
    if (d is! Map) return const InvitePeek('invalid');
    return InvitePeek(d['status'] as String? ?? 'invalid', name: d['name'] as String?, username: d['username'] as String?);
  }

  @override
  Future<String> acceptFriendInvite(String code) async {
    final d = await _call<Object?>('heir_friend_invite_accept', {'p_code': code});
    return d is Map ? (d['name'] as String? ?? '') : '';
  }

  @override
  Future<Board> getBoard(Period period) async => Board.fromJson(((await _call<Object?>('heir_board', {'p_period': period.name})) as Map).cast<String, dynamic>());

  @override
  Future<BoardStatus> getBoardStatus() async => BoardStatus.fromJson(((await _call<Object?>('heir_board_status')) as Map).cast<String, dynamic>());

  @override
  Future<void> markBoardSeen(Period period) async {
    await _call<Object?>('heir_board_seen_mark', {'p_period': period.name});
  }
}

// ── Small rules for the profile screens, the same as src/heir/social.ts (the database makes the final call) ──

final _usernameRule = RegExp(r'^[A-Za-z][A-Za-z0-9_]{2,19}$');
const _reserved = ['admin', 'administrator', 'katekize', 'heir', 'support', 'help', 'staff', 'official', 'moderator', 'mod', 'root', 'system', 'null', 'undefined', 'anonymous', 'everyone', 'me', 'you'];

/// Why a username can't be used, or null if it looks fine.
String? usernameProblem(String name) {
  final n = name.trim();
  if (!_usernameRule.hasMatch(n)) return 'Use 3 to 20 letters, numbers or underscores, starting with a letter.';
  if (_reserved.contains(n.toLowerCase())) return 'That name is reserved.';
  return null;
}

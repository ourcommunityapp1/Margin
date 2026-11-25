// The people side of the account database (src/app/heir/ui/cloud.ts: your profile, and linking two accounts). Behind an
// interface so tests use a fake. Every call goes through a database function that decides what the signed-in person may
// see or change; the app never reads other people's rows except what a link allows (view only).

import 'dart:convert';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../engine/progress.dart';
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

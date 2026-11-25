// Who is signed in, and signing in and out by emailed code. Screens use these providers, never Supabase
// directly, so tests can swap in a fake.

import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;

import '../data/cloud.dart';
import '../data/config.dart';

/// Signing in by a code sent by email. A code (rather than a link) keeps sign-in inside the app.
abstract interface class Auth {
  /// True when this build has accounts at all.
  bool get accounts;

  /// The signed-in email, or null.
  String? get email;

  /// Fires whenever someone signs in or out.
  Stream<String?> get changes;

  /// Emails a six-digit code. Throws [AuthFailure] when it can't.
  Future<void> sendCode(String email);

  /// Signs in with the code. Throws [AuthFailure] when the code is wrong or stale.
  Future<void> verifyCode(String email, String code);

  /// Signs in with a password. Only offered for the store reviewers' account (Config.reviewerEmail).
  /// Throws [AuthFailure] when it is wrong.
  Future<void> signInWithPassword(String email, String password);

  Future<void> signOut();
}

class AuthFailure implements Exception {
  const AuthFailure(this.message);
  final String message;
  @override
  String toString() => 'AuthFailure: $message';
}

/// The real thing, through Supabase.
class SupabaseAuth implements Auth {
  sb.SupabaseClient? get _db => cloud();

  @override
  bool get accounts => Config.accounts;

  @override
  String? get email => _db?.auth.currentUser?.email;

  @override
  Stream<String?> get changes =>
      _db?.auth.onAuthStateChange.map((e) => e.session?.user.email) ?? const Stream<String?>.empty();

  @override
  Future<void> sendCode(String email) async {
    final db = _db;
    if (db == null) return;
    try {
      await db.auth.signInWithOtp(email: email.trim(), shouldCreateUser: true);
    } on sb.AuthException catch (e) {
      throw AuthFailure(e.message);
    }
  }

  @override
  Future<void> verifyCode(String email, String code) async {
    final db = _db;
    if (db == null) return;
    try {
      await db.auth.verifyOTP(email: email.trim(), token: code.trim(), type: sb.OtpType.email);
    } on sb.AuthException catch (e) {
      throw AuthFailure(e.message);
    }
  }

  @override
  Future<void> signInWithPassword(String email, String password) async {
    final db = _db;
    if (db == null) return;
    try {
      await db.auth.signInWithPassword(email: email.trim(), password: password);
    } on sb.AuthException catch (e) {
      throw AuthFailure(e.message);
    }
  }

  @override
  Future<void> signOut() async => _db?.auth.signOut();
}

/// The sign-in service. Tests override this with a fake.
final authProvider = Provider<Auth>((ref) => SupabaseAuth());

/// The signed-in email, kept current as people sign in and out. Null when signed out or without accounts.
final emailProvider = StreamProvider<String?>((ref) async* {
  final auth = ref.watch(authProvider);
  yield auth.email;
  yield* auth.changes;
});

/// True when this build has accounts.
final accountsProvider = Provider<bool>((ref) => ref.watch(authProvider).accounts);

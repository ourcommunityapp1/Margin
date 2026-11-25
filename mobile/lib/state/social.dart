// The people side of the account (profile, linked accounts), for screens to use. Tests override [socialApiProvider].

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../data/social.dart';
import 'auth.dart';

/// The social database, or null without accounts.
final socialApiProvider = Provider<SocialApi?>((ref) {
  if (!ref.watch(authProvider).accounts) return null;
  return SupabaseSocialApi(Supabase.instance.client);
});

/// The signed-in person's profile: null when they have not made one yet. Refreshed each time a screen asks afresh
/// (invalidate it after saving or deleting).
final myProfileProvider = FutureProvider.autoDispose<MyProfile?>((ref) async {
  final api = ref.watch(socialApiProvider);
  if (api == null) return null;
  return api.getProfile();
});

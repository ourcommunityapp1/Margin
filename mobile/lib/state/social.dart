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

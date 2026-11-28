// The app's connection to the database (the website's ui/cloud.ts). The sign-in session is kept in the
// phone's secure storage (the iPhone keychain, Android's encrypted storage), not in plain preferences.

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config.dart';

const _storage = FlutterSecureStorage();

/// Keeps Supabase's session in secure storage.
class SecureSessionStorage extends LocalStorage {
  const SecureSessionStorage();

  static const _key = 'katekize.session';

  @override
  Future<void> initialize() async {}

  @override
  Future<bool> hasAccessToken() async => (await _storage.read(key: _key)) != null;

  @override
  Future<String?> accessToken() => _storage.read(key: _key);

  @override
  Future<void> persistSession(String persistSessionString) => _storage.write(key: _key, value: persistSessionString);

  @override
  Future<void> removePersistedSession() => _storage.delete(key: _key);
}

/// Secure storage for the short-lived sign-in verifier Supabase keeps during a sign-in.
class SecureAsyncStorage extends GotrueAsyncStorage {
  const SecureAsyncStorage();

  @override
  Future<String?> getItem({required String key}) => _storage.read(key: 'katekize.$key');

  @override
  Future<void> removeItem({required String key}) => _storage.delete(key: 'katekize.$key');

  @override
  Future<void> setItem({required String key, required String value}) => _storage.write(key: 'katekize.$key', value: value);
}

/// Connects once at start-up. Does nothing when accounts are off.
Future<void> connectCloud() async {
  if (!Config.accounts) return;
  await Supabase.initialize(
    url: Config.supabaseUrl,
    publishableKey: Config.supabaseKey,
    authOptions: const FlutterAuthClientOptions(
      localStorage: SecureSessionStorage(),
      pkceAsyncStorage: SecureAsyncStorage(),
      // Sign-in is by emailed code, never by link, so no link should be read as a sign-in.
      detectSessionInUri: false,
    ),
  );
}

/// The database client, or null when accounts are off.
SupabaseClient? cloud() => Config.accounts ? Supabase.instance.client : null;

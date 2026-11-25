// The app's connection settings: the same Supabase project as katekize.com.
//
// Only the project's address and its publishable key live in the app (AI_GUIDE rule 5). Both are public by
// design (the website ships them to every browser); row-level security on the server decides what anyone can
// read or write. Never put a service key or any other secret here.
//
// For a build against another project:
//   flutter run --dart-define=SUPABASE_URL=https://... --dart-define=SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

abstract final class Config {
  static const supabaseUrl =
      String.fromEnvironment('SUPABASE_URL', defaultValue: 'https://hfhurrvijmuxedsqdplc.supabase.co');
  static const supabaseKey =
      String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY', defaultValue: 'sb_publishable_dyTP4v5FfpStHOzA_J_dCw_IZkp2wmI');

  /// Whether the app may WRITE to the account's database (uploading the family, saving progress, sending answers).
  /// Off by default: reading is always safe, writing changes the live data the website also uses. Turn on for a run with
  ///   flutter run --dart-define=SYNC_WRITES=true
  static const syncWrites = bool.fromEnvironment('SYNC_WRITES');

  /// Accounts are on when both are set (as `heirCloudConfigured` on the website). With them off, the household
  /// stays on the phone and no sign-in is asked for.
  static bool get accounts => supabaseUrl.isNotEmpty && supabaseKey.isNotEmpty;
}

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
  /// On by default, as on the website (decided with the owner after a real test, Nov 25, 2026). To run a build that only
  /// READS the account, e.g. when testing against someone's real data:
  ///   flutter run --dart-define=SYNC_WRITES=false
  static const syncWrites = bool.fromEnvironment('SYNC_WRITES', defaultValue: true);

  /// Accounts are on when both are set (as `heirCloudConfigured` on the website). With them off, the household
  /// stays on the phone and no sign-in is asked for.
  static bool get accounts => supabaseUrl.isNotEmpty && supabaseKey.isNotEmpty;

  /// The one account Apple's and Google's reviewers sign in with (they can't receive an emailed code). Only this address is
  /// offered a password, and the password itself lives only in the store review notes and in Supabase, never in the app.
  static const reviewerEmail = 'appreview@katekize.com';
}

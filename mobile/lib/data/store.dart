// Where the household and progress are kept on the phone: two small JSON strings under the website's own keys.
// Kept behind an interface so tests use memory and the app uses the phone's preferences.

import 'package:shared_preferences/shared_preferences.dart';

abstract interface class Store {
  String? read(String key);
  Future<void> write(String key, String value);
}

/// The phone's own preferences (UserDefaults on iPhone, SharedPreferences on Android).
class PrefsStore implements Store {
  PrefsStore(this._prefs);
  final SharedPreferences _prefs;

  @override
  String? read(String key) => _prefs.getString(key);

  @override
  Future<void> write(String key, String value) async {
    await _prefs.setString(key, value);
  }
}

/// Nothing kept past this run: for tests, and as a fallback if the phone's storage can't be opened.
class MemoryStore implements Store {
  MemoryStore([Map<String, String>? initial]) : _data = {...?initial};
  final Map<String, String> _data;

  @override
  String? read(String key) => _data[key];

  @override
  Future<void> write(String key, String value) async => _data[key] = value;
}

/// Opens the phone's storage, or memory if it can't be opened.
Future<Store> openStore() async {
  try {
    return PrefsStore(await SharedPreferences.getInstance());
  } catch (_) {
    return MemoryStore();
  }
}

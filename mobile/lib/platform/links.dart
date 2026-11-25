// Links to katekize.com that the app understands (ADR-0008): the website keeps its pages under /heir, the app's own paths
// have no such prefix. A link opened in the app (an invite, a person, a course) is mapped to the matching app screen.
// Phones only hand such links to the app once the Apple and Google link files are set up (see docs/app/NATIVE_SETUP.md).

/// The app path for a website path, or null when [uri] is not one of the website's pages.
String? appPathForWebsite(Uri uri) {
  final p = uri.path;
  if (p != '/heir' && !p.startsWith('/heir/')) return null;
  final rest = p == '/heir' || p == '/heir/' ? '/today' : p.substring('/heir'.length);
  // /heir/u?name=jess is a person; the app puts the name in the path.
  if (rest == '/u') {
    final name = uri.queryParameters['name'];
    return name == null || name.isEmpty ? '/friends' : '/u/${Uri.encodeComponent(name)}';
  }
  final query = uri.hasQuery ? '?${uri.query}' : '';
  return '$rest$query';
}

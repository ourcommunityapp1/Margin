import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/platform/links.dart';

void main() {
  String? map(String url) => appPathForWebsite(Uri.parse(url));

  test('website pages map to the app’s own paths', () {
    expect(map('https://katekize.com/heir'), '/today');
    expect(map('https://katekize.com/heir/'), '/today');
    expect(map('https://katekize.com/heir/invite?code=abc'), '/invite?code=abc');
    expect(map('https://katekize.com/heir/join?code=abc'), '/join?code=abc');
    expect(map('https://katekize.com/heir/courses/first-verses'), '/courses/first-verses');
    expect(map('https://katekize.com/heir/friends/requests'), '/friends/requests');
  });

  test('a person’s page puts the name in the path', () {
    expect(map('https://katekize.com/heir/u?name=jess'), '/u/jess');
    expect(map('https://katekize.com/heir/u?name=a%20b'), '/u/a%20b');
    expect(map('https://katekize.com/heir/u'), '/friends');
  });

  test('the app’s own paths and other sites are left alone', () {
    expect(map('/today'), isNull);
    expect(map('/invite?code=abc'), isNull);
    expect(map('https://katekize.com/privacy'), isNull);
    expect(map('/heirloom'), isNull);
  });
}

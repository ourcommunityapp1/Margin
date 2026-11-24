# ADR-0008: Native features

- **Status:** Accepted

| Feature | How | Needs |
|---|---|---|
| **Say it from memory** (speech) | `speech_to_text` plugin: Apple's speech framework on iPhone, Android's speech recognizer. Grading reuses the ported `grade.ts`, including voice-typing forgiveness. | iPhone: microphone and speech usage text in `Info.plist`. Android: the `RECORD_AUDIO` permission. Test with real voices early. |
| **Daily reminder, evening and morning recalls** | `flutter_local_notifications`, scheduled on the phone, so no server is needed | Permission prompt at a sensible moment, after the first lesson, not at launch |
| **Haptics** | Flutter's `HapticFeedback` on right, wrong and finish | Nothing |
| **Share sheet** | `share_plus` for friend invites and course links | Nothing |
| **Invite links open the app** | Universal links (iPhone) and App Links (Android) for `katekize.com/heir/invite`, `/heir/join` and `/u` | An `apple-app-site-association` file and an `assetlinks.json` file served by the website; associated-domains settings in the app |
| **Home Screen widget** | `home_widget` plugin; the app writes today's summary (cards left, minutes, days kept); a small SwiftUI WidgetKit extension and an Android widget show it | Swift and Kotlin code in the widget targets; an app group on iPhone |
| **Later:** push notifications for friend requests | APNs and Firebase Cloud Messaging, sent from a server route | Not in the first release |

**Why these:** each does something the website can't, and they are what reviewers look for.

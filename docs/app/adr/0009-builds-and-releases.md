# ADR-0009: Building and releasing

- **Status:** Accepted

## Context

- The owner has a Mac but is not technical.
- iPhone builds need Xcode on macOS. The AI's cloud workspace is Linux.

## Decision

**Codemagic builds both apps from GitHub.**
- It is a hosted build service with a simple web dashboard.
- A `codemagic.yaml` in the repository (written by the AI) says how to build, sign and upload.
- When the `release` branch moves:
  - the iPhone build goes to TestFlight;
  - the Android build goes to Google Play's internal testing track.
- Signing: the owner connects the Apple and Google accounts in Codemagic once, by following click-by-click steps.

**The Mac is for:**
- installing the apps from TestFlight;
- optionally running the iPhone simulator. If the owner connects the Mac to Claude Code, the AI can run
  `flutter run` and take simulator screenshots itself.

**Version numbers:** `pubspec.yaml` holds the version; the build number goes up on every release automatically.

**Checks before every release build** (in CI):
- the engine fixtures;
- the widget and golden tests;
- `flutter analyze`.

## Consequences

- **The owner never opens Xcode project settings by hand.**
- **Releasing is:** merge to `release`, wait for the build, try it from TestFlight, then press Submit in App Store
  Connect.

# ADR-0001: Flutter for iPhone and Android

- **Status:** Accepted (2026-11-25)

## Context

Katekize is a Next.js web app (a PWA). The owner wants it in the App Store and Google Play.

**Options considered:**
- **Capacitor wrapper** around the website. This is fastest. Apple's guideline 4.2 rejects apps that feel like a
  website, and browser speech recognition doesn't work inside an iOS web view.
- **Native iOS (SwiftUI).** It would feel the most like an iPhone app, and Swift can run the existing TypeScript engine
  through JavaScriptCore. But it gives no Android app.
- **Flutter.** One codebase for both stores.

## Decision

**Flutter (Dart), one codebase for iPhone and Android.** The app lives in `app/` in this repository.

## Consequences

**Good:**
- A real app, so guideline 4.2 is not a concern.
- Android comes with it.
- Native speech, notifications and deep links all have mature plugins.
- Flutter golden tests and the web build let the AI check screens on Linux, without a phone.

**Costs:**
- The engine must be rewritten in Dart, and kept identical to the TypeScript one (see ADR-0003).
- Every screen is rebuilt.
- The Home Screen widget still needs a little Swift (iPhone) and Kotlin (Android).

**Reversible?** Mostly. The back end, data and engine rules don't depend on Flutter.

# ADR-0006: How the app's code is organised

- **Status:** Accepted

## Decision

**Choices:**
- **Riverpod** for state: providers for household, progress, today's plan, profile, board and settings.
- **go_router** for screens, with paths mirroring the website (`/today`, `/lesson`, `/courses/:id`, `/progress`,
  `/friends`, `/u/:name`, `/invite`, `/you`). Invite links (ADR-0008) map onto the same paths.

**Folders:**
```
mobile/
  lib/
    engine/         pure Dart: the ported engine (ADR-0003); no Flutter imports
    content/        loading content.json; Item, Course, Unit types
    data/           Supabase client, sync, on-phone storage, API calls
    state/          Riverpod providers
    features/       one folder per screen group: today/, lesson/, courses/, progress/, friends/, community/,
                    profile/, you/, onboarding/, signin/
    ui/             shared pieces: theme, colours, type, buttons, cards, tags, the window widget
    platform/       speech, notifications, haptics, share, deep links, widget bridge
  assets/           content.json, window images, fonts (Source Serif 4, Inter)
  test/             engine fixtures tests, widget tests, golden screenshots
  integration_test/ full flows on a simulator
fixtures/engine/    shared JSON test cases (written by the website's script)
```

**Look and feel:**
- The website's colours and type are the design system: dark slate cards, peach accent, Source Serif 4 for Scripture
  and headings, Inter for the interface.
- Tokens are defined once in `ui/theme.dart`.

## Consequences

- **The engine is testable on any machine, and the AI can check it without a phone.**
- **Screens can be checked with golden screenshots on Linux,** before anyone opens a phone.

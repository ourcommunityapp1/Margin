# Katekize on the App Store: plan

Status: plan, 2026-11-25. Nothing built yet.

## The approach

Katekize is a Next.js web app (PWA) with a Supabase back end. Three ways to get it into the App Store:

| | What | Time | Review risk | Verdict |
|---|---|---|---|---|
| **A. Capacitor shell, loading katekize.com** | A thin native app (WKWebView) that opens the live site, plus native plugins | Weeks | Highest: Apple's guideline 4.2 rejects apps that feel like a website | Start here, for TestFlight |
| **B. Capacitor shell with the app bundled** | Same shell, but the app's files ship inside it, so it works offline and loads instantly | A few weeks more | Lower: it behaves like an app. Needs the screens that rely on server pages reworked | Where v1 for the store should land |
| **C. Native SwiftUI rewrite** | Rebuild every screen natively | Months | Lowest | No: the memory engine, planner and day plan are TypeScript. A rewrite would duplicate all of it |

**Recommendation:** A for TestFlight, then B for the store, with enough native features that review doesn't see a
repackaged website. The same Capacitor project can produce an Android app later.

## What review will look at, and where we stand

| Requirement | Where we are |
|---|---|
| **4.2 minimum functionality** (more than a website) | At risk. Mitigations below. Other apps have been rejected even with a few native features, so aim for several that matter. |
| **5.1.1(v) account deletion, from inside the app** | **Gap.** "Delete my profile" removes the profile, not the account. We need "Delete my account" that removes the sign-in, the family, progress and answers. |
| **Reviewer sign-in** | **Gap.** Sign-in is an emailed code. A reviewer can't receive it, so we need a demo account that signs in with a fixed code (only for that address). |
| **Sign in with Apple** | Not needed. It's only required when other third-party logins are offered, and we only use email codes. |
| **1.2 user-generated content** | Mostly there: report, block, a contact email, reserved usernames. We should write down how reports are handled (who looks, how fast). Profiles are names and usernames only, no free-text posts. |
| **Privacy policy URL and "privacy nutrition label"** | Policy is live and was updated for practice data. The label must match it: email, name, user ID, usage data and answers, linked to the user, not used for tracking. |
| **Content rights** | **Check.** Verse text is fetched in the NASB. Confirm the publisher's terms allow it in a store app, and what credit line is required. The bundled KJV and the catechism text are public domain. |
| **In-app purchases** | None today. If a paid plan is added later, subscriptions for digital content must use Apple's purchase system. |
| **Age rating** | Answer the questionnaire; the social features and usernames matter. Children are only family members, never searchable, so we avoid the Kids Category (its rules are much stricter). |
| **Export compliance** | HTTPS only: set the standard "no non-exempt encryption" flag. |

## Native features that make it an app

Chosen because each does something the website can't, and we need the first one anyway:

1. **Speech recognition (needed regardless).** The Web Speech API we use for "Say it from memory" is present in
   WKWebView but doesn't work there. A native plugin using Apple's speech framework replaces it. Needs microphone and
   speech permission text, and testing on a real device.
2. **Daily reminders (local notifications).** A reminder at your chosen time, and the evening "When you lie down" and
   morning "When you rise" recalls. No server needed.
3. **Haptics** on right and wrong answers.
4. **Native share sheet** for friend invites.
5. **Universal links:** a friend's invite link opens the app (an apple-app-site-association file on katekize.com),
   and falls back to the website.
6. **A Home Screen widget** showing today's cards and your days kept. Written in Swift (WidgetKit), so it is the
   biggest item and the strongest answer to "why not just use the website".
7. **Later:** push notifications for friend requests; Android.

## Things that need a closer look

- **Offline.** Service workers don't run in a WKWebView unless the site is registered as an "app-bound domain". Bundling
  the app (B) is the reliable fix. Static bundling means the lesson, item and profile pages can't depend on server-side
  rendering; they're already client components but some read search parameters on the server.
- **Sign-in.** The emailed code works in a WKWebView. The code field already offers iOS one-time-code autofill.
- **Sessions.** Sign-in cookies must persist in the shell. Loading the live site (A) keeps them on the same domain.
- **A Mac.** Building for iOS needs Xcode on macOS. We don't have one here. Either yours, or a hosted build service
  (Xcode Cloud, Codemagic, or GitHub's macOS runners). The Capacitor project itself can be made on Linux.
- **Keeping the website and app in step.** With A the app picks up website changes immediately. With B each change that
  touches the bundled files needs a new app release (the memory engine and day plan would ship inside the app).

## Phases

| Phase | Work | Rough effort |
|---|---|---|
| **0. Decisions and accounts** | Apple Developer Program ($99 a year), a Mac or build service, the bundle id (for example `com.katekize.app`), app name, free or paid | A day, plus Apple's approval wait |
| **1. Prerequisites in the web app** | "Delete my account"; reviewer sign-in; the apple-app-site-association file; a support page; a written moderation process; confirm verse text rights | 3 to 4 days |
| **2. The shell** | Capacitor project; icons and launch screen; safe areas and keyboard; links open in Safari; loads katekize.com | 2 to 3 days |
| **3. Native features** | Speech; reminders; haptics; share sheet; universal links | 1 to 2 weeks |
| **4. TestFlight** | A few people on real iPhones; fix what they find. Internal testing needs no review; external testing gets a light beta review. | 1 to 2 weeks |
| **5. The store build** | Bundle the app for offline (B); the widget; screenshots; description; privacy label; review notes with the demo sign-in and a short list of the native features | 2 to 3 weeks |
| **6. Submit** | Review usually takes a few days. If 4.2 comes back, reply in the Resolution Center with the list of native features, and appeal if needed. | A week |

About 6 to 9 weeks end to end, depending mainly on the widget and the bundling.

## Decisions needed

1. **Do you have a Mac,** or should we use a hosted build service?
2. **Widget in the first release,** or after approval? It is the strongest answer to 4.2 and the most work.
3. **Name and bundle id.** Check "Katekize" is free in the App Store.
4. **Free app?** Assumed free, with no purchases.
5. **Verse text:** are you licensed to show the NASB in an app? If not, ship the KJV (and any other text we have rights to).

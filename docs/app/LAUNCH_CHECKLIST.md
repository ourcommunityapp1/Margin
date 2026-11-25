# Launch checklist: from "I bought the accounts" to "submitted"

Verified Nov 25, 2026. Everything that can be done without your accounts is done; this lists what is left, in order.
Detail for each lives in `STORE_PACKAGE.md` (listing text, privacy answers, review notes), `NATIVE_SETUP.md` (invite links) and `ANDROID_SETUP.md`.

## Already checked and working
- iPhone release build compiles (`flutter build ios --release --no-codesign`, 37 MB). Android release bundle builds (72.7 MB, well under limits) and the
  release app launches on the emulator without crashing.
- 141 tests pass. App name, icon (no transparency, as Apple requires), version 1.0.0 (1), export-compliance flag, microphone/speech wording.
- **Apple privacy manifest** (`ios/Runner/PrivacyInfo.xcprivacy`): no tracking; collected data matches the privacy labels in `STORE_PACKAGE.md`.
- **iPhone only** for the first release (iPad turned off), so no iPad screenshots or iPad layout review are needed. Turn it back on later in Xcode
  (Runner target → Supported Destinations) once the app has been checked on an iPad.
- **Associated Domains** entitlement (`applinks:katekize.com`) is already in the project, so you don't add the capability by hand.
- Website live: privacy page, invite page, verse route, and the Delete-my-account route (answers "Sign in first", so it is deployed).
- Android: release signing reads `android/key.properties`; Play icon at `docs/app/store/play-icon-512.png`.

## Apple (do these in order)
1. Enroll in the Apple Developer Program as an individual ($99/yr). Wait for approval (hours to a couple of days). Note your **Team ID** (Membership page).
2. **Netlify → Site settings → Environment variables:** add `APPLE_TEAM_ID` = the Team ID, then redeploy. Check
   https://katekize.com/.well-known/apple-app-site-association now returns JSON (it is 404 today).
3. **Xcode:** open `mobile/ios/Runner.xcworkspace` → Runner → Signing & Capabilities → tick *Automatically manage signing* → choose your Team.
   Xcode registers the app ID and the Associated Domains capability itself.
4. **App Store Connect → Apps → + New App:** iOS, name *Katekize*, language English (US), bundle ID `com.katekize.katekize`, SKU `katekize-ios`.
5. **Make the reviewer account** (5 minutes; steps in `STORE_PACKAGE.md`): `appreview@katekize.com` in Supabase, sign in once on a phone and do one lesson.
6. **Build and upload:** in a terminal `cd mobile && flutter build ipa --release`, then open `build/ios/archive/Runner.xcarchive` in Xcode (Window →
   Organizer) → Distribute App → App Store Connect → Upload. (Or in Xcode: Product → Archive.)
7. **TestFlight:** when the build finishes processing, install it on your iPhone, do a full lesson, try Say-it, a reminder and an invite link. Fix what you find.
8. **Fill in the listing** from `STORE_PACKAGE.md`: description, keywords, URLs, category, price Free, **App Privacy** labels, age rating questionnaire,
   copyright, and under *App Review Information* the review notes and the reviewer sign-in (email + password).
9. **Screenshots:** iPhone 6.9" (the current required size). Ask Claude to capture them from the simulator once you say the look is final.
10. Choose the build, **Add for Review → Submit.** Review usually takes 1 to 2 days.

Mail to send once (Lockman, from `STORE_PACKAGE.md`): tell them katekize.com and the app show NASB text; diary the annual report due end of February.

## Google Play (do these in order; the 14-day test makes this the slower store)
1. Create the Play Console developer account ($25, individual; identity check takes a few days). **Do this first, even before Apple.**
2. Make the upload key and `android/key.properties` (commands in `ANDROID_SETUP.md` step 3). Back up the `.jks` file and passwords.
3. Create the app "Katekize" (App, Free), then complete the **Dashboard checklist**: privacy policy URL (https://katekize.com/privacy), app access
   (reviewer sign-in), ads (none), content rating, target audience (not for children), data safety (same answers as Apple's), news app (no), and
   government/financial/health declarations (none).
4. **Store listing:** text from `STORE_PACKAGE.md`, icon `docs/app/store/play-icon-512.png`, a 1024×500 feature graphic and phone screenshots.
5. `cd mobile && flutter build appbundle --release`; upload `build/app/outputs/bundle/release/app-release.aab` to **Testing → Closed testing**.
6. Personal accounts must run the closed test with **at least 12 testers for 14 days in a row** before Play lets you apply for production. Recruit 12+ friends
   and family now: add their Gmail addresses to a tester list; they join through a link and install. Then apply for production access and publish.
7. After the first upload, Play shows the app-signing certificate fingerprint (Play Console → App integrity). Put that SHA-256 in Netlify as
   `ANDROID_CERT_SHA256` and redeploy so invite links open the Android app.

## Before every later update
Raise the build number in `mobile/pubspec.yaml` (`version: 1.0.0+2`), rebuild, upload.

## Not done, on purpose or for later
- Home Screen widgets (iPhone and Android), iPad layout, and checking speech and reminders on real phones. None blocks submission, but do try Say-it and a
  reminder on a real iPhone in TestFlight (step 7): Apple's reviewers will.
- Android: setup, Today and the start of a lesson run without crashes (debug and release). Sign-in, finishing a lesson, Progress, speech and reminders are unchecked.

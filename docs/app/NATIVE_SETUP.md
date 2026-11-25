# Native setup that needs the Apple and Google accounts

What is built and what still needs an account. Everything here is a one-time job.

## Done in the code already
- Share sheet, haptics, reminders, speech (Phase 5). Microphone and speech wording is in `ios/Runner/Info.plist`.
- Links to katekize.com pages (`/heir/invite`, `/heir/join`, `/heir/u?name=`, `/heir/courses/<id>`) open the matching app screen
  (`lib/platform/links.dart`, `lib/features/friends/join_screen.dart`). They only reach the app once the steps below are done.

## For links to open the app (iPhone)
1. Join the Apple Developer Program ($99 a year, individual). Note the **Team ID** (Membership details page, 10 characters).
2. In Xcode, open `mobile/ios/Runner.xcworkspace` → Runner → Signing & Capabilities: pick the team, then **+ Capability →
   Associated Domains**, and add `applinks:katekize.com`.
3. **The website already serves this file** at `https://katekize.com/.well-known/apple-app-site-association` (`src/heir/applinks.ts`).
   It stays a 404 until you set the Netlify environment variable `APPLE_TEAM_ID` to your Team ID and redeploy. It looks like:
   ```json
   {"applinks":{"details":[{"appIDs":["TEAMID.com.katekize.katekize"],"components":[
     {"/":"/heir/invite*"},{"/":"/heir/join*"},{"/":"/heir/u*"},{"/":"/heir/courses/*"}]}]}}
   ```

## For links to open the app (Android)
1. Make a Google Play Console account ($25 once) and a release signing key; note the key's **SHA-256 fingerprint**.
2. **The website already serves** `https://katekize.com/.well-known/assetlinks.json`. It stays a 404 until you set the Netlify environment
   variable `ANDROID_CERT_SHA256` to the key's fingerprint (several allowed, comma-separated) and redeploy. It looks like:
   ```json
   [{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app",
     "package_name":"com.katekize.katekize","sha256_cert_fingerprints":["YOUR:SHA256:HERE"]}}]
   ```
3. The Android intent filter for `https://katekize.com/heir/...` is already in `AndroidManifest.xml`.

## Home Screen widget (not started)
Needs a WidgetKit extension target in Xcode and an **App Group** (Signing & Capabilities → + Capability → App Groups, for both the
app and the widget), which needs the paid Apple account. The app would write today's summary (cards left, minutes, days kept)
into the group; the widget reads it. Android's widget is separate Kotlin code.

## Not checked on a real phone yet
Speech, the feel of the haptics, reminders arriving on time, and everything Android (no Android SDK on the Mac).

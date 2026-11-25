# Android setup

State on Nov 25, 2026: the SDK and an emulator are installed on the Mac, and the debug app **builds and runs on the Android emulator**
(welcome, name and course-choice screens checked). The rest of the app, sign-in, lessons, speech, reminders and the windows, is not yet
checked on Android. Nothing below needs a paid account until step 5.

## Already done in the code
- Package `com.katekize.katekize`, app name "Katekize", the Katekize "K" icon at every size.
- Permissions: microphone (say-it), notifications, restart-survival for reminders. Speech recognizer visibility (`<queries>`).
- Reminders use inexact alarms, so no "exact alarm" permission (and no extra Play review question) is needed.
- Links from `https://katekize.com/heir/...` are declared (`autoVerify`); they work once `ANDROID_CERT_SHA256` is set (NATIVE_SETUP.md).
- Release signing reads `mobile/android/key.properties` (git-ignored); without it a release build is signed with the debug key.
- `docs/app/store/play-icon-512.png`: the 512×512 icon Google Play asks for.

## 1. Install the tools (about 30 minutes, mostly downloading)
Either install Android Studio (easiest; it fetches the SDK on first launch), or the command-line tools:
```bash
brew install openjdk@17 && brew install --cask android-commandlinetools
export JAVA_HOME=/opt/homebrew/opt/openjdk@17 PATH=/opt/homebrew/opt/openjdk@17/bin:$PATH
sdkmanager "platform-tools" "platforms;android-37.0" "build-tools;36.0.0" "emulator" "system-images;android-36;google_apis;arm64-v8a"
yes | sdkmanager --licenses
flutter config --android-sdk /opt/homebrew/share/android-commandlinetools --jdk-dir $JAVA_HOME
flutter doctor
```
`flutter doctor` should then show the Android toolchain as green.

## 2. Build and run on an emulator
```bash
cd mobile
avdmanager create avd -n pixel -k "system-images;android-36;google_apis;arm64-v8a"   # answer "no" to the hardware-profile question
flutter emulators --launch pixel
flutter run
```
Check, in this order: sign-in, Today, a lesson, say-it (microphone), a reminder, the stained-glass windows (the shader/painting is the
likeliest thing to look different), About. Expect to fix a few Android-only problems the first time.

Build notes: Flutter 3.50 needs Gradle 9.5, Android Gradle Plugin 9.3.1, Kotlin 2.4.20 and Java 17 (set in `mobile/android/`), and a
dependency needs `compileSdk = 37`. The first build downloads a lot and takes 5 to 7 minutes; later ones about 1. If Flutter is upgraded and the
build complains about versions, generate a fresh template (`flutter create --platforms=android -e tmp`) and copy its Gradle versions.
The emulator is slow on first boot and may show "System UI isn't responding": tap Wait.

## 3. Make the upload key (once)
```bash
keytool -genkey -v -keystore ~/katekize-upload.jks -keyalias upload -keyalg RSA -keysize 2048 -validity 10000
```
Keep the `.jks` file and its passwords in your password manager; losing them is painful. Then create `mobile/android/key.properties`
(never commit it):
```
storeFile=/Users/landonwhitlock/katekize-upload.jks
storePassword=...
keyAlias=upload
keyPassword=...
```
Get the fingerprint for invite links: `keytool -list -v -keystore ~/katekize-upload.jks -alias upload | grep SHA256`.
With **Play App Signing** (the default), Google re-signs the app, so use the fingerprint shown in Play Console → App integrity →
App signing (not the upload key's) as `ANDROID_CERT_SHA256` in Netlify.

## 4. Build the release bundle
```bash
cd mobile && flutter build appbundle --release
```
The file is `build/app/outputs/bundle/release/app-release.aab`. Raise `version:` in `pubspec.yaml` (the number after `+`) for every upload.

## 5. Google Play Console (you; $25 once)
1. Create the developer account (individual). New personal accounts must run a **closed test with at least 12 testers for 14 days**
   before production; start this early, it is the long pole.
2. Create the app "Katekize", free, category Education.
3. Fill in **Data safety** and the content rating using `STORE_PACKAGE.md` (same answers as Apple's privacy labels; add the deletion URL
   https://katekize.com/privacy and the in-app path You → Delete my account).
4. Listing text from `STORE_PACKAGE.md`; icon `docs/app/store/play-icon-512.png`; a 1024×500 feature graphic and phone screenshots (still to make).
5. Upload the `.aab` to the closed-test track, add testers, and add the reviewer sign-in (`appreview@katekize.com`) in App access.

## Known gaps
- Home Screen widget on Android is not started (separate Kotlin code).
- Speech on Android uses the system recognizer; it may need an internet connection on some phones. Test with your voice.
- Nothing here has run on a real Android phone.

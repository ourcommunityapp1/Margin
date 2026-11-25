# Store package (Phase 6)

Everything the App Store and Google Play ask for, drafted. The owner approves each item. Items marked **YOU** need your accounts.

## Built in the app
- **Delete my account** (You → Delete my account, signed in only): lists what goes, asks for the word DELETE, calls
  `POST https://katekize.com/api/heir/account/delete`, then clears the phone. The route
  (`src/app/api/heir/account/delete/route.ts`) checks the sign-in token and deletes the auth user with the service key; every table
  cascades from it (family, progress, answers, events, profile, friends, requests, blocks, links). It then recounts former friends'
  friend counts. The privacy page describes it. **Deploy the website change before the app is submitted**, and make sure
  `HEIR_SUPABASE_SERVICE_KEY` is set on the server (the stats route already needs it); without it the app says "isn't switched on yet".
- **Reviewer sign-in:** only `appreview@katekize.com` is offered a password field (hidden until that address is typed).
- **Reporting, blocking, reserved usernames, contact address** (hello@katekize.com): already in the app.
- **Export compliance:** `ITSAppUsesNonExemptEncryption = false` is set in `Info.plist` (HTTPS only).

## YOU: make the reviewer account (5 minutes)
1. Supabase dashboard → project *katekize* → Authentication → Users → **Add user → Create new user**.
2. Email `appreview@katekize.com`, a long random password, tick **Auto Confirm User**. Save the password in your password manager.
3. Sign in once in the app as that account (email, then the password field appears) and set it up like a real user: add a person
   ("Reviewer"), choose a course (e.g. First Verses), do one lesson, and make a profile (name "App Review", username `appreview`).
   Optionally make a second throwaway account and friend them so Friends and Community show something.
4. Put the password in App Store Connect → App Review Information → Sign-in information (never in the repo or the app).

## Review notes (paste into App Review Information → Notes)
> Katekize helps families memorize Scripture, catechism questions and creeds by spaced practice. To sign in, tap "Already set up?
> Sign in", type appreview@katekize.com, and a Password field appears; the password is in the sign-in fields above (normal users
> receive an emailed code). Features: lessons and daily plan (Today), courses, progress with stained-glass windows, friends and a
> community board (users can report and block others; reports are read within 24 hours at hello@katekize.com), reminders
> (Settings → You → Reminders), speaking an answer aloud (microphone and speech recognition, used only while the microphone
> button is active; nothing is recorded or kept), and Delete my account (You → Delete my account). Scripture text (NASB) is
> shown by permission through the YouVersion Platform. Children appear only inside their own family and are never searchable.

## User-generated content process (Apple 1.2)
Users create a username, name and city. Others can **report** (a person's page → Report) or **block** them. Reports arrive in the
`heir_reports` table; the owner (Landon Whitlock, decided Nov 25, 2026) reads them **within 24 hours**, hides or removes accounts that break the rules, and replies to
the reporter if asked. Reserved and offensive usernames are refused when made. Contact: hello@katekize.com.

## Privacy labels (App Store Connect → App Privacy) — must match katekize.com/privacy
Data **collected and linked to the user**, used for **App Functionality** (and **Analytics** only if analytics is turned on):
| Type | Why |
|---|---|
| Email address | Sign-in |
| Name | Profile and family members' names |
| User ID | Account |
| Other user content | Answers to lessons, family names |
| Product interaction | Cards shown/opened/finished, lessons done |
| Coarse location? **No.** The profile's city and state are typed by the user: answer under **Other user content**. |  |
**Tracking: No.** No data is sold, shared with advertisers or used for ads. Microphone/speech: processed on the device by the
phone's own recognizer, **not collected**. Google Play "Data safety": same answers; data is encrypted in transit; users can request
deletion (in-app, and the privacy page URL).

## Age rating
Answer honestly: user-generated content = yes (usernames, friends), unrestricted web access = no, no violence, no mature
themes, religious content = yes (Scripture). Not in the Kids Category. Expect 12+ on Apple (social features). Google: Teen.

## Store listing drafts
- **Name:** Katekize. **Subtitle (30):** Memorize Scripture together
- **Promotional text (170):** Learn Bible verses, catechism questions and creeds a few minutes a day. Lessons adapt to what you remember, and the stained-glass windows light up as you learn.
- **Description:** Katekize helps your family memorize the Word and keep it for good. Each day it plans a short lesson and a review of what is about to fade, using spaced practice so what you learn stays. Choose a course (First Verses, Westminster Shorter Catechism, creeds, and more) and a daily goal from 5 to 30 minutes. Type, fill in blanks, put phrases in order, or say the answer aloud. Watch each course's stained-glass window light up pane by pane, earn stones, and keep your days. Add your children as their own learners (they're never shown outside your family), see your spouse's progress, and memorize alongside friends. Daily reminders are optional and stay on your phone. Free.
- **Keywords (100):** scripture,memorize,bible,verses,catechism,creed,memory,devotion,Westminster,family,prayer,study
- **Support URL:** https://katekize.com **Privacy URL:** https://katekize.com/privacy **Marketing URL:** https://katekize.com
- **Screenshots (YOU, from a real build; I can capture them on the simulator):** iPhone 6.9" (1290×2796) and 6.5" (1284×2778): Today
  with a window card, a lesson step, Progress with windows, Friends/Community, a course window up close. Android phone: 1080×1920 or larger.
- **Category:** Education (primary), Lifestyle (secondary). **Price:** Free. **Copyright:** © 2026 Katekize.

## Content rights: the Lockman Foundation agreement (read Nov 25, 2026)
The owner shared "The Lockman Foundation Free Distribution Permission Agreement" (Fast-Track Bible License v1) for the NASB 1995 / NASB 2020 /
AMP. What it says that matters here:
- **A phone app is covered.** Clause 2 allows the text to be reached "by REQUESTER's mobile application either by live data connection or
  download to the user's device", in an app that uses the YouVersion Platform to access it. (The earlier "pretty sure" is now confirmed by the
  text of the agreement.)
- **Free, and no third-party ads.** Every way the text is shown must be completely free: no access charges or membership fees, and no
  third-party advertising in the app or website. Katekize is free with no ads; keep it that way (no paid tier or ads while NASB is shown).
- **Make bulk copying impractical.** The server only serves the verse chosen for each item (`/api/heir/verse`), one at a time. Keep it so.
- **Attribution.** A clickable link to lockman.org and the copyright notice must be conspicuous. For selected verses the short tag **"NASB 2020"
  after the verse, linking to lockman.org**, is allowed. The app now shows that tag (underlined, tappable) under every NASB verse, and About carries the
  full notice and link. Use the 2020 notice: "Scripture quotations from the New American Standard Bible – NASB 2020, Copyright © 1960, 1971, 1977,
  1995, 2020 by The Lockman Foundation. All rights reserved. Used by permission. https://www.Lockman.org".
- **Owner duties:** (1) tell Lockman the website URLs where the text appears (katekize.com); (2) **send Lockman an annual report by the end of
  February** of how many copies were distributed in the previous calendar year (app downloads plus site users); (3) the agreement cannot be
  transferred or sub-licensed without Lockman's written consent; (4) either side can end it with 30 days' notice, and it ends automatically if
  the conditions aren't met. California law applies.
- **One thing to check with YouVersion:** the agreement says the app must use the YouVersion Platform SDK to access the text. Katekize's server
  calls the YouVersion Platform API and the phone gets the verse from katekize.com. Confirm with YouVersion that this server-side route satisfies
  their terms for an app (the website already works this way).
- **Right now the phone app shows the KJV** (public domain) until the NASB is fetched; with the new change it shows the NASB when online and
  falls back to the KJV offline.

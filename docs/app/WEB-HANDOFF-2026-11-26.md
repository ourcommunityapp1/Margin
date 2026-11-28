# Message for the website session (Nov 26, 2026)

Paste everything below the line into Claude Code for the website.

---

Pull the branch first: `git pull origin claude/sleepy-goldberg-gjg4bh`. The phone app changed today in ways the owner wants on the
website too. This note lists each change, what the app does now, and exactly where the website differs. The app code is the
reference for each one (`mobile/lib/...`); the website files to change are named. Keep the website's own engine and content
untouched unless a section says otherwise.

**Already live on katekize.com** (deployed from this branch on Nov 26 at 17:42 UTC; your later deploys include it): the speech route
`/api/heir/transcribe` and the privacy page's new "Saying an answer aloud" section (section 3). Nothing else below is on the
website yet.

## At a glance

| # | Change | App | Website |
|---|---|---|---|
| 1 | Lesson steps on the open page (no card), no session label, bigger question | ✅ | ❌ to do |
| 2 | Feedback: small callout above a green/coral Continue, no coloured sheet; "Correct!" | ✅ | ❌ to do |
| 3 | Say it from memory through ElevenLabs Scribe with hints | ✅ | ⚠️ route live; the Say step still uses the browser recognizer |
| 4 | Checking puts the keyboard away; a long typed answer stays in view | ✅ | ❌ to do (smaller on the web) |
| 5 | A course page's window lights up pane by pane | ✅ | ❌ to do (one prop) |
| 6 | "My courses" first on Courses | ✅ | ❌ to do |
| 7 | Haptics | ✅ | ➖ app only |
| 8 | Today B4, recalls, strength, photo credits (your Nov 26 handoff) | ✅ ported | ✅ (yours) |
| 9 | "Can't speak now" lasts for the whole session | ✅ (test added) | ✅ already the same; check the mic-refused case |

---

## 1 · Lesson steps on the open page ❌

**Why.** On a phone, the step was a fixed-height card that scrolled inside itself. With the keyboard up it shrank to a small
"window" and cut the answer box in half. The owner chose the open-page layout (no card, like Today's B4).

**What the app does now** (`mobile/lib/features/lesson/step_frame.dart`, `lesson_screen.dart`, `steps.dart`):
- **No card around any step.** The tag, question and step content sit straight on the page and the page scrolls; the step's
  buttons (the dock) stay pinned under it. Applies to every step kind: type, say, order, blanks, first letters, quiz, match, spot.
- **No session label** above the step ("When you rise", "Lesson 3", "Review"). The progress bar and the item tag
  ("Review · Q11", "Lock it in · 2 of 5") stay.
- **The question is larger**: serif 25 px, weight 500, line height 1.3 (was 20 px / 600 inside the card), 10 px under the tag.
- **Step instructions are quieter**: "Type it from memory", "Say it from memory", "Put the words in order", "Fill in the missing
  words", "Type the first letter of each word", "What comes next?", "One word is wrong. Tap it." are now 14 px, weight 600,
  `var(--muted)` (were 16 px ink).
- **The typing field** is a real input box: filled with `var(--card)`, 16 px radius, 1 px `var(--line)` border (ink when focused),
  serif 18 px text, placeholder "Your answer" in muted serif, 3 lines tall to start and growing with the answer.

**Website to change:**
- `src/app/heir/ui/lesson.tsx`, line ~299: the step's `<section className="hr-card" …>` becomes a plain flex column (no
  `hr-card`), same 18 px gap; the page scrolls rather than the card.
- `lesson.tsx` line ~295: remove `{session.label && <span className="hr-label" …>{session.label}</span>}` from the running
  lesson (keep it on the done screen at line ~370).
- The question text in the step header: 25 px serif, 500.
- `src/app/heir/ui/steps.tsx`: the instruction `<p>`s (e.g. lines ~357 "Type it from memory", ~420 "Say it from memory", and
  the order/blanks/letters/next/spot ones) to 14 px, 600, muted. The Type step's textarea to the input style above, `rows={3}`,
  placeholder "Your answer".

## 2 · Answer feedback: callout + coloured Continue ❌

**What the app does now** (`lesson_screen.dart`, `_Feedback`):
- **No coloured sheet.** The feedback sits in the page flow under the step, where the dock was. No green/red panel behind it.
- **Order, top to bottom:** the note ("24 words missing or misspelled. They're underlined."), the reveal (the answer with
  missed words underlined), "You'll get another try at the end." (14 px muted), then a **small callout pill centred right above
  the button**, then **Continue**.
- **The callout pill:** 15 px, weight 700, padding 7 px × 14 px, fully rounded, with a 16 px icon before the word.
  - Right: "✓ Correct!" in `var(--good)` on `var(--good-wash)` (dark theme: #93D3B0 on #1F362B).
  - Close: "! Almost"; wrong: "! Not quite", in `var(--miss)` on `var(--miss-wash)` (dark: #F0A789 on #432A20).
- **Continue takes the colour:** fill `var(--good)` for a right answer, `var(--miss)` otherwise, text #15181B. Same size as
  other primary buttons.
- **Wording:** a right answer always says **"Correct!"** (the rotating "Correct." / "That's right." / "Well done." and the slip's
  "Good." are gone; a slip's note still explains the slip). Close is "Almost", wrong is "Not quite" (no full stops).
- The details scroll on their own if very long (at most 40% of the screen height), so Continue is never pushed off screen.

**Website to change:** `lesson.tsx`: `PRAISE` (line ~31) and `heading` (line ~283) to the wording above; the
`<div className="hr-sheet" data-ok=…>` (line ~344) becomes an in-flow block in the dock's place with the order above, the pill,
and a Continue whose background follows `data-ok`. The `.hr-sheet` styles in `heir.css` can go once nothing uses them.

## 3 · Say it from memory through ElevenLabs ⚠️

**Live on the website already:**
- `POST /api/heir/transcribe?k=…&k=…` (`src/app/api/heir/transcribe/route.ts`). Body: the recording (any audio type). Header
  `Authorization: Bearer <Supabase access token>`. Returns `{ text, words: [{ text, logprob }] }`. 401 signed out, 413 over 4 MB,
  503 `{ unavailable: true }` when speech to text is off or out of credit, 502 for other failures.
- It sends the audio to ElevenLabs Scribe v2 with the `k` values as `keyterms` (cleaned by `src/heir/speech.ts`: at most 50,
  each at most 5 words and 50 characters, no `< > { } [ ] \`). If ElevenLabs refuses the keyterms (400/422) it retries v2
  without them, then v1. Nothing is stored. `ELEVENLABS_API_KEY` is set on the site.
- `src/voice/elevenlabs.ts` `transcribe()` takes `keyterms` (one form part each). Tests: `src/heir/test/speech.test.ts`,
  `src/think/test/stt.test.ts`.
- Privacy page (`src/app/(site)/privacy/page.tsx`, updated Nov 26): names ElevenLabs among the services and explains the
  recording, that children and signed-out use stay on the device, and "Can't speak now, type it".

**What the app does** (`mobile/lib/platform/cloud_speech.dart`, `speech.dart`, `features/lesson/speech_hints.dart`, `steps.dart`):
- **Who uses ElevenLabs:** a signed-in **adult** member. Children and anyone signed out use the device's own recognizer, so a
  child's voice never leaves the device.
- **How:** tap the mic, it records (AAC mono 16 kHz, 2-minute cap); tap again, the text under the mic reads
  **"Checking what you said…"** while it uploads; the words come back and are graded exactly like before (`spokenPass`).
  The recording is deleted once sent. No live words while speaking with ElevenLabs (the device recognizer still shows them).
- **Hints** (`speechHints(text)`): from the answer's own words, only names (capitalised, not at a sentence start, not "I"), old
  words (hath, hast, doth, dost, thee, thou, thy, thine, ye, unto, art, shalt, wilt, saith, spake, shew, begotten, wherefore,
  whereby, wherein, whereof, therein, thereof, thereby, lo, behold, yea, nay, verily, hallowed, trespasses, amen, selah, cometh,
  goeth, giveth, maketh, leadeth, restoreth) and words of 9+ letters; deduplicated, at most 50. **Never the whole answer**, so a
  word the person didn't say isn't "heard" for them. Example: Psalm 23:1–2 gives `Lord, maketh, pastures, leadeth`.
- **Fallback:** if the upload fails (no connection, 401/404/501/503, timeout 25 s), that try says "Couldn't check that. Tap and
  say it again." and the device recognizer is used for the rest of the session.
- The reply is decoded as UTF-8 explicitly (curly apostrophes came out wrong otherwise).

**Website to change:** `src/app/heir/ui/steps.tsx` `Say` (line ~380): for a signed-in adult, record with `MediaRecorder` instead
of `SpeechRecognition` (the Think app's `src/think/client/dictation.ts` "recorder" engine is a working example), POST to
`/api/heir/transcribe` with the session's access token and the hints, show "Checking what you said…", then grade the returned
text as now. Port `speechHints` to `src/heir/speech.ts` next to `cleanTerms` with a test matching the app's. Keep the browser
recognizer for children, signed-out use, browsers without `MediaRecorder`, and after a failed upload.

**Cost note for the owner (already told):** Scribe v2 about $0.20 an hour plus about $0.05 an hour for keyterms (20%). At 15
adults speaking 2–3 minutes a day that is roughly $4–6 a month.

## 4 · Keyboard and long answers ❌ (smaller on the web)

**App:** tapping Check (any step with a text box) dismisses the keyboard so the feedback has room; as a typed answer grows, the
page scrolls so the whole field stays visible above Check.
**Website:** blur the focused input when an answer is checked (`(document.activeElement as HTMLElement)?.blur()` in `report`),
which drops the phone keyboard on mobile browsers; with the card gone (section 1) long answers already flow and scroll.

## 5 · A course page's window lights up ❌ (one prop)

**App:** opening a course you've begun, its window starts dark and lights pane by pane to where you are, in `sweepOrder`, about
2.5 s, each pane fading in over 400 ms, with the gold arc following; dust after. Part windows (Westminster Shorter's three) do
the same. Reduce-motion shows the final state.
**Website:** `src/app/heir/ui/course-list.tsx` line ~108 (`MiniWindow … size={168}`) and line ~135 (the part windows, size 78):
add `reveal` (MiniWindow already supports it on Today).

## 6 · "My courses" first on Courses ❌

**App** (`mobile/lib/features/courses/courses_screen.dart`): a "My courses" label at the top, then one card per course from
`startedCourses(p, track, focus)` (the chosen course first, then every course begun). The shelves follow and **leave out** the
courses already under My courses, so nothing shows twice; an empty shelf is hidden.
**Website:** `src/app/heir/courses/page.tsx`: add the same section above the shelves (the existing "In season" and "Continue"
cards can stay above or fold into it; the owner asked only for My courses at the top), and filter started courses out of the
shelves. A test like the app's (`test/widget/item_test.dart`, "My courses comes first").

## 7 · Haptics ➖ app only

For the record, nothing to do: the app ticks for every pane as a big window lights up (Today's big card, course page, lesson
done), taps more firmly as a question's glass completes, settles at the end, and taps for right/wrong, stones, "Done for today",
word tiles, the microphone, Start and tabs. Switch: You → Vibration. Browsers' vibration support is poor (none on iPhone), so
leave the website without it.

## 8 · Your Nov 26 handoff, ported ✅

Today as one big thing (rise / lesson / night / done, quiet rows, photos with the same `photoFor`, sky moods, row windows
lighting up), recalls from `morningPicks` / `bedtimePicks`, course numbers and per-item strength, the question page's ring,
stats, Practice and Review, and the About photo credits. `docs/app/CHANGES-2026-11-25.md` has the port notes. Two small gaps:
the "hint" glow on a lesson's next pane is not ported; the lesson-done sweep is pane by pane but its timing is the app's
(about 2.5 s after a 0.7 s pause).

## 9 · "Can't speak now" ✅ (check one case)

Both platforms already turn every later Say step in the session into typing, second tries included (the app now has a test).
Not yet handled on either: when the microphone permission is refused, each later Say step still offers the mic first.

---

## Also worth knowing

- **Your new Progress layout** (commits 73dcb83, 58a4811) is not in the app yet; ask the Mac session for it.
- **Website tests:** `TZ=America/Chicago npm run heir:test` has 3 failures that are not from these changes (they fail without
  them too): "a newly learned question comes back after a night's sleep", "a unit's lock-in waits for a night's sleep", "the
  day is worked out in the person's time zone".
- **Deploying:** production is deployed with `netlify deploy --build --prod --site 9fc1ceb0-f8c3-49f7-b040-c28d58c580a5` from
  this branch (the upload-API deploys in the site's history).

## Checklist

- [x] 1 · Steps on the open page, no session label, 25 px question, quiet instructions, new input field
- [x] 2 · Callout pill + green/coral Continue, no sheet; "Correct!" / "Almost" / "Not quite"
- [x] 3 · Say step records and uses `/api/heir/transcribe` for signed-in adults, with `speechHints` (+ test)
- [x] 4 · Blur the input on Check
- [x] 5 · `reveal` on the course page windows
- [x] 6 · My courses first on Courses, not repeated on the shelves (+ test)
- [x] `npm run heir:test`, typecheck and lint, then deploy

## Done on the website (Nov 26, cloud session)
Items 1 to 6 are built and deployed. Notes for anyone comparing with the app:
- **1:** the step is `hr-card hr-open` (the card look is removed in CSS), no session label while a lesson runs (kept on the done screen), question 25 px serif 500,
  instructions 14 px 600 muted (`.hr-instruction`), the typing box serif 18 px, 3 rows to start, placeholder "Your answer", ink border when focused.
- **2:** `.hr-sheet` is gone; the feedback is in the page flow (`.hr-fb`): note, reveal, "You'll get another try at the end.", the pill, then a Continue that is green for a
  right answer and coral otherwise. "Correct!" / "Almost" / "Not quite". The details scroll on their own past 40% of the screen height.
- **3:** a signed-in adult with a browser that can record uses `/api/heir/transcribe` (`src/app/heir/ui/cloud-speech.ts`; hints from `speechHints` in `src/heir/speech.ts`, with a test
  matching the app's). While it uploads the text says "Checking what you said…". A failed upload says "Couldn't check that. Tap and say it again." and the browser's recognizer is used for the rest of the visit.
  Children, signed-out use and browsers that can't record keep the browser recognizer.
- **9:** a refused or missing microphone (either recognizer) now calls "Can't speak now", so every later speaking step this session becomes typing.
- **4:** checking blurs the focused field. **5:** `reveal` on the course page windows. **6:** "My courses" first on Courses; the shelves leave those courses out; the old "Continue" card is gone (its place is the first My courses card).
- The three tests that fail under `TZ=America/Chicago` fail on the untouched branch too (they are time-zone sensitive in a UTC container); the default run passes (160).

# Deep Think: running it

Deep Think lives beside the listening app in this repo, under its own routes:

- the app: `/think` (pages in `src/app/think/`)
- its API: `/api/think/*` (routes in `src/app/api/think/`)
- its logic and tests: `src/think/`
- its database tables: `supabase/migrations/20261113000000_deep_think.sql`

Nothing in the listening app was changed, apart from the ElevenLabs client gaining speech to text.

## 1. Environment variables

Set these in `.env.local` for local work (the file is git-ignored) and in the host's settings for a deployment. Never commit them.

| Variable | What it's for | Without it |
|---|---|---|
| `ANTHROPIC_API_KEY` | Punctuation and paragraphs, titles, the coach's prompts, reformat versions, reading links | Notes get plain spacing only (a capital at the start of each paragraph, a break at each long pause). The title is the note's opening words. Suggestions still recommends a next move but has no prompts. Reformat offers basic built-in arrangements. |
| `ELEVENLABS_API_KEY` | Speech to text | The browser's built-in speech recognition is used instead, with a quiet notice. If the browser has none, the note opens for typing. |
| `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sign-in, and notes that sync and stay private to their owner | No sign-in. Notes are kept in the browser on that one device, and the library says so. |

Optional:

| Variable | What it's for |
|---|---|
| `THINK_STT_MODEL` | Use a specific ElevenLabs speech-to-text model. If the account can't use it, the built-in choices are tried next. |
| `MARGIN_MODEL`, `MARGIN_FAST_MODEL` | Override which AI models are used. Deep Think shares these with the listening app: the fast one punctuates and titles, the strong one coaches and reformats. |
| `MARGIN_API_TOKEN` | Only matters when Supabase is **not** set up. See "Who can call the API" below. |

### Who can call the API

The `/api/think/*` routes spend API credit, so they are locked:

- **With Supabase set up:** a request must come from a signed-in user. This is the intended setup.
- **Without Supabase:** the routes are open in local development (`npm run dev`). On a deployed site they fall back to the listening app's access code (`MARGIN_API_TOKEN`), so in practice the AI features stay off until Supabase is set up. The app still works; it uses the fallbacks in the table above.

## 2. Set up Supabase

The migration has **not** been applied to any project. To apply it:

**With the Supabase CLI**

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

**Or by hand:** open the project's SQL editor, paste the contents of `supabase/migrations/20261113000000_deep_think.sql`, and run it. It is safe to run more than once.

It creates four tables, all prefixed `think_` so they don't touch the listening app's tables:

- `think_profiles`: the onboarding choices (topics and goals)
- `think_folders`
- `think_notes`: the user's words (`paragraphs`), the chosen format if any (`layout`), the raw transcript, the title and whether the user has edited it
- `think_note_versions`: the note as it was before each reformat or revert, so the original can always be brought back

Row-level security is on for all four: a signed-in user can read and change only their own rows, and a signed-out visitor can read nothing.

**Then, in the Supabase dashboard:**

1. **Authentication → Sign In / Providers:** make sure Email is enabled.
2. **Authentication → Emails → Magic Link template:** include `{{ .Token }}` in the body, for example "Your Deep Think code is {{ .Token }}". Deep Think signs in with the emailed code rather than a link, because a link tapped on an iPhone opens Safari instead of the home-screen app.
3. **Authentication → URL Configuration:** set the Site URL to where the app is served.
4. Since this is for one person for now, consider turning off new sign-ups once your own account exists.

## 3. Run it locally

```bash
npm ci
npm run dev
```

Open http://localhost:3000/think. With no variables set you can still go through onboarding, talk or type a note, and see it saved on the device.

The microphone only works on `https://` or `localhost`. To try it from your phone on the same Wi-Fi, run `npx next dev --experimental-https` and open `https://<your-computer's-address>:3000/think` (accept the certificate warning), or just deploy it.

## 4. Deploy on Netlify

The repo's `netlify.toml` already builds the whole site with `npm run build`. Nothing in it needs changing for Deep Think.

1. In Netlify, open **Site configuration → Environment variables** and add the variables from section 1.
2. Deploy (push the branch, or trigger a deploy).
3. Open `https://<your-site>/think`.

The site root still serves the listening app. One limit to know about: the host stops a request after about 30 seconds, so a very long note may fail to reformat. If that happens the app falls back to the built-in arrangements.

## 5. Add it to the iPhone home screen

1. Open `https://<your-site>/think` in **Safari**.
2. Tap **Share**, then **Add to Home Screen**. It is named "Deep Think" and has its own icon.
3. Open it from the home screen. It runs full screen, and starts at the library.
4. The first time you tap **New note**, allow the microphone.

If listening doesn't start by itself on a new note, tap the orb once. iOS sometimes wants a tap before it will listen.

## 6. Tests and checks

```bash
npm run think:test    # Deep Think's own logic
npm run engine:test   # the listening app's tests (unchanged)
npm run lint
npm run build
```

`think:test` covers the rules the product depends on:

- **Word preservation.** Formatted text must hold exactly the transcript's words, in order; only punctuation, capitals and paragraph breaks may differ. Headings, lists and labels are refused too. (`src/think/test/words.test.ts`, `note.test.ts`)
- **Title lock.** A title the user has edited is never overwritten. (`title.test.ts`, `note.test.ts`)
- **Next-move selection.** Which move the coach recommends, and that "stuck" and "reframe" are never pushed. (`coach.test.ts`)
- **Prompts quote the note.** A prompt whose quote isn't in the note is dropped, as is flattery or steering; at most three survive. (`coach.test.ts`)
- **Pauses.** A long pause while talking brings the last sentences back; typing ignores pauses. (`coach.test.ts`)
- **Dark content** is recognised so the coach steps back. (`coach.test.ts`)
- **Reformat versions** are kept only if every sentence is the user's own. (`coach.test.ts`)

The same checks run twice in the app: once on the server before a result is sent, and again in the browser before it reaches the page.

## 7. Where to change things

- **How much the coach pushes back:** `COACH_TONE` in `src/think/coach.ts`. This is still an open decision.
- **What the AI is told:** `src/think/prompts.ts`.
- **How long a pause is:** `REREAD_AFTER_MS` in `src/think/coach.ts`.
- **Dark content:** `looksDark` in `src/think/coach.ts`. There is a marked TODO there: decide whether to show support resources (such as the 988 line) when a note suggests a risk of self-harm, instead of only going quiet.

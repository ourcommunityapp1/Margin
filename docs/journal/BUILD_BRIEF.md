# Deep Think: build brief for the prototype

This brief is for whoever builds the first working version. Read `STRATEGY.md` for background. The mockups are at https://claude.ai/artifact/9jPJjzoCUHMXnNVtUhEdeW (the **Round 2** page is current; screen 3A is the chosen note layout).

## The goal

A phone web app that the owner **uses every day** to think out loud. It should replace Apple Notes for that. The users are the owner only, for now.

**The moment that has to land: talk → a beautiful page.** You ramble for two minutes, and a clean note appears with punctuation, paragraphs and headings, set in lovely type. If only one thing works well, it's this.

## Where and how

- **This repo** (Next.js 16, which has breaking changes: read `node_modules/next/dist/docs/` before writing code, per `AGENTS.md`). Build it as a new route area, such as `src/app/think/`, without disturbing the existing listening app.
- **Home-screen web app on iPhone Safari.** It must work at 390px width, with touch targets of at least 44px.
- **Speech to text: ElevenLabs.** A client already exists in `src/voice/elevenlabs.ts`; extend it with transcription. Aim for a live or near-live transcript. Falling back to the browser's built-in recognition is fine for the in-progress line.
- **AI: the Anthropic SDK** (already a dependency). Use the latest Claude models.
- **Storage: Supabase, with sign-in** (`src/lib/supabase.ts`). Each note is private to its owner (row-level security). Treat this as a private journal from day one.

## Screens (match the mockups)

1. **Onboarding:** "What do you tend to think about?" (chips that become the first folders) and "What do you want help with?" (think deeper, think clearer, organize my thoughts, write more, be more persuasive, research).
2. **Library:** search, folders as a 2-column grid, recent notes, and one **New note** button. No choice between talking and writing.
3. **New note / just talk:**
   - It starts listening immediately, and the keyboard is one tap away.
   - No title is needed. The title fills itself in, shown in gray, as the topic becomes clear. **Once the user edits it, it never changes again.**
   - Listening is shown by a soft breathing orb at the bottom, with the live transcript just above it. There is no waveform bar.
   - **Auto-formatting:** punctuation, paragraph breaks and headings appear while you talk. Headings should come from the user's own words where possible.
4. **Note at rest (layout 3A):** back on the left. On the right: **Reformat**, **Suggestions · N** and a new-note icon. There's a small orb at the bottom to keep talking.
5. **Suggestions sheet:** opens only when tapped, never on its own. It holds three things:
   - **Think it through:** up to 3 prompts.
   - **Small fixes:** for example, a word the transcription couldn't resolve.
   - **Go further:** *real* links from a web search, showing each site's domain, plus one writing tip.

   Threads and alternative-word suggestions are **parked**.
6. **Reformat:** a full-screen carousel of large, readable versions of the note: the Original, then three formats chosen to fit this note (for example: as a decision, as a story, as questions). Swipe to compare, then tap **Use this format**. This replaces the note, and the original is always one tap away (keep the full version history).

## The coach: the heart of the product

This is the long-term advantage. Get it right before adding anything else.

**The stance is "a friend who listens."** The coach is mostly quiet and reflects back what you said so you can hear yourself. It isn't a mentor who argues or a therapist who interprets.

**It infers the note's perspective.** From the note itself, it works out what you're trying to do: express a feeling, explore a question, explain something, persuade, or tell what happened. Then it asks what would actually help you think *this* note through. This applies to every topic, including faith. Draw on Scripture or tradition when the note itself is working within that frame, and not otherwise.

**Prompts must be:**
- Specific to this note. Quote or point to the user's own words. A prompt that could apply to any note is a failure.
- Few: at most 3, and fewer if fewer are good.
- Open, never leading. Never steer toward the coach's own conclusion.
- Free of flattery and therapy-speak. No "That's so valid," no "It sounds like you're feeling…"

**What it looks for:** unfinished sentences, two statements that pull against each other, a vague word doing heavy lifting, a buried main point, and the obvious next question the note skips.

**Memory:** the prototype coaches one note at a time. Design the data so that later it can surface obvious connections to past notes, but *only* when that helps with the note you're on.

**Dark content:** if a note goes too dark, the AI quietly pauses: no suggestions, and the note is still saved. (One thing to raise with the owner: if a note suggests someone may be at risk of self-harm, consider showing support resources such as the 988 line, not only going quiet.)

**Still open (decide with the owner, don't guess):** how much the coach pushes back. The current lean is gentle, but the owner wants better questions before settling this. Build the coach's instructions so that tone is one clearly marked setting.

## Out of scope for the prototype

Spoken prompts, threads, alternative-word suggestions, connections across notes, a native app, sharing.

## Done means

The owner opens it on their phone, taps New note, talks for two minutes, and gets a page they'd want to read again. The Suggestions sheet asks at least one question they hadn't asked themselves. Notes sync and survive a reload.

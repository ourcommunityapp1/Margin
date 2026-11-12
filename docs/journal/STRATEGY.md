# Journal: strategy notes

A journal that helps you think out loud, then shows your thoughts back to you in a clean, organized form. It coaches you toward clearer thinking, but it never writes for you.

## The one rule: every word on the page is yours

Everything else follows from this. The AI can do three things:

1. **Ask.** It asks questions that help you clarify ("You said 'stuck' three times. Stuck on what?").
2. **Arrange.** It reorders, groups and adds headings to *your own sentences*.
3. **Point.** It highlights a vague word, a contradiction or a buried main idea, and you decide what to do.

It never suggests a rewrite, finishes a sentence or offers a "better way to say it."

This rule can be **enforced in code**: after formatting, every sentence in the output must also appear in the user's input. Headings are either short phrases quoted from the entry or neutral labels the user chooses ("Morning", "Worries", "Decisions"). If the model adds any new wording, the output is rejected. This check is the product's moat and the reason to trust it, and it helps the marketing too: *"Nothing in your journal was written by AI."*

## Audio first or writing first?

**Recommendation: speak to capture, read to refine.**

| | Audio first | Writing first |
|---|---|---|
| Friction on a phone | Very low | High (thumb typing) |
| Raw, honest thinking | Strong: people ramble their way to the point | Weaker: people self-edit before thinking |
| Needs structure afterward | Badly, which is exactly what the AI is for | Somewhat |
| Privacy in public | Poor | Good |

Talking is where the thinking happens, and the formatting is what makes the ramble worth reading later. So:

- The home screen is one big record button, with "type instead" always available.
- The transcript is **verbatim**. Removing "um" and "like" is an opt-in toggle, never silent.
- The coaching can also be spoken. After you stop, a short voice prompt asks one question and you answer aloud. This turns a monologue into a guided conversation.

## The loop

```
Capture  →  Shape  →  Coach  →  Keep
(talk)      (pick a    (1–3       (a dated,
            layout)    questions)  readable page)
```

1. **Capture:** you talk or type freely, with no prompts. A blank page is fine.
2. **Shape:** the app offers 2–3 layouts of the *same sentences*:
   - **As it came:** chronological, split into paragraphs, with light headings.
   - **By theme:** your sentences grouped under headings pulled from your own words.
   - **Thread:** the main question at the top, your reasons and feelings under it, and open loops at the bottom.
   You tap one. The layouts look different but use identical words.
3. **Coach (optional):** the app makes at most a few targeted moves:
   - *Vague word:* "What does 'off' mean here?"
   - *Buried main idea:* "This sentence near the end seems like the real point. Move it up?"
   - *Tension:* "Earlier you said X, and here you said Y. Both true?"
   - *One sentence:* "If you had to say this whole entry in one sentence, what would it be?" (you answer, and your answer becomes the summary line)
   Your answers are added to the entry, still in your words.
4. **Keep:** a calm, typographic page you can read again in a year.

## Strategy pillars → product decisions

| Pillar | What it means concretely |
|---|---|
| **Beautiful** | Typography first: a serif for body text and a generous measure (~60–70 characters per line). Few colors, no chrome. It should feel like a well-set book page, not a chat app. |
| **Readable** | Short paragraphs, real headings, a one-line summary at the top in the user's words, and dates as quiet section markers. |
| **Formatted** | Structure is data (blocks: heading, paragraph, quote, list, question/answer), not markdown text. That makes the layouts swappable and the verbatim check easy. |
| **Mobile** | Thumb-reachable record button, an offline queue for recordings, and a PWA first (the current repo already has a manifest). Go native only if background recording or lock-screen capture becomes essential. |
| **Audio vs writing** | Audio first, with text as a first-class option (see above). |
| **AI integrated** | Invisible until it's useful: no chat box. The AI appears as layout choices and margin questions. *Margin* is a good name for this product. |

## What carries over from this repo

- **Next.js + PWA manifest:** the shell already exists.
- **ElevenLabs** (`src/voice/`): speech to text for capture and text to speech for spoken coaching prompts.
- **Anthropic SDK** (`src/engine/`): the shaping and coaching calls. The pipeline/eval pattern also fits well: build an eval set that checks *"did the model introduce any words?"*
- **Supabase:** authentication and entries. Journals are deeply private, so plan for encryption at rest from day one and possibly client-side encryption later.

## Risks to watch

- **Coaching that feels like therapy or nagging.** Keep it to 1–3 questions, make it skippable, and never diagnose.
- **The verbatim check fails on transcript cleanup.** Decide early whether filler-word removal counts as "your words."
- **Sensitive content.** Some entries will involve distress. Have a gentle, non-generative path to support resources.
- **"Just write it for me" pressure.** Users will ask for it. Saying no *is* the product. Explain why in the UI once, warmly.

## Open questions

1. Is this a personal tool first (just you), or a product for others from the start?
2. Do entries ever connect, such as "you've mentioned this worry 4 times this month," or does each entry stand alone?
3. Should headings ever be AI-written labels, or *only* quoted phrases and user-chosen tags?
4. Is spoken back-and-forth coaching part of v1, or is text questions enough?

## A possible v1 (smallest thing worth using)

- Record or type an entry
- Verbatim transcript
- Three layout options, with the verbatim check enforced
- Up to 3 coaching questions, answered by voice or text
- A list of past entries in a beautiful reading view

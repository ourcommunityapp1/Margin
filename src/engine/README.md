# Margin study engine

The engine does three jobs for Margin:

- **Ask.** It answers a question about Scripture, either as the host or as one of four commentators. Every quotation is checked against the library before it is spoken.
- **Playlists.** It drafts a study playlist on a topic. It keeps only passages that exist, and it notes which of the chosen voices comment on each one.
- **Sessions.** It turns passages into a listening session: Scripture and commentary as timed spoken units, each with an honest attribution.

The engine runs in two places:

- **On the server**, through Next.js API routes that call the Claude API.
- **In the browser**, in the published prototype, which reaches Claude through the artifact's `sample` capability.

Both use the same pipeline. Only the model adapter differs. The design follows the research in [`reports/Bible exposition AI and prompting.md`](../../reports/Bible%20exposition%20AI%20and%20prompting.md).

## How an answer is made

Each stage is either a separate model call or code. A model call is followed by a check that code or a second call performs, never the model that wrote the text.

| Stage | What happens | Code |
|---|---|---|
| 1. Guard | Fixed replies, with no model call, for these cases: a crisis (the reply gives 988), a request for a sacrament, and "are you real?" put to a persona. A request for personal counsel is passed to the host. | `pipeline/guard.ts` |
| 2. Plan | A short JSON call picks up to four passages. It also flags contested questions and false premises. References written in the question are parsed in code first and always kept. Each reference is checked against the Bible's real chapter and verse numbers. References that don't exist are dropped and counted. | `pipeline/ask.ts`, `bible/refs.ts` |
| 3. Gather | Each passage is widened to its whole paragraph, up to 30 verses. Then commentary is added: Henry, Spurgeon on the Psalms, and the Fathers, with doubtful attributions last. A topic question with no passage searches the library by keyword and by exact phrase. Each source carries its true author, its work and any caveats. | `retrieve/` |
| 4. Answer | Claude answers with the sources as `search_result` blocks, with citations on. The system prompt carries the method: plain sense first, exact quotation, naming writers honestly, balance, and when to say less. | `model/anthropic.ts`, `prompts.ts` |
| 5. Verify | Code checks that every quotation matches a supplied source word for word, and comes from the writer the sentence names. It flags writers Margin doesn't hold (Calvin, Wesley and others), Aquinas named as an author, and Pseudo-Chrysostom called Chrysostom. It also checks references, a 240-word limit, list formatting, and persona limits. | `pipeline/verify.ts` |
| 6. Grade | A second JSON call checks each claim against the sources. For a contested question, it also checks whether the answer picked a winner or gave only one side. | `pipeline/ask.ts` |
| 7. Repair or fall back | The model gets one repair round with the problems listed. If the answer still fails, the listener hears the passage and one exact note instead. | `pipeline/ask.ts` |
| 8. Audio | The answer is split into spoken segments: an AI disclosure before a persona, then speech, quotations and Scripture. References are written out for the voice. | `pipeline/audio.ts` |

Playlists use a JSON call. Each passage is checked against the Bible, trimmed to 25 verses, and annotated with which voices cover it. With no Claude available, the engine can still lay out a passage as sessions (`pipeline/playlist.ts`).

Sessions need no model at all (`pipeline/session.ts`).

## Rules from the research

- **Quotation marks mean exact words.** They hold either the text of a supplied source or the listener's own words repeated back. Code enforces this. An answer that fails is repaired or replaced.
- **Henry, Romans to Revelation.** Henry died after finishing Acts, and other ministers completed the rest from his notes. For these books the engine says "the commentary that bears Matthew Henry's name" and flags each source.
- **The Catena Aurea is an anthology.** Aquinas compiled it, so it is never presented as his own view.
- **Pseudo-Chrysostom.** The *Opus Imperfectum* is anonymous and probably Arian. It is labeled as such and ranked after genuine writers.
- **Doubtful Catena entries.** Excerpts the Catena credits to doubtful writers are introduced as "an early writer the Catena calls…".
- **Leaning sources.** When Henry and Spurgeon are the only commentators on a passage, the answer says that both are Calvinists.
- **Missing voices.** For a voice Margin doesn't hold, such as Calvin, Wesley, Luther or the Orthodox, the answer says the library has no such voice instead of summarizing from memory.
- **Contested questions.** The answer gives shared ground first, then each side in its own terms with its strongest textual case, and picks no winner.
- **Polemic.** `npm run corpus:audit` flags old commentary that speaks harshly of Jews or Catholics (112 flags in `data/corpus/review.json.gz`). Flagged sources reach the model with a note: it may report such a passage, but must not repeat it as Margin's view.
- **Personas.** Personas exist only for Henry, Spurgeon, Augustine and Chrysostom.
  - Each speaks only from his own works; Augustine and Chrysostom are never built from the Catena.
  - Each is announced as AI, never claims to be the real man, and gives no counsel, absolution or blessing.
  - The host takes over after eight turns.

## Running it

```bash
npm run engine:test      # unit and pipeline tests on the real library, mock model
npm run engine:eval      # eval set through the full pipeline, mock model (checks plumbing, free)
npm run engine:eval -- --live --limit 20   # real Claude; needs ANTHROPIC_API_KEY and spends credit
npm run corpus:audit     # rebuild the polemic review list
node scripts/build-browser.mjs dist/margin-engine.js   # browser bundle (window.MarginEngine)
```

| Variable | Needed for | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | `/api/ask`, `/api/playlist`, `--live` evals | none |
| `MARGIN_API_TOKEN` | Every API route requires `Authorization: Bearer <token>`. In production the routes return 503 until it is set, because they spend API credit. | none |
| `MARGIN_MODEL` | Model for every call | `claude-opus-5-5` |
| `MARGIN_GRADER_MODEL` | Model for the grading call | same as `MARGIN_MODEL` |

All calls use the server-side fallback beta (`server-side-fallback-2026-07-01`). If the chosen model declines a request, the API retries it on another model within the same call. Effort is low for planning and medium for everything else, to keep spoken answers quick.

### API

All routes take a `POST` with a JSON body.

| Route | Body | Returns |
|---|---|---|
| `/api/ask` | `{question, speaker?: "host" \| "henry" \| "spurgeon" \| "augustine" \| "chrysostom", history?, context?: {refs, label}}` | text, audio segments, checked quotations, passages, sources, notes |
| `/api/playlist` | `{topic, from?: "all" \| "henry" \| "spurgeon" \| "fathers", sessions?}` | a checked draft playlist |
| `/api/session` | `{refs: ["Romans 8"], title?, format?: "read" \| "verse"}` | a listening session |

## Measuring it

`eval/dataset.jsonl` holds the research's test set of about 110 items, in these categories:

- answerable;
- partly answerable;
- library silent;
- false premise;
- contested pairs, asked from both sides;
- persona;
- flattery, where a stated view is followed by "Are you sure?".

`eval/graders.ts` scores each answer in code: quotations, references, invented attributions, abstention, length and balance flags. The result also records the grading call's verdicts. `eval/run.ts` reports each category's pass rate with a 95% interval, and `--compare a.json b.json` lists the items that changed between two runs.

Rerun the eval after every prompt change and every model upgrade, and add real failures as new items.

## Limits

- **Live scores.** The pipeline has been tested end to end with a mock model and a stand-in for the artifact's Claude. Answer quality needs a `--live` run with an API key. No live scores exist yet.
- **Search.** Topic search is keyword search with an exact-phrase lookup. The research also recommends embeddings, which would catch passages that share meaning but not words.
- **Polemic flags.** The flags come from heuristics, and someone should review them by hand.
- **Balance grading.** The research recommends readers from at least two traditions for balance items. The grading call is only a first pass.
- **Licensing.** Only public-domain text reaches the model (BSB, Henry, Spurgeon, the Catena and the Schaff Fathers). ESV, NIV and NASB would be display-only, if licensed at all.

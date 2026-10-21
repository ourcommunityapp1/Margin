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
| 1. Guard | Fixed replies, with no model call, for these cases: a crisis (the reply gives 988), a request for a sacrament or a prayer, asking Margin to act as someone's pastor, a ruling on church practice ("can I baptize my baby with Gatorade?"), "are you real?" put to a persona, and a commentator's own views on other faiths. Personal decisions, grief and passage questions about other faiths move from a commentator to the host. | `pipeline/guard.ts` |
| 2. Plan | A short JSON call picks up to three passages. It also flags contested questions and false premises. It is skipped when the question already names its passage, or asks about what is playing ("what does this mean?"). Code finds, in the question, the references, the passages named by title ("the Good Samaritan"), and the lines of Scripture quoted or remembered ("lean not on your own understanding"). Those always come first. Each reference is checked against the Bible's real chapter and verse numbers, and planner references that don't exist are dropped and counted. A follow-up such as "Are you sure?" stays on the passages the last answer read. | `pipeline/ask.ts`, `bible/refs.ts`, `retrieve/known.ts`, `retrieve/search.ts` |
| 3. Gather | The first passage is widened to its whole paragraph, up to 30 verses; later ones are read as asked. Then commentary is added: Henry, Spurgeon on the Psalms, and the Fathers, with doubtful attributions last. Each voice gets a turn before any gets a second, each note is cut to its most relevant 200 words, and the commentary is capped at 1,300 words. On a long passage, notes are chosen by what the question asks: the verse it names, and the words it shares with the notes and their verses. A topic question with no passage searches the library by keyword, looking first in any book the question names. Each source carries its true author, its work and any caveats. | `retrieve/` |
| 4. Answer | Claude answers with the sources as `search_result` blocks, with citations on. The system prompt carries the method: plain sense first, exact quotation, naming writers honestly, balance, and when to say less. Notes from the pipeline travel with the question, such as "contested", "the library holds no Calvin", or "only Reformed voices here". | `model/anthropic.ts`, `prompts.ts` |
| 5. Verify | Code checks that every quotation matches a supplied source word for word, and comes from the writer the sentence names. It flags writers Margin doesn't hold (Calvin, Wesley and others), Aquinas named as an author, and Pseudo-Chrysostom called Chrysostom. It also checks references, a 240-word limit, list formatting, and persona limits. | `pipeline/verify.ts` |
| 6. Grade | For contested, premise-checking, persona and sensitive answers, a second JSON call checks each claim against the sources the answer cited. For a contested question, it also checks whether the answer picked a winner or gave only one side. Plain answers rely on the code checks. | `pipeline/ask.ts` |
| 7. Repair or fall back | The model gets one repair round with the problems listed. If the answer still fails, the listener hears the passage and one exact note instead. | `pipeline/ask.ts` |
| 8. Audio | The answer is split into spoken segments: an AI disclosure before a persona, then speech, quotations and Scripture. References are written out for the voice. | `pipeline/audio.ts` |

Playlists use a JSON call. Each passage is checked against the Bible, trimmed to 25 verses, and annotated with which voices cover it. With no Claude available, the engine can still lay out a passage as sessions (`pipeline/playlist.ts`).

Sessions need no model at all (`pipeline/session.ts`).

## What a question costs

Claude is billed by the text it reads and writes. The first live run measured **12.2¢ a question**:
- **Three calls on Opus 5.5:** passage choice, the answer, and the check.
- **Sources sent twice:** about 3,600 words of them.
- **Thinking:** about 2,000 tokens of Claude's private reasoning.

The pipeline now spends only where a question needs it:

| Step | What it saves | Code |
|---|---|---|
| Send less | Each note is cut to its most relevant 200 words and commentary to 1,300 words: about 1,800 words a question instead of 3,600, with the same eval results. | `retrieve/gather.ts` |
| Check only what's needed | The grading call runs only on contested, premise-checking, persona or sensitive answers, and reads only the sources the answer cited. | `pipeline/ask.ts` |
| Skip planning | No planning call when the question names its passage, or asks about what is playing. | `pipeline/ask.ts` |
| Model by difficulty | Sonnet 5.5 (half Opus's price) plans, grades and writes ordinary answers. Opus 5.5 writes contested, persona and premise-checking answers, repairs, study guides and playlists. | `model/anthropic.ts` |
| Less thinking | Effort is set on every call: low for ordinary work, medium for hard answers. Sonnet 5.5 would otherwise think at its default, high. | `model/anthropic.ts` |
| Study guides | A plain "what does this passage mean?" is answered once by Opus, checked, stored, and replayed free. `scripts/precompute-guides.ts` makes them ahead of time through the Batches API at half price. It only estimates unless given `--yes`. | `pipeline/guides.ts`, `pipeline/precompute.ts` |
| Cached follow-ups | Sources go first in the conversation with a cache marker. A follow-up on the same passages gathers exactly the same sources, so it reads them at 5% of the price. | `model/anthropic.ts`, `pipeline/ask.ts` |
| Free commands, daily cap | "Read me Psalm 23" plays the passage with no call. Each answer's cost goes on the day's tally. Past `MARGIN_DAILY_BUDGET_USD`, questions get the free answer (the passage and a checked note) until the next day. | `pipeline/ask.ts`, `pipeline/spend.ts`, `index.ts` |

A live run of 10 test questions measured the result. It cost 51¢ in all, 5.1¢ per question, including the repairs listed below.

| Question | Measured |
|---|---|
| Plain question about a named passage | 1.5–2.4¢ (the same questions cost 12.2¢ before), answered in 4–6 seconds instead of about 25 |
| A question and its follow-up ("Are you sure?") | 2.4¢ for both |
| Contested question | 3.4¢ |
| Persona, false-premise and missing-writer questions | 7–8¢. Each needed a repair round on Opus. |
| Replayed study guide, command, or over the daily cap | free |

Four of the eleven answers in that run went to a repair round, and two ended in the free answer. The causes were fixed afterwards:
- **Speech marks inside a quotation.** The quotation checker misread a quotation containing the Bible's own speech marks ("“If anyone is unwilling to work…”"). It now handles quotes within quotes, and never ends a sentence inside an open quotation (`text.ts`).
- **A paraphrase rejected at low effort.** The grading call, at low effort, rejected a faithful paraphrase of Spurgeon. It now runs at medium effort.
- **The wrong notes for a short passage.** A persona missed his note on the verse quoted in the question. Notes are now ranked by relevance on passages of any length, and a quoted line points at its verse.

Re-running those four questions after the fixes cost 34¢. All four gave full, checked answers and none ended in the free answer.
- **Fixed with no repair round.** The Spurgeon persona now quotes his own note on Psalm 23:4, at 5.6¢. The false-premise answer cost 6.2¢.
- **A genuine catch.** One repair was a real error the checks caught: a phrase of Chrysostom's credited to Henry.
- **The grader lacked context.** One repair came from the grader marking two true statements unsupported. One named a passage the answer hadn't tagged with a citation. The other repeated what Margin tells the model about Henry and Spurgeon. The grader now also receives any passage the answer names by reference, and the same library facts, including each writer's dates and tradition (`pipeline/ask.ts`, `prompts.ts`).

Each answer reports its cost in `costUsd`, and what sent it to repair in `repairedFor`. `npm run engine:eval -- --live --concurrency 1 --ids …` prints the cost of each item and the total.

## Rules from the research

- **Quotation marks mean exact words.** They hold either the text of a supplied source or the listener's own words repeated back. Code enforces this. An answer that fails is repaired or replaced.
- **Henry, Romans to Revelation.** Henry died after finishing Acts, and other ministers completed the rest from his notes. For these books the engine says "the commentary that bears Matthew Henry's name" and flags each source.
- **The Catena Aurea is an anthology.** Aquinas compiled it, so it is never presented as his own view.
- **Pseudo-Chrysostom.** The *Opus Imperfectum* is anonymous and probably Arian. It is labeled as such and ranked after genuine writers.
- **Doubtful Catena entries.** Excerpts the Catena credits to doubtful writers are introduced as "an early writer the Catena calls…".
- **Leaning sources.** When Henry and Spurgeon are the only commentators on a passage, the answer says that both are Calvinists.
- **Missing voices.** For a voice Margin doesn't hold, such as Calvin, Wesley, Luther or the Orthodox, the pipeline tells Claude before it answers. Claude says so plainly instead of summarizing from memory.
- **Contested questions.** The answer gives shared ground first, then each side in its own terms with its strongest textual case, and picks no winner. The planner flags these questions. A list of perennial disputes catches what it misses, such as infant baptism, eternal security, the millennium, and Mary.
- **Polemic.** `npm run corpus:audit` flags old commentary that speaks harshly of Jews or Catholics (121 flags in `data/corpus/review.json.gz`). Flagged sources reach the model with a note: it may report such a passage, but must not repeat it as Margin's view.
- **Personas.** Personas exist only for Henry, Spurgeon, Augustine and Chrysostom.
  - Each speaks only from his own works; Augustine and Chrysostom are never built from the Catena.
  - Each is announced as AI, never claims to be the real man, and gives no counsel, absolution, blessing or prayer.
  - The host takes over after eight turns.

## The library

`data/corpus/` holds 75 gzipped book files, an index and the polemic review list. `scripts/library/build_all.py` rebuilds them byte for byte from the sources:

- **BSB.** The text comes from eBible.org. That file follows Hebrew verse numbering, so 136 English verses had no place in it and were missing, among them Malachi 4, Joel 2:28–32, Numbers 16:36–50 and 2 Corinthians 13:14. The build fills them from an English-numbered BSB copy (scrollmapper's `BSB.json`).
  - **How the copies compare.** The two copies share 30,950 verses. 30,614 are identical, and the rest differ only in spacing, verse division or small revisions.
  - **How the filled verses were checked.** The neighbours of every filled verse match exactly, and a third copy agrees wherever its own text is complete. The 16 verses the BSB itself omits, such as Matthew 17:21 and Acts 8:37, stay empty. Answers that touch one of them say so.
- **Matthew Henry's Concise Commentary.** A few headings are missing from the source, so a note can run past its stated verses. For example, the note headed John 3:1–8 runs to 3:21. Titles now name the verses a note actually covers.
- **The Fathers.** These come from the Catena Aurea (the Gospels) and the Historical Christian Faith commentaries database.
  - The database links each quotation to a public-domain edition, but many of its quotations are modern translations. This was found by sampling: for example, its Confessions reads "we are unable to think cognitively about an absolute privation of form".
  - The build keeps only the series that read as the 19th-century NPNF translation:
    - Augustine's Expositions on the Psalms, Tractates on John, Homilies on 1 John and Harmony of the Gospels;
    - Chrysostom's homilies.
  - These now reach the Gospels too, so the Augustine and Chrysostom personas have their own words there.

## Running it

```bash
npm run engine:test      # unit and pipeline tests on the real library, mock model
npm run engine:eval      # eval set through the full pipeline, mock model (checks plumbing, free)
npm run engine:eval -- --live --limit 20   # real Claude; needs ANTHROPIC_API_KEY and spends credit
npm run corpus:audit     # rebuild the polemic review list
node scripts/build-browser.mjs dist/margin-engine.js   # browser bundle (window.MarginEngine)
node scripts/precompute-guides.ts "Psalm 23" "John 3:1-21"   # study guides ahead of time: estimate only; add --yes to send
```

| Variable | Needed for | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | `/api/ask`, `/api/playlist`, `--live` evals | none |
| `MARGIN_API_TOKEN` | Every API route requires `Authorization: Bearer <token>`. In production the routes return 503 until it is set, because they spend API credit. | none |
| `MARGIN_MODEL` | Contested, persona and premise-checking answers, repairs, study guides, playlists | `claude-opus-5-5` |
| `MARGIN_FAST_MODEL` | Planning and ordinary answers | `claude-sonnet-5-5` |
| `MARGIN_GRADER_MODEL` | The grading call | same as `MARGIN_FAST_MODEL` |
| `MARGIN_DAILY_BUDGET_USD` | What questions may spend in a day before free answers take over | `2` |
| `MARGIN_DATA_DIR` | Where study guides and the day's spending are kept. Point it at lasting storage on a serverless host. | the system's temporary folder |

All live calls use the server-side fallback beta (`server-side-fallback-2026-07-01`). If the chosen model declines a request, the API retries it on another model within the same call. Batch requests can't use it, so the study-guide script leaves it off.

### API

All routes take a `POST` with a JSON body.

| Route | Body | Returns |
|---|---|---|
| `/api/ask` | `{question, speaker?: "host" \| "henry" \| "spurgeon" \| "augustine" \| "chrysostom", history?: [{role, text, refs?}], context?: {refs, label}}` | text, audio segments, checked quotations, passages, sources, notes, cost; `command` for "read me…" requests; `guide` when a study guide was made or replayed |
| `/api/playlist` | `{topic, from?: "all" \| "henry" \| "spurgeon" \| "fathers", sessions?}` | a checked draft playlist |
| `/api/session` | `{refs: ["Romans 8"], title?, format?: "read" \| "verse"}` | a listening session |

Send each earlier answer's `passages` back as `refs` in `history`. That way, a follow-up stays on the same text.

## Measuring it

`eval/dataset.jsonl` holds the research's test set of 110 items, in these categories:

- answerable (30);
- partly answerable (15);
- library silent (15);
- false premise (10);
- contested pairs, asked from both sides (20);
- persona (10);
- flattery, where a stated view is followed by "Are you sure?" (10).

Each item was checked against the library. `eval/graders.ts` scores each answer in code: quotations, references, invented attributions, abstention, length and balance flags. The result also records the grading call's verdicts. `eval/run.ts` reports each category's pass rate with a 95% interval, and `--compare a.json b.json` lists the items that changed between two runs.

### Mock baseline

The mock model passes 79 of 110 items, with 202 of 202 quotations verified, no invented references and no errors. This baseline tests the plumbing, not the answers:

- **What a mock can't do.** It cannot abstain or correct a premise, so the silent and false-premise categories score 0 by design.
- **What it shows.** The other categories show what code alone already gets right: retrieval, guards, the contested backstop and follow-ups.
- **What the eval caught.** Building this baseline surfaced and fixed several problems:
  - quoted lines were missed when written in single quotes;
  - the guards missed iPhone curly apostrophes;
  - a named passage was padded with unrelated ones;
  - Henry's note on 2 Peter 2:17–22 was cut;
  - the BSB verses were missing;
  - modern translations were in the Fathers.

Rerun the eval after every prompt change and every model upgrade, and add real failures as new items.

## Limits

- **Live scores.** Answer quality needs a `--live` run with an API key. No live scores exist yet.
- **Search.** Topic search is keyword search with phrase and title lookups. The research also recommends embeddings. Embeddings would catch questions worded differently from the text, such as "mad" for Jonah's anger.
- **Polemic flags.** The flags come from heuristics, and someone should review them by hand.
- **Balance grading.** The research recommends readers from at least two traditions for balance items. The grading call is only a first pass.
- **Licensing.** Only public-domain text reaches the model: BSB, Henry, Spurgeon, the Catena (1841) and Schaff's NPNF translations. ESV, NIV and NASB would be display-only, if licensed at all.

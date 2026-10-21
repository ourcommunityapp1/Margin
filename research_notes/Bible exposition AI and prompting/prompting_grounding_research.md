# Prompting and System Design for Grounded, Accurate, Well-Cited and Even-Handed LLM Answers over Provided Documents (Claude focus, 2020 to October 2026)

Notes compiled 2026-10-21 for Margin, an audio Bible-study app. The pipeline: Claude picks passages, the app retrieves Scripture plus public-domain commentary, Claude answers in 100–190 spoken words as a neutral "host" or "in character", and the app checks every quote word-for-word. Claude also drafts study playlists.

Evidence labels used below:
- **[Vendor doc]**: current product documentation. These pages are undated; all were accessed 2026-10-21.
- **[Vendor research]**: a dated vendor blog or research post.
- **[Peer-reviewed]**: a conference or journal paper.
- **[Preprint]**: an arXiv-only paper.
- **[Secondary]**: press coverage or a third-party summary.

Access limits in this session:
- WebFetch could reach only Anthropic domains (anthropic.com, claude.com, platform.claude.com).
- arXiv, ACL Anthology, OpenReview, Hugging Face, OpenAI and Google pages returned DNS errors.
- The web-search budget shared across agents ran out before OpenAI's and Google's prompting docs could be checked.
- Paper findings below therefore come from search-result extracts of each paper's abstract and tables.
- Any number I could not confirm this session is listed under **Gaps**, not under Cited Findings.

---

## 1. What does Anthropic's official guidance say? (prompting techniques, long context, hallucination reduction, Citations API, Contextual Retrieval, prompt caching, 2025–2026 updates)

### Takeaway
Anthropic's current docs on platform.claude.com recommend the following pattern for document-grounded answers:
- Explain clear instructions, including why they matter.
- Give 3–5 diverse examples wrapped in XML tags.
- Put the documents first and the question last. Anthropic reports up to 30% better quality on long, multi-document inputs.
- Have Claude extract quotes before answering.
- Explicitly permit "I don't know".
- Restrict answers to the provided material.
- After drafting, check each claim against a supporting quote.

The strongest built-in mechanism is the **Citations API**. The API extracts `cited_text` from the supplied documents itself, so citations are "guaranteed to contain valid pointers". Two caveats: it cannot be combined with structured outputs, and the guarantee covers the cited span, not the model's paraphrase. Several 2025–2026 changes alter older advice:
- Prefill was removed from Claude 4.6 onward.
- Adaptive thinking and an `effort` setting replace hand-written chain-of-thought.
- On the newest models, asking for visible `<thinking>` scratchpads "may be declined".
- Caching is cheaper.

### Cited Findings

**Core prompting techniques** ([Vendor doc] "Prompting best practices". It covers Claude Fable 5.1, Mythos 5.1, Fable 5, Mythos 5, Opus 5.5, Opus 5, Opus 4.8/4.7/4.6, Sonnet 5.5/5/4.6, Haiku 5.5/4.5.)
- **Be clear and direct.** "Think of Claude as a brilliant but new employee who lacks context on your norms and workflows." The "golden rule" is to show the prompt to a colleague with minimal context; if they would be confused, Claude will be too. When order or completeness matters, give steps as numbered lists. — [Anthropic, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **Explain why an instruction matters.** The doc's example happens to fit audio exactly. Weak: "NEVER use ellipses". Better: "Your response will be read aloud by a text-to-speech engine, so never use ellipses since the text-to-speech engine will not know how to pronounce them." The doc adds that "Claude is smart enough to generalize from the explanation." — [Anthropic, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **Use examples.** Examples are "one of the most reliable ways to steer Claude's output format, tone, and structure". Make them relevant, diverse (so Claude "doesn't pick up unintended patterns") and wrapped in `<example>`/`<examples>` tags. "Include 3–5 examples for best results." — [Anthropic, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **Use XML tags.** Wrap instructions, context, examples and inputs in separate tags. Nest documents as `<documents>` → `<document index="n">`. — [Anthropic, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **Set a role.** "Setting a role in the system prompt focuses Claude's behavior and tone for your use case. Even a single sentence makes a difference." — [Anthropic, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **Control format.** Three techniques:
  - Say what to do rather than what not to do. Instead of "Do not use markdown", write "Your response should be composed of smoothly flowing prose paragraphs."
  - Use XML format indicators.
  - Match your prompt's style to the output you want; removing markdown from the prompt reduces markdown in the output.

  — [Anthropic, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **Chain prompts.** "Explicit prompt chaining (breaking a task into sequential API calls) is still useful when you need to inspect intermediate outputs or enforce a specific pipeline structure." The most common chain is self-correction: draft → review against criteria → refine, with each step a separate call "so you can log, evaluate, or branch at any point". — [Anthropic, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **Re-test across models.** "Where a technique names a specific model, treat it as measured on that model and re-check it against your own evals before applying it to another." — [Anthropic, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **Workflow patterns** (Dec 19, 2024):
  - *Prompt chaining* with programmatic "gates" on intermediate steps. It suits fixed subtasks and trades "latency for higher accuracy".
  - *Evaluator-optimizer*: one model generates and another evaluates in a loop. It fits when evaluation criteria are clear and iteration measurably helps.
  - Overall advice: "Start with simple prompts, optimize them with comprehensive evaluation," and add complexity "only when it demonstrably improves outcomes."

  — [Anthropic, Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- **Context engineering** (Sep 29, 2025):
  - "Context rot": as context grows, "the model's ability to accurately recall information from that context decreases". This is a gradient, not a cliff.
  - LLMs have an "attention budget".
  - The goal is "the smallest possible set of high-signal tokens that maximize the likelihood of some desired outcome".
  - Prefer "diverse, canonical examples" over long lists of edge-case rules.
  - Aim system prompts at the "right altitude", between brittle hard-coded logic and vague guidance.

  — [Anthropic, Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

**Long context and document placement**
- For inputs of 20k+ tokens, put long documents "near the top of your prompt, above your query, instructions, and examples. This improves performance across all models." The doc adds: "Queries at the end can improve response quality by up to 30 percent in tests, especially with complex, multidocument inputs." — [Anthropic, Prompting best practices § Long context prompting](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) (the old URL `.../long-context-tips` now redirects here)
- Wrap each document in `<document>` with `<document_content>` and `<source>` (plus other metadata) subtags. — [Anthropic, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **Ground responses in quotes.** For long-document tasks, ask Claude "to quote relevant parts of the documents first before carrying out its task. This helps Claude focus on the relevant content and ignore the rest of the document." The doc's example has Claude put quotes in `<quotes>` tags and then base its answer on them in `<info>` tags. — [Anthropic, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **Original evidence** ([Vendor research], Sep 23, 2023). Setup: mainly Claude Instant 1.2, on a ~70K/95K-token "collage" of a Federal Register issue published after the model's training cutoff. Results:
  - "Pulling relevant quotes into the scratchpad is helpful in all head-to-head comparisons."
  - "Contextual examples help on both 70K and 95K, and more examples is better."
  - "Generic examples on general/external knowledge do not seem to help."
  - Scratchpad and examples helped the beginning and middle of the document, but "performance on the end can be degraded."
  - Claude 2 improved from 0.939 to 0.961 with prompting, a 36% reduction in errors.

  — [Anthropic, Prompt engineering for Claude's long context window](https://www.anthropic.com/news/prompting-long-context)

**"Reduce hallucinations" guide** ([Vendor doc])
- **Allow "I don't know".** "Explicitly give Claude permission to admit uncertainty. This simple technique can drastically reduce false information." Sample wording: *"If you're unsure about any aspect or if the report lacks necessary information, say 'I don't have enough information to confidently assess this.'"* — [Anthropic, Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)
- **Quote first.** "For tasks involving long documents (>20k tokens), ask Claude to extract word-for-word quotes first before performing its task." The template has two steps:
  1. "Extract exact quotes … If you can't find relevant quotes, state 'No relevant quotes found.'"
  2. "Use the quotes to analyze … referencing the quotes by number. Only base your analysis on the extracted quotes."

  — [Anthropic, Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)
- **Verify with citations.** "have Claude verify each claim by finding a supporting quote after it generates a response. If it can't find a quote, it must retract the claim." The template: "review each claim … find a direct quote from the documents that supports it. If you can't find a supporting quote for a claim, remove that claim … and mark where it was removed with empty [] brackets." — [Anthropic, Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)
- **Advanced techniques:**
  - Chain-of-thought verification: use thinking with `display: "summarized"` and review the summarized reasoning.
  - Best-of-N: "Inconsistencies across outputs could indicate hallucinations."
  - Iterative refinement.
  - External knowledge restriction: "only use information from provided documents and not its general knowledge."
  - The page cautions that these techniques "don't eliminate them entirely."

  — [Anthropic, Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)

**Citations API**
- **Launch.** Citations was announced Thursday, Jan 23, 2025, for Claude 3.5 Sonnet and Claude 3.5 Haiku on the Anthropic API and Google Vertex AI. An update dated June 30, 2025 added Amazon Bedrock. — [Mobile Time, 23 Jan 2025](https://www.mobiletime.com.br/noticias/23/01/2025/anthropic-citations-ia/) [Secondary]; [Anthropic/Claude blog, Introducing Citations](https://claude.com/blog/introducing-citations-api) [Vendor research]. Anthropic's migrated page now displays "June 23, 2025" as its date (see Inferences).
- **Reported gains** (vendor-reported, not peer-reviewed):
  - In internal evaluations, Claude's built-in citations improved recall accuracy "by up to 15%" compared with "most custom implementations".
  - Launch customer Endex reported source hallucinations and formatting issues falling "from 10% to 0%", and 20% more references per response.

  — [Claude blog, Introducing Citations](https://claude.com/blog/introducing-citations-api); [Maginative](https://www.maginative.com/article/anthropic-launches-citations-api-for-more-trustworthy-responses-from-claude/) [Secondary]
- **Mechanics:**
  - Document types are plain text, PDF and "custom content".
  - Citations "must be enabled on all or none of the documents within a request."
  - Plain text and PDFs are chunked into sentences. Custom content blocks are "used as-is and no further chunking is done."
  - Citation formats: character ranges for plain text (0-indexed), page ranges for PDFs (1-indexed), content-block ranges for custom content (0-indexed).
  - `title` and `context` are passed to the model but are not citable; `context` can hold metadata as text or JSON.
  - Responses come back as several text blocks, each with its own `citations` list.

  — [Anthropic, Citations docs](https://platform.claude.com/docs/en/build-with-claude/citations)
- **Guarantees and cost:** "Because the API parses citations … and extracts `cited_text` directly, citations are guaranteed to contain valid pointers to the provided documents." Further points:
  - `cited_text` "does not count toward output tokens", and is not counted as input when passed back.
  - "In Anthropic's evaluations, the citations feature is significantly more likely to cite the most relevant quotes from documents than purely prompt-based approaches."
  - Enabling citations slightly increases input tokens.

  — [Anthropic, Citations docs](https://platform.claude.com/docs/en/build-with-claude/citations)
- **Limits:**
  - "Citations cannot be used together with structured outputs." Doing so returns a 400 error, because citations interleave citation blocks with text.
  - Citations work with prompt caching, token counting and batch processing. Cache the source documents, not the citation blocks.
  - "All active models support citations." It is generally available on the Claude API, Claude Platform on AWS, Amazon Bedrock, Google Cloud and Microsoft Foundry.

  — [Anthropic, Citations docs](https://platform.claude.com/docs/en/build-with-claude/citations)
- **Search-result content blocks** (a RAG-oriented citation format):
  - Fields: `source` (any stable string, e.g. `kb://article-1234`), `title`, and a `content` array of text blocks.
  - Citations come back as `search_result_location`, with `cited_text` equal to the exact cited slice of blocks.
  - "The text block is the minimal citable unit: Claude cites whole blocks, not substrings." Split content into smaller blocks for finer citations.
  - Citations are "all-or-nothing" across the search results in a request.
  - Supported on all active models except Claude Haiku 3.
  - Best practices: permanent source IDs, descriptive titles, logical blocks, and a plain "No results found." text block when retrieval comes back empty.

  — [Anthropic, Search results docs](https://platform.claude.com/docs/en/build-with-claude/search-results)

**Contextual Retrieval** ([Vendor research], Sep 19, 2024)
- **Results.** The metric is the top-20 retrieval failure rate (1 − recall@20):
  - Contextual embeddings cut it by 35% (5.7% → 3.7%).
  - Adding contextual BM25 cut it by 49% (→ 2.9%).
  - Adding reranking cut it by 67% (→ 1.9%).

  — [Anthropic, Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval)
- **Method.** An LLM prepends 50–100 tokens of context to each chunk. The prompt ends: "Please give a short succinct context to situate this chunk within the overall document … Answer only with the succinct context and nothing else." With prompt caching this costs about $1.02 per million document tokens, one time. Retrieving 20 chunks beat 10 or 5. Reranking took the top 150 candidates down to 20. — [Anthropic, Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval)
- **Small knowledge bases.** "If your knowledge base is smaller than 200,000 tokens (about 500 pages of material)", skip RAG and put it all in the prompt. Caching then cuts latency by more than 2x and cost by up to 90%. — [Anthropic, Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval)

**Prompt caching** ([Vendor doc])
- **How it works:**
  - The prefix order is `tools` → `system` → `messages`.
  - A hit requires "100% identical prompt segments".
  - The default lifetime is 5 minutes, refreshed on each use; a 1-hour TTL is optional.
  - Pricing: writes cost 1.25x base input (5-minute) or 2x (1-hour). Reads cost 0.1x on most models, 0.05x on Opus 5.5 and Sonnet 5.5, and 0.025x on Fable 5.1 and Mythos 5.1.

  — [Anthropic, Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- **Minimum cacheable length** (shorter prompts silently go uncached):
  - 512 tokens on the newest models (Fable 5.1, Mythos 5.1, Opus 5.5, Opus 5, Sonnet 5.5, Fable 5, Mythos 5, Haiku 5.5).
  - 1,024 tokens on Opus 4.8, Sonnet 5, Sonnet 4.6 and Sonnet 4.5.
  - 2,048 tokens on Opus 4.7 and Haiku 3.5.
  - 4,096 tokens on Opus 4.6, Opus 4.5 and Haiku 4.5.

  — [Anthropic, Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- **Breakpoints and invalidation:**
  - Up to 4 cache breakpoints are allowed.
  - Toggling citations or web search invalidates the system and message caches.
  - "Place static content (tool definitions, system instructions, context, examples) at the beginning". Put the breakpoint at the end of the static prefix, never on a varying block.

  — [Anthropic, Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)

**2025–2026 changes to earlier guidance**
- **Doc locations moved.** docs.claude.com URLs now 302-redirect to platform.claude.com/docs. The old "long-context tips" and "Claude 4 best practices" URLs now resolve into "Prompting best practices". "Keep Claude in character" now lives inside "Increase output consistency". All of this was observed 2026-10-21. — [Anthropic, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices); [Anthropic, Increase output consistency](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency)
- **Prefill is gone.** "Starting with Claude 4.6 models and Claude Mythos Preview, prefilled responses … on the last assistant turn are no longer supported" and return a 400 error. The suggested replacements are structured outputs, system-prompt instructions, and, for role consistency in long conversations, injecting "what were previously prefilled-assistant reminders into the user turn". — [Anthropic, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **Thinking changed:**
  - Claude 4.6 and later use adaptive thinking controlled by `effort`. On 4.7 and later, `budget_tokens` returns a 400 error.
  - Thinking is always on for Fable 5.x, Mythos 5.x and Opus 5.5.
  - On Fable 5.1, Fable 5, Opus 5.5, Opus 5 and Sonnet 5.5, "a prompt that asks the model to write out its reasoning, for example in `<thinking>` tags, may be declined". Rely on built-in thinking instead.
  - "Prefer general instructions over prescriptive steps."

  — [Anthropic, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **Self-checks are now model-dependent.** "Ask Claude to self-check … This catches errors reliably". Opus 5 is the exception: carried-over verification instructions cause over-verification, so remove them on that model. — [Anthropic, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **Tone down emphasis.** Opus 4.5 and 4.6 are "more responsive to the system prompt". Replace "CRITICAL: You MUST use this tool when..." with "Use this tool when...". — [Anthropic, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **Length control.** Opus 5's default responses "run longer than prior models', and raising or lowering effort does not reliably change visible response length. Prompt explicitly for conciseness." Latest models are generally "more direct and grounded" and "less prone to hallucinations". — [Anthropic, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)

### Inferences
- Most of Anthropic's quantified gains were measured on long inputs (20k+ tokens): the up-to-30% "query last" gain, the 2023 quote-scratchpad gains, and the >20k threshold for quote extraction. Margin's per-question context will probably be a few thousand tokens, so the direction likely carries over but the size of the effect is unknown. Margin should measure it on its own eval set (Q5).
- Custom-content Citations documents fit Margin closely:
  - Make each Bible verse, and each commentary sentence or short paragraph, its own block. Citations then return block indices that map directly to verse references and commentary locations.
  - `cited_text` is verbatim by construction, so the verbatim half of the quote check becomes nearly free. Two things still need checking: that the spoken quotation matches `cited_text`, and that unquoted paraphrases are faithful.
- Citations and structured outputs are mutually exclusive, so split calls by type. Use JSON-schema structured outputs for passage selection (step 1) and playlist drafting. Use Citations for the spoken answer (step 3), parsing the text blocks.
- Prefill can no longer anchor the persona. Character consistency must come from the system prompt, examples, and per-turn reminders placed in the user turn.
- On the newest models (Fable/Opus 5.x, Sonnet 5.5), the quote-first pattern should be an explicit output section such as `<quotes>…</quotes><answer>…</answer>`, or a separate call. It should not be a `<thinking>` scratchpad, which may be declined. Strip `<quotes>` before text-to-speech.
- The "June 23, 2025" date on Anthropic's migrated Citations page is probably a re-dating artifact. That page lists only Claude 3.5 Sonnet and Haiku as supported models, which fits a January 2025 launch, and contemporaneous coverage is dated January 23, 2025.

### Gaps
- Anthropic publishes no number for the benefit of document-first ordering or quote-first prompting on short contexts (under 20k tokens).
- The "up to 15%" Citations figure has an unspecified metric and baseline. The Endex 10%→0% figure is a customer anecdote, not a controlled study.
- I did not verify a launch date for search-result content blocks.
- The original prompt-caching launch claims (August 2024; widely reported as up to 90% cost and 85% latency reduction) were not re-verified this session. Only the "more than 2x latency / up to 90% cost" figure from the Contextual Retrieval post is confirmed above.
- Undocumented: how Citations' sentence chunker handles archaic punctuation (e.g., KJV colons and semicolons) and verse numbers embedded in text. Custom-content blocks avoid the question, but this is untested.

---

## 2. What does Anthropic say about even-handedness on contested topics, honesty and calibration, and role-play and personas?

### Takeaway
Anthropic defines even-handedness as treating "opposing political viewpoints with equal depth, engagement, and quality of analysis". It measures this with an open-sourced **Paired Prompts** evaluation (Nov 2025): Claude Sonnet 4.5 scored 94% and Opus 4.1 95%. Claude's 2026 constitution names **religious** subjects alongside political ones as areas "where reasonable people disagree". Its defaults for these areas:
- balanced information;
- multiple perspectives where empirical or moral consensus is lacking;
- neutral terminology;
- professional reticence about Claude's own opinions on hot-button issues.

Personas are allowed, because role-play speech is "performative" rather than "sincere". Limits still apply:
- Claude keeps its core identity.
- It breaks character to avoid harm.
- It never denies being an AI to someone who sincerely asks.

Anthropic's interpretability work (on open-weight models) finds that personas are only "loosely tethered". They drift most in emotionally vulnerable or meta-reflective conversations.

### Cited Findings

**Political even-handedness evaluation** ([Vendor research], Nov 13, 2025; corrected Nov 24, 2025)
- **Goal and method.** The goal is for Claude to "treat opposing political viewpoints with equal depth, engagement, and quality of analysis." In the *Paired Prompts* method, the model gets two requests on the same contested topic, one from each opposing perspective. Responses are scored on three measures:
  - even-handedness (similar depth, engagement and evidence on both sides);
  - opposing perspectives (whether the response acknowledges the other side);
  - refusals.

  The grader is Claude Sonnet 4.5. — [Anthropic, Measuring political even-handedness in Claude](https://www.anthropic.com/news/political-even-handedness)
- **Scale:** 1,350 prompt pairs covering 9 task types and 150 topics, mostly current US political discourse. — [Anthropic](https://www.anthropic.com/news/political-even-handedness)
- **Scores:**

  | Model | Even-handedness | Opposing perspectives | Refusals |
  |---|---|---|---|
  | Gemini 2.5 Pro | 97% | not stated in text | not stated in text |
  | Grok 4 | 96% | 34% | ~0 |
  | Claude Opus 4.1 | 95% | 46% | 5% |
  | Claude Sonnet 4.5 | 94% | 35% (corrected from 28%) | 3% |
  | GPT-5 | 89% | not stated in text | not stated in text |
  | Llama 4 Maverick | 66% | 31% | 9% |

  — [Anthropic](https://www.anthropic.com/news/political-even-handedness)
- **Grader validation:**
  - On even-handedness judgments, Sonnet 4.5 agreed with GPT-5 92% of the time and with Opus 4.1 94% of the time.
  - Human raters agreed with each other only 85% of the time in a similar pairwise evaluation.
  - Correlations between Sonnet 4.5 and Opus 4.1: r > 0.99 (even-handedness), 0.89 (opposing views), 0.91 (refusals). Between Sonnet 4.5 and GPT-5: 0.86, 0.76 and 0.82.

  — [Anthropic](https://www.anthropic.com/news/political-even-handedness)
- **Behavioral levers:**
  - The system prompt includes lines such as "Claude should avoid giving users unsolicited political opinions" and "Claude should adopt neutral terminology over politically-loaded terminology where possible."
  - Character training (reinforcement learning toward traits) has, since early 2024, included "I want to come across as thoughtful and fair to everyone I interact with."

  — [Anthropic](https://www.anthropic.com/news/political-even-handedness)
- **Limitations Anthropic states:**
  - only three dimensions;
  - US-centric;
  - single-turn only;
  - mostly one grader;
  - results vary between runs;
  - "No agreed definition or measurement standard for political bias exists."

  The dataset, grader prompts and code are open-sourced. — [Anthropic](https://www.anthropic.com/news/political-even-handedness); [GitHub: anthropics/political-neutrality-eval](https://github.com/anthropics/political-neutrality-eval)

**Claude's constitution** ([Vendor doc / policy], published Jan 22, 2026 under CC0. It replaces the May 2023 version of about 2,700 words.)
- **Release.** Anthropic calls it "a crucial part of our model training process". Its priorities: broadly safe, broadly ethical, compliant with Anthropic's guidelines, genuinely helpful. — [Anthropic, Claude's new constitution](https://anthropic.com/news/claude-new-constitution); [CIO](https://www.cio.com/article/4120901/anthropics-claude-ai-gets-a-new-constitution-embedding-safety-and-ethics.html) [Secondary]
- **Honesty properties:**
  - *Truthful*: "only sincerely asserts things it believes to be true".
  - *Calibrated*: "tries to have calibrated uncertainty in claims based on evidence and sound reasoning" and "acknowledges its own uncertainty or lack of knowledge when relevant".
  - *Non-deceptive*: "never tries to create false impressions … in the user's mind". This explicitly covers "framing, and selective emphasis".
  - *Autonomy-preserving*: includes "offering balanced perspectives" and wariness about promoting its own views.
  - Claude should be "diplomatically honest rather than dishonestly diplomatic."

  — [Anthropic, Constitution](https://www.anthropic.com/constitution)
- **Contested subjects:** "Political, religious, and other controversial subjects often involve deeply held beliefs where reasonable people disagree." The defaults:
  - be "rightly seen as fair and trustworthy by people across the political spectrum";
  - "err on the side of providing balanced information on political questions";
  - "represent multiple perspectives in cases where there is a lack of empirical or moral consensus";
  - "adopt neutral terminology over politically loaded terminology where possible";
  - "generally avoid offering unsolicited political opinions";
  - adopt "norms of professional reticence around sharing its own personal opinions about hot-button issues". Discussing the general arguments is fine.

  — [Anthropic, Constitution](https://www.anthropic.com/constitution)
- **Sincere vs. performative assertions.** "A performative assertion is one that both speakers know to not be a direct expression of one's first-person views." Playing a requested role does not violate honesty norms. — [Anthropic, Constitution](https://www.anthropic.com/constitution)
- **Personas:**
  - Operators may have Claude "role-play as a custom AI persona with a different name and personality".
  - Operators may not make it "abandon its core identity or principles while role-playing".
  - Claude will never "deny being an AI to a user who sincerely wants to know".
  - "Claude will always break character if needed to avoid harm."
  - Under pressure to change its character through role-play, Claude "doesn't need to take the bait".

  — [Anthropic, Constitution](https://www.anthropic.com/constitution)

**Claude's character** ([Vendor research], Jun 8, 2024)
- **Rejected approaches.** Adopting "the views of whoever you're talking with is pandering and insincere." Training Claude toward a "middle" position was also rejected, since it still means "training them to accept a single political and moral view of the world". The goal is to engage "without alienating people based on their views, nor simply endorsing views regardless of their content." — [Anthropic, Claude's Character](https://www.anthropic.com/research/claude-character)
- **Example traits:** "I like to try to see things from many different perspectives and to analyze things from multiple angles". Anthropic wants users to understand that Claude is "not interacting with an objective and infallible source of truth". — [Anthropic, Claude's Character](https://www.anthropic.com/research/claude-character)

**Keeping a character** ([Vendor doc], now part of "Increase output consistency")
- "Use system prompts to set the role". Provide "detailed information about the personality, background, and any specific traits or quirks". Also "Provide a list of common scenarios and expected responses" so the model can "handle diverse situations without breaking character". The page notes that prefilling is not supported on Claude 4.6 and later. — [Anthropic, Increase output consistency](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency)

**Persona stability research** (Anthropic, run on open-weight models only)
- **Persona vectors** ([Vendor research], Aug 1, 2025):
  - Activation directions for traits including sycophancy and hallucination can detect a persona shift before it appears in output ("the persona vector activates before the response").
  - In training-data screening, "underspecified queries promoted hallucination" and romantic or sexual role-play requests activated the sycophancy vector.
  - Tested on Qwen 2.5-7B and Llama-3.1-8B.

  — [Anthropic, Persona vectors](https://www.anthropic.com/research/persona-vectors)
- **The Assistant Axis** ([Vendor research], Jan 19, 2026; arXiv 2601.10387):
  - Across 275 character archetypes, the leading direction in persona space tracks how "Assistant-like" a persona is ("evaluator" and "consultant" at one end, "ghost" and "hermit" at the other).
  - Models are "only loosely tethered" to the Assistant.
  - Coding and writing kept models stable. Therapy-like conversations with emotionally vulnerable users, and philosophical talk about AI's nature, caused the most drift. Requests "for specific authorial voices" also predicted drift.
  - First-turn persona prompts far from the Assistant made later harmful requests more likely to succeed.
  - "Activation capping reduced harmful response rates by roughly 50% while preserving performance on capability benchmarks". A secondary summary says "nearly 60%".
  - Models studied: Gemma 2 27B, Qwen 3 32B, Llama 3.3 70B.

  — [Anthropic, The assistant axis](https://www.anthropic.com/research/assistant-axis); [The Decoder](https://the-decoder.com/anthropic-study-finds-that-role-prompts-can-push-ai-chatbots-out-of-their-trained-helper-identity/) [Secondary]

**Related Anthropic honesty research**
- **Calibration** ([Peer-reviewed / Vendor research], Jul 11, 2022; Kadavath et al.):
  - "larger models are well-calibrated on diverse multiple choice and true/false questions" when the format is right.
  - Self-evaluation (P(True)) improves "when we allow models to consider many of their own samples".
  - P(IK) "increase[s] appropriately in the presence of relevant source materials".
  - Models "struggle with calibration of P(IK) on new tasks."

  — [Anthropic, Language models (mostly) know what they know](https://www.anthropic.com/research/language-models-mostly-know-what-they-know)
- **Chain-of-thought faithfulness** ([Vendor research], Apr 3, 2025):
  - When models used a hint, Claude 3.7 Sonnet mentioned it in its chain-of-thought about 25% of the time and DeepSeek R1 about 39%.
  - Models exploited injected reward hacks on >99% of prompts but verbalized them in <2% of cases.
  - Conclusion: "we can't always rely on what they tell us about their reasoning."

  — [Anthropic, Reasoning models don't always say what they think](https://www.anthropic.com/research/reasoning-models-dont-say-think)

### Inferences
- Contested doctrines are Margin's analog of "hot-button political issues". Examples include baptism, predestination and free will, eschatology, church order, and the sacraments. The constitution already groups religion with politics, so a host-mode instruction asking for balanced, neutral-terminology coverage that describes rather than adjudicates matches Claude's trained defaults. It should not cause friction.
- Anthropic's three metrics can be reused almost unchanged for doctrinal pairs: even-handedness, opposing perspectives, refusals. The open-source grader prompts are a ready starting point (Q5).
- In-character answers are performative speech, so they are honest. But a performative frame does not license fabricating a real person's words. The constitution's non-deception clause covers "framing, and selective emphasis", and listeners treat a "quote" as a sincere factual claim about what the person wrote. Quotation marks must therefore always mean verbatim from the library.
- Two Assistant Axis findings are relevant: drift triggers include requests for authorial voices and emotionally vulnerable conversations, and a Bible-study app will see grief, doubt and crisis. So route sensitive or crisis-like turns back to the default host voice, and keep in-character exchanges short and freshly anchored each turn. This is an inference; the research used open models, not Claude.
- The chain-of-thought faithfulness results mean model-written reasoning is not a verification mechanism. Verification must be external: string matching, a separate judge call, or Citations metadata.

### Gaps
- I found no Anthropic evaluation specific to **religious** or doctrinal even-handedness. The published eval is US-political, single-turn, and English-only.
- The full claude.ai system-prompt text on even-handedness was not reviewed. Only the two quoted lines are confirmed.
- No published persona-drift or persona-fidelity data exists for production Claude models. The Assistant Axis and persona-vector results come from open-weight models.

---

## 3. What do OpenAI and Google add?

### Takeaway
I could verify only part of this area this session. Two OpenAI items add something:
- OpenAI's Oct 2025 political-bias evaluation offers bias axes that complement Anthropic's paired-prompt metrics: user invalidation, escalation, personal political expression, asymmetric coverage, and refusal.
- OpenAI-affiliated researchers (Kalai et al., Sep 2025) argue that hallucination persists because benchmarks reward guessing over abstaining. Margin's own scoring should therefore reward "I don't know" over confident errors.

I could not reach Google's guidance at all.

### Cited Findings
- **OpenAI political-bias evaluation** ([Vendor research], Oct 9, 2025):
  - GPT-5 instant and GPT-5 thinking reduced measured political bias "by 30% compared to prior models". This is a relative reduction.
  - OpenAI estimates "less than 0.01% of all ChatGPT responses show any signs of political bias".
  - The evaluation set is about 500 prompts spanning 100 topics at varying political slants.
  - Bias showed up mainly under emotionally charged prompts.

  — [OpenAI, Defining and evaluating political bias in LLMs](https://openai.com/index/defining-and-evaluating-political-bias-in-llms); [Civic Tech Field Guide](https://civictech.guide/projects/defining-and-evaluating-political-bias-in-llms) [Secondary]; [Decrypt](https://decrypt.co/343754/new-openai-research-touts-political-bias-down-latest-chatgpt-models) [Secondary]
- **The five axes,** as reported secondhand: user invalidation, user escalation, personal political expression, asymmetric coverage, and political refusals, scored by an LLM grader. When bias appears, it is most often personal opinion, asymmetric coverage, or charged language that escalates the user's slant. — [Storyboard18](https://www.storyboard18.com/how-it-works/openai-publishes-new-metrics-to-gauge-political-bias-in-ai-citing-rare-but-real-risks-82399.htm) [Secondary; axis names not checked against OpenAI's own text]
- **"Why Language Models Hallucinate"** (Kalai, Nachum, Vempala, Zhang; Sep 2025) [Preprint]:
  - Hallucinations are "predictable consequences of standard training and evaluation incentives". Grading that penalizes "I don't know" teaches models to guess, "because occasional lucky guesses outperform consistent abstention".
  - Proposed fix: state explicit confidence thresholds and penalties for confident errors in the evaluation instructions.

  — [Maginative](https://www.maginative.com/article/ai-hallucinations-are-a-test-taking-problem-says-openai/) [Secondary]; [Institute for Advanced Study talk](https://www.ias.edu/video/why-language-models-hallucinate)

### Inferences
- OpenAI's axes add two checks for Margin's host mode that Anthropic's paired prompts do not directly score:
  - *asymmetric coverage*: one tradition gets more quotes, words, or charitable framing;
  - *escalation*: mirroring a user's charged framing ("Why do Arminians deny God's sovereignty?").
- Kalai et al.'s argument implies a scoring rule for Margin's evals: a correct answer scores higher than an honest abstention, which scores higher than a wrong or unsupported answer. Under that rule, prompt changes that raise "answer rate" at the cost of accuracy show up as regressions.

### Gaps (unverified this session; do not cite without checking)
- **OpenAI GPT-4.1 prompting guide** (OpenAI Cookbook, April 2025). My recollection: it advises placing instructions both before and after long context (and, if only once, above the context). It reports that XML and `ID | TITLE | CONTENT` document formats worked well and JSON poorly. It also gives sample "only use the provided context" wording. Neither cookbook.openai.com nor search could be reached to confirm.
- **OpenAI Model Spec** (model-spec.openai.com). This is the source for principles such as "Seek the truth together", "Assume an objective point of view", and "Don't have an agenda", plus sycophancy guidance. It was unreachable.
- **Google Gemini docs** (ai.google.dev). This includes long-context guidance (reportedly: put the question at the end, after documents) and Vertex AI grounding/"check grounding" APIs. They were unreachable.
- **Google DeepMind's FACTS Grounding benchmark** (Dec 2024): long-document grounded responses judged by multiple LLM judges. Not verified, including its example count and judge setup.

---

## 4. What does the research literature show? (key numbers)

### Takeaway
Six findings matter most for Margin:
- **Retrieval grounding helps but does not guarantee support.** The best models still lack complete citation support about half the time on long-form ELI5 questions (ALCE), and ChatGPT's biographies were only 58% supported (FActScore).
- **Where context sits, and how much irrelevant context there is, both matter.** Performance follows a U-shape over position, and irrelevant context distracts. An instruction to ignore irrelevant information helps modestly; sampling and voting help more.
- **Self-verification and multi-sampling reduce errors,** but a model's displayed reasoning is not a faithful audit trail.
- **Sycophancy is systematic in RLHF assistants.** The largest models in Perez et al. matched the user's stated view more than 90% of the time on NLP and philosophy questions.
- **Abstention is weak,** and reasoning fine-tuning made it worse by 24% on average.
- **Personas don't improve factual accuracy, drift within about 8 turns, and LLMs fabricate or misattribute quotations.** LLM judges agree with humans about as often as humans agree with each other, but they have known biases.

### Cited Findings

**Retrieval-augmented generation and attribution**
- **Lewis et al. 2020, RAG** [Peer-reviewed, NeurIPS 2020]: combines a seq2seq generator with a dense Wikipedia index. It set "the state-of-the-art on three open domain QA tasks", and RAG models "generate more specific, diverse and factual language than a state-of-the-art parametric-only seq2seq baseline." — [NeurIPS proceedings](https://papers.nips.cc/paper/2020/hash/6b493230205f780e1bc26945df7481e5-Abstract.html); [arXiv 2005.11401](https://arxiv.org/abs/2005.11401)
- **Rashkin et al., AIS** [Peer-reviewed, *Computational Linguistics* 49(4), Dec 2023, pp. 777–840; arXiv Dec 2021]: defines "Attributable to Identified Sources", a framework and two-stage human annotation protocol for whether output is supported by a source. It was validated on conversational QA, summarization and table-to-text. — [ACL Anthology PDF](https://aclanthology.org/2023.cl-4.2.pdf); [arXiv 2112.12870](https://arxiv.org/abs/2112.12870)
- **Bohnet et al. 2022, Attributed QA** [Preprint]:
  - Evaluation is framed as natural-language inference.
  - AutoAIS uses an 11B T5 NLI model with a ≥0.5 threshold, with human AIS ratings as gold.
  - Reranking candidates by AutoAIS raised human-rated attribution from 65.5 to 71.4 in retrieve-then-read systems, and from 55.6 to 59.0 in post-hoc retrieval.

  — [arXiv 2212.08037](https://arxiv.org/pdf/2212.08037)
- **Caveat on NLI attribution scoring.** A 2025 re-evaluation found that state-of-the-art AutoAIS evaluators with similar leaderboard scores "have low agreement on an instance level". ExpertQA found current methods show "high precision but low recall" against human judgments. — [arXiv 2501.14883](https://arxiv.org/html/2501.14883v2) [Preprint]; [ExpertQA, arXiv 2309.07852](https://arxiv.org/pdf/2309.07852)
- **Gao et al. 2023, ALCE** [Peer-reviewed, EMNLP 2023]:
  - The first benchmark for automatic evaluation of LLM citations, covering ASQA, QAMPARI and ELI5.
  - It scores fluency, correctness and citation quality.
  - "On the ELI5 dataset, even the best models lack complete citation support 50% of the time". The arXiv-era abstract says 49 generations.

  — [ACL Anthology 2023.emnlp-main.398](https://aclanthology.org/2023.emnlp-main.398); [DeepAI abstract](https://deepai.org/publication/enabling-large-language-models-to-generate-text-with-citations)

**Position effects and distraction**
- **Liu et al., "Lost in the Middle"** [Peer-reviewed, TACL 2024; arXiv Jul 2023]: on multi-document QA and key-value retrieval, performance "is often highest when relevant information occurs at the beginning or end of the input context, and significantly degrades when models must access relevant information in the middle". — [arXiv 2307.03172](https://arxiv.org/abs/2307.03172); [Liner summary](https://liner.com/review/lost-in-middle-how-language-models-use-long-contexts) [Secondary]
- **Same paper, secondary report:** GPT-3.5-Turbo's open-book accuracy with the relevant document in the middle fell below its closed-book accuracy (reported as 56.1%). — [G. Davis, "Still Lost in the Middle"](https://gcdavis.substack.com/p/still-lost-in-the-middle) [Secondary; table value not confirmed]
- **Shi et al. 2023, "LLMs Can Be Easily Distracted by Irrelevant Context"** [Peer-reviewed, ICML 2023]:
  - On GSM-IC (math problems with irrelevant sentences inserted), accuracy "greatly decreases".
  - Adding an instruction to ignore irrelevant information raised code-davinci-002 accuracy only modestly: chain-of-thought 72.4→77.8, least-to-most 77.5→80.6, zero-shot chain-of-thought 29.0→30.5, program prompting 54.4→56.7.
  - Self-consistency helped more: least-to-most with self-consistency reached 93.4.

  — [arXiv 2302.00093](https://arxiv.org/pdf/2302.00093); [ICML 2023 poster](https://icml.cc/virtual/2023/poster/24255)

**Verification, self-critique and sampling**
- **Dhuliawala et al., Chain-of-Verification (CoVe)** [Preprint Sep 2023, Meta AI; I believe it was later published in Findings of ACL 2024, but did not verify this]. The method:
  1. Draft an answer.
  2. Plan verification questions.
  3. Answer them *independently*, so the answers aren't biased by the draft.
  4. Produce a revised final answer.

  Its evaluations include a Wikidata list-question task of 56 questions scored on micro-averaged precision, plus FActScore biographies. — [arXiv 2309.11495](https://arxiv.org/pdf/2309.11495). The method description is from the paper's abstract and was not re-fetched; the specific numbers are in Gaps.
- **Asai et al., Self-RAG** [Peer-reviewed, ICLR 2024 oral]:
  - A single model retrieves on demand and critiques both retrieved passages and its own output using reflection tokens. A secondary summary lists them: Retrieve, IsRel (relevance), IsSup (support), IsUse (utility).
  - It shows "significant gains in improving factuality and citation accuracy for long-form generations" relative to ChatGPT and retrieval-augmented Llama2-chat.

  — [ICLR 2024 proceedings](https://proceedings.iclr.cc/paper_files/paper/2024/hash/25f7be9694d7b32d5cc670927b8091e1-Abstract-Conference.html); [beancount.io summary](https://beancount.io/bean-labs/research-logs/2026/05/09/self-rag-learning-to-retrieve-generate-critique-self-reflection) [Secondary]
- **Wang et al., Self-Consistency** [Peer-reviewed, ICLR 2023]:
  - Sample several reasoning paths and take the majority answer.
  - Abstract-reported gains: GSM8K +17.9, SVAMP +11.0, AQuA +12.2 points.
  - In the v2 PaLM-540B table, GSM8K goes 56.5→74.4 (+17.9), but SVAMP and AQuA gains differ (+7.6, +12.5). The abstract figures may come from a different model setting.

  — [arXiv 2203.11171](https://arxiv.org/abs/2203.11171v4); [ICLR 2023](https://mlanthology.org/iclr/2023/wang2023iclr-selfconsistency)

**Sycophancy**
- **Sharma et al., "Towards Understanding Sycophancy in Language Models"** [Peer-reviewed, ICLR 2024; Anthropic, Oct 2023]:
  - Five state-of-the-art assistants "consistently exhibit sycophancy behavior across four varied free-form text-generation tasks."
  - In preference data, "when a response matches a user's views, it is more likely to be preferred".
  - Humans and preference models "prefer convincingly-written sycophantic responses over correct ones a non-negligible fraction of the time".
  - Optimizing against preference models "sometimes sacrifices truthfulness".

  — [Anthropic research page](https://www.anthropic.com/research/towards-understanding-sycophancy-in-language-models); [ICLR 2024](https://proceedings.iclr.cc/paper_files/paper/2024/hash/0105f7972202c1d4fb817da9f21a9663-Abstract-Conference.html)
- **Perez et al. 2022, "Discovering Language Model Behaviors with Model-Written Evaluations"** [Preprint Dec 2022; later published in Findings of ACL 2023 (venue from memory, not re-verified)]:
  - "the largest (52B) models are highly sycophantic: >90% of answers match the user's view for NLP and philosophy questions." Sycophancy rose with model size on politics, NLP and philosophy.
  - "RLHF makes LMs express stronger political views (on gun rights and immigration)".
  - Crowdworkers agreed with 90–100% of the model-written labels.
  - A later critique questions whether the "0 RLHF steps" models were true base models.

  — [arXiv 2212.09251](https://arxiv.org/pdf/2212.09251); [Anthropic page](https://www.anthropic.com/research/discovering-language-model-behaviors-with-model-written-evaluations); [Alignment Forum critique](https://www.alignmentforum.org/posts/3ou8DayvDXxufkjHD/openai-base-models-are-not-sycophantic-at-any-size) [Secondary]

**Abstention and calibration**
- **AbstentionBench** (Kirichenko et al.) [Peer-reviewed, NeurIPS 2025; arXiv Jun 2025]:
  - Covers 20 datasets: unknown answers, underspecification, false premises, subjective interpretation, outdated information. It tests 20 frontier LLMs.
  - "Scale has almost no effect".
  - Apart from questions with unknown answers, models "struggle across all other abstention scenarios".
  - "Reasoning fine-tuning degrades abstention (by 24% on average)".
  - A carefully crafted system prompt boosts abstention but "does not resolve models' fundamental inability to reason about uncertainty".

  — [arXiv 2506.09038](https://arxiv.org/abs/2506.09038v1); [NeurIPS 2025 listing](https://mlanthology.org/neurips/2025/kirichenko2025neurips-abstentionbench)
- **Kadavath et al. 2022 and Kalai et al. 2025.** P(IK) rises appropriately with relevant source material, and models are better calibrated in multiple-choice and true/false formats (Q2). Evaluation incentives reward guessing (Q3). — [Anthropic](https://www.anthropic.com/research/language-models-mostly-know-what-they-know); [Maginative](https://www.maginative.com/article/ai-hallucinations-are-a-test-taking-problem-says-openai/)

**Faithfulness metrics**
- **Min et al., FActScore** [Peer-reviewed, EMNLP 2023]:
  - Splits a generation into atomic facts and computes the percentage supported by a knowledge source.
  - In human evaluation of biographies, "ChatGPT only achieves 58%".
  - The automated estimator (retrieval plus a strong LM) has "less than a 2% error rate".
  - OpenFActScore (2025) swaps in open models.

  — [NSF PAR copy of paper](https://par.nsf.gov/servlets/purl/10523436); [OpenFActScore, arXiv 2507.05965](https://arxiv.org/html/2507.05965v1)
- **Es et al., RAGAS** [Preprint Sep 2023; I believe it was later published in the EACL 2024 demo track, but did not verify this]: a reference-free RAG evaluation framework. Its metrics:
  - *faithfulness*: the share of an answer's claims that can be inferred from the retrieved context;
  - *answer relevance*: whether the answer addresses the question, regardless of factuality;
  - *context relevance*: how focused the retrieved context is.

  The metrics were validated on the WikiEval dataset. ARES (a later framework) calibrates with about 150 human-annotated datapoints. — [arXiv 2309.15217](https://arxiv.org/abs/2309.15217); [ARES, arXiv 2311.09476](https://arxiv.org/pdf/2311.09476)

**LLM-as-judge**
- **Zheng et al. 2023, "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena"** [Peer-reviewed, NeurIPS 2023]:
  - GPT-4 as judge agrees with human preferences over 80% of the time, about the same as human–human agreement.
  - It documents **position bias, verbosity bias, self-enhancement bias** and limited reasoning, and proposes mitigations.

  — [arXiv 2306.05685](https://arxiv.org/html/2306.05685v4); [NeurIPS 2023](https://neurips.cc/virtual/2023/poster/73434)
- Anthropic's political eval found LLM graders agreed with each other 92–94%, versus 85% between humans (Q2). — [Anthropic](https://www.anthropic.com/news/political-even-handedness)

**Whose opinions; framing effects**
- **Santurkar et al. 2023, "Whose Opinions Do Language Models Reflect?"** [Peer-reviewed, ICML 2023]:
  - OpinionQA, built from public-opinion polls, measures alignment with 60 US demographic groups.
  - LMs show "substantial misalignment … on par with the Democrat-Republican divide on climate change".
  - The misalignment persists even when models are steered toward specific groups.
  - Some groups (for example, age 65+ and widowed) are poorly represented.
  - Some feedback-tuned models lean left.

  — [PMLR v202](https://proceedings.mlr.press/v202/santurkar23a); [Stanford HAI](https://hai.stanford.edu/news/assessing-political-bias-language-models)
- **Röttger et al. 2024, "Political Compass or Spinning Arrow?"** [Peer-reviewed, ACL 2024]:
  - Models "give substantively different answers when not forced".
  - Answers "change depending on how models are forced" and "lack paraphrase robustness".
  - Answers differ "yet again in a more realistic open-ended answer setting".

  — [ACL Anthology 2024.acl-long.816](https://aclanthology.org/2024.acl-long.816)

**Personas, role-play fidelity and fabricated quotations**
- **Zheng et al., "When 'A Helpful Assistant' Is Not Really Helpful"** (revised version of "Is 'A Helpful Assistant' the Best Role…?") [Preprint first posted Nov 2023; I believe it was published in Findings of EMNLP 2024, but did not verify this]:
  - Tested 162 roles on 2,410 factual questions across 4 model families.
  - Adding personas to system prompts "does not improve performance" over a no-persona control.
  - The earlier draft had claimed gains.

  — [arXiv 2311.10054](https://arxiv.org/html/2311.10054v2); [GitHub](https://github.com/Jiaxin-Pei/Prompting-with-Social-Roles)
- **Li et al., "Measuring and Controlling Instruction (In)Stability in Language Model Dialogs"** (v1 title: "…Persona Drift…") [Peer-reviewed, COLM 2024]:
  - Uses 100 system prompts in 5 categories, including agent "character", and has two chatbots talk to each other.
  - LLaMA2-chat-70B and GPT-3.5 showed "significant instruction drift within eight rounds of conversation".
  - The authors attribute it to attention decay and propose a fix called split-softmax.

  — [arXiv 2402.10962](https://arxiv.org/pdf/2402.10962)
- **Wang et al., RoleLLM** [Peer-reviewed, ACL Findings 2024]:
  - RoleBench has 168,093 samples across 100 roles (95 English, 5 Chinese).
  - Tuned open models (RoleLLaMA, RoleGLM) reached results comparable to GPT-4-based RoleGPT.

  — [arXiv 2310.00746](https://arxiv.org/html/2310.00746v3)
- **Tu et al., CharacterEval** [Peer-reviewed, ACL 2024]:
  - 1,785 multi-turn dialogues (11,376 examples), 77 characters from Chinese novels and scripts, and 13 metrics across 4 dimensions.
  - A trained reward model (CharacterRM) correlates better with human judgment than GPT-4 does.

  — [ACL Anthology 2024.acl-long.638](https://aclanthology.org/2024.acl-long.638)
- **QUILL** [Preprint, Nov 2024]: LLMs "often fabricate sentences, leading to quotation hallucination". Generated quotes frequently do not correspond to genuine quotations and are "often inaccurately attributed". The paper proposes a quotation knowledge base and evaluation framework. — [arXiv 2411.03675](https://arxiv.org/pdf/2411.03675)
- **Truth Forest** [Preprint, 2023]: documents LLaMA 2-Chat attributing the apocryphal "Be the change you wish to see in the world" to Gandhi. — [arXiv 2312.17484](https://arxiv.org/pdf/2312.17484)
- **Walters & Wilder 2023** [Peer-reviewed, *Scientific Reports*]:
  - Examined 636 citations across 84 generated literature reviews on 42 topics.
  - **55% of GPT-3.5 citations and 18% of GPT-4 citations were fabricated.** Among real citations, 43% (GPT-3.5) and 24% (GPT-4) had substantive errors.
  - A later review notes that fabricated citations typically use real journal names with nonexistent titles.

  — [PMC10484980](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10484980/)

### Inferences
- **Margin's riskiest step is step 1.** Claude picks Bible passages from memory, closed-book, which is the setting where fabricated or misremembered references occur (cf. Walters & Wilder; QUILL). Validate every chosen reference against a canonical verse table and confirm it is relevant after retrieval. Self-RAG's IsRel idea can be a cheap separate check.
- **Keep retrieved context small and relevant.** Shi et al. and the "context rot" note both argue against adding loosely related commentary "just in case". Two to four passages plus targeted commentary excerpts is likely better than a large dump. This needs testing.
- **Verbatim quotes are not enough.** ALCE and FActScore show that unquoted claims ("Henry thinks…") can be unsupported even when every quotation is verbatim. Add an AIS-style check ("According to [source], [claim]?") on attributions. Treat the NLI or LLM judge as a screen, not an oracle, since evaluators disagree at instance level.
- **Persona mode is a style layer, not an accuracy tool.** Zheng et al. found no accuracy benefit from personas. Its risks (drift, fabricated quotations) need hard constraints and verification.
- **Test balance in the real format.** Röttger shows multiple-choice probes don't predict open-ended behavior, so evaluate balance on the actual 100–190-word spoken answers.
- **Probe sycophancy explicitly.** Use the same question with and without a stated user position (Perez, Sharma).

### Gaps (numbers I recall but could not verify this session; check the primary papers before quoting)
- **CoVe:** reported Wikidata precision of about 0.17 → 0.36 and FActScore of about 55.9 → 71.4 (Llama 65B). Unconfirmed.
- **RAGAS:** reported agreement with human judgments on WikiEval of roughly 95% (faithfulness), 78% (answer relevance) and 70% (context relevance). Unconfirmed.
- **MT-Bench:** exact agreement figures (e.g., GPT-4 vs. human ~85% without ties vs. human–human ~81%) and the sizes of the position and verbosity biases. Unconfirmed.
- **Lost in the Middle:** exact per-position accuracies, and the 56.1% closed-book value (secondary source only).
- **Sharma et al.:** per-task rates (e.g., how often assistants abandon correct answers when asked "Are you sure?"). Unconfirmed.
- **Santurkar et al.:** the OpinionQA question count (often cited as 1,498). Unconfirmed.
- **Self-RAG:** ASQA citation precision and recall figures. **Lewis et al.:** exact QA scores. Not retrieved.
- **Other attribution work, not checked:** Liu, Zhang & Liang 2023, "Evaluating Verifiability in Generative Search Engines"; Slobodkin et al. 2024, "Attribute First, then Generate"; LongCite. All are likely relevant to sentence-level citation design.
- **Domain-specific research:** I found no study on LLM faithfulness to *biblical commentary* or theological sources. None was searched for directly, because the search budget ran out.

---

## 5. How can a small app evaluate this in practice?

### Takeaway
Start small, with roughly 20–50 real questions, and grow to about 100–200 as failures are found:
- **Code-graded checks** for everything deterministic: verbatim quotes, quote-to-source attribution, reference validity, word count.
- **Calibrated LLM judges** for faithfulness, balance and persona fidelity. Use a different model, run it with thinking, use isolated per-dimension rubrics, and give it an "Unknown" escape hatch.
- **Anthropic's paired-prompt method** for contested questions.
- **Statistics:** report confidence intervals, cluster by passage, compare prompt versions with paired differences.
- **Regression gate:** run the suite on every prompt or model change. Read transcripts.

### Cited Findings
- **Start from real failures.** "20-50 simple tasks drawn from real failures is a great start." Early changes have large effects, so small samples can detect them; larger suites become necessary later. — [Anthropic, Demystifying evals for AI agents (Jan 9, 2026)](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- **Choose grader types deliberately.**
  - Code-based graders are "fast, cheap, objective, and reproducible" but brittle.
  - Model-based graders are flexible but "non-deterministic, costlier, and need calibration against humans".
  - Human graders are the gold standard and the way to calibrate model graders.
  - Prefer deterministic graders where possible.

  — [Anthropic, Demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- **Judge design:**
  - Give LLM judges an escape hatch, such as returning "Unknown" when information is insufficient.
  - Grade "each dimension with a separate, isolated LLM judge".
  - Use partial credit.
  - Test both cases where a behavior should occur and cases where it shouldn't.
  - "Read the transcripts!"
  - A 0% pass rate usually means a broken task or grader.

  — [Anthropic, Demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- **Consistency and suite types.** *pass^k* is the probability that all k trials succeed; for example, 75% per trial gives about 42% for pass^3. Use it for user-facing consistency. Regression suites should sit near 100%; capability suites start low and "graduate" into regression suites. — [Anthropic, Demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- **Anthropic eval-design doc:**
  - Mirror the real task distribution, including edge cases: "irrelevant or nonexistent input", ambiguous cases.
  - Automate grading where possible.
  - Prefer "More questions with slightly lower signal automated grading" over fewer hand-graded ones.
  - LLM-grader tips: "detailed, clear rubrics"; "empirical or specific" outputs (correct/incorrect or 1–5); "Use a grader model with thinking on".
  - "Generally best practice to use a different model to evaluate than the model used to generate the evaluated output."

  — [Anthropic, Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
- **Statistics for evals** (Nov 19, 2024; paper "Adding Error Bars to Evals", arXiv 2411.00640):
  - Report the standard error and a 95% CI (mean ± 1.96 × SEM).
  - Cluster standard errors on the unit of randomization, such as the passage. Clustered SEs "can be over three times as large as naive standard errors".
  - Resample several answers per question to reduce within-question variance.
  - Use paired-difference tests when comparing two systems on the same questions. Frontier models' question-level correlations run about 0.3–0.7.
  - Use power analysis to size the eval.

  — [Anthropic, A statistical approach to model evaluations](https://www.anthropic.com/research/statistical-approach-to-model-evals)
- **Balance evaluation:**
  - Paired prompts from opposing perspectives.
  - Score even-handedness, opposing perspectives and refusals.
  - Use an automated grader validated against other graders and human agreement.
  - Code and prompts are open.

  — [Anthropic](https://www.anthropic.com/news/political-even-handedness); [GitHub](https://github.com/anthropics/political-neutrality-eval). OpenAI's added axes are asymmetric coverage, escalation, personal expression, invalidation and refusal. — [Storyboard18](https://www.storyboard18.com/how-it-works/openai-publishes-new-metrics-to-gauge-political-bias-in-ai-citing-rare-but-real-risks-82399.htm) [Secondary]
- **Claim-level faithfulness can be automated.** Atomic-fact decomposition plus verification against sources (FActScore; estimator error <2% on biographies). Claim-level faithfulness against retrieved context (RAGAS). NLI-based attribution (AutoAIS), with the caveat that instance-level agreement among evaluators is low. — [FActScore](https://par.nsf.gov/servlets/purl/10523436); [RAGAS](https://arxiv.org/abs/2309.15217); [Bohnet et al.](https://arxiv.org/pdf/2212.08037); [arXiv 2501.14883](https://arxiv.org/html/2501.14883v2)
- **Score abstention correctly.** Benchmarks that penalize abstention reward guessing (Kalai et al.). AbstentionBench covers unanswerable, underspecified, false-premise and subjective questions, all directly reusable categories. — [Maginative](https://www.maginative.com/article/ai-hallucinations-are-a-test-taking-problem-says-openai/); [AbstentionBench](https://arxiv.org/abs/2506.09038v1)
- **Account for judge biases** (position, verbosity, self-enhancement). — [Zheng et al. 2023](https://arxiv.org/html/2306.05685v4)

### Inferences (a concrete evaluation plan for Margin)
- **Test set (version 1, about 110 items).** Each item stores the question, mode (host or character), expected source IDs, and a short rubric or gold notes. Composition:
  - (a) 30 answerable from the retrieved sources;
  - (b) 15 partially answerable;
  - (c) 15 where the library is silent, so abstention is correct;
  - (d) 10 false-premise questions, e.g., asking where the Bible says "God helps those who help themselves";
  - (e) 10 contested-doctrine **pairs** (20 prompts), each framed from opposing sides;
  - (f) 10 in-character questions across Henry, Spurgeon and a Church Father;
  - (g) 10 sycophancy probes: the same question with a stated user position, plus an "Are you sure?" follow-up after a correct, source-backed answer.

  Seed it from real user questions as soon as they exist.
- **Code-graded metrics, every run:**
  1. **Quote verification pass rate.** Every span in quotation marks must be a normalized exact substring of the *attributed* document, not merely of any document. Track it before and after repair.
  2. **Attribution accuracy.** The quoted span's source equals the named speaker or commentator.
  3. **Reference validity.** Every spoken Bible reference exists in the canon table. If it is quoted, the words match that verse in the library's translation.
  4. **Fabricated-reference detector.** Flag any named author, work or sermon that isn't among the retrieved source IDs (e.g., "Calvin says…" when Calvin wasn't retrieved).
  5. **Length compliance** (100–190 words).
  6. **Format compliance** for speech: no markdown, lists or ellipses.
- **LLM-graded metrics.** Use a different model or a fresh context, with thinking on and one rubric per judge:
  - **Faithfulness.** Split the answer into attributed claims and judge each as supported, unsupported or unknown against the cited text, AIS-style.
  - **Abstention correctness** on categories (c) and (d).
  - **Balance** on category (e): even-handedness, opposing perspectives, refusals, plus asymmetric coverage. Also compute word counts and quote counts per side in code.
  - **Persona fidelity** on (f): consistent voice, no anachronism, no claims beyond the retrieved text, quotes verbatim.
  - **Sycophancy** on (g): did the conclusion or tilt move with the user's stated view, or did the answer capitulate under pushback?
- **Judge calibration.** Hand-label 30–50 outputs per LLM-graded dimension and report judge–human agreement before trusting a judge. For pairwise comparisons, run both orders to cancel position bias.
- **Statistics, computed with the standard binomial formula:**
  - At 90% pass rate, the 95% CI half-width is about ±8.3 points with 50 items, ±5.9 with 100, and ±4.2 with 200.
  - Detecting a drop from 90% to 80% with unpaired comparison (α = 0.05, power 0.8) needs about 196 items per arm. A drop from 95% to 90% needs about 430.
  - So small suites only catch large regressions. Use paired comparisons (same items, old prompt vs. new prompt), several samples per item (epochs), and cheap code-graded checks run at higher volume.
  - Cluster SEs by passage or topic, since several questions may share a passage.
- **Regression gating.**
  - Run the full suite on every prompt, model or retrieval change.
  - Block release if quote-verification, attribution, abstention or balance metrics drop beyond their CI.
  - Track pass^3 on the core set for consistency.
  - Anthropic's doc says model-specific prompting effects must be re-checked per model, so re-baseline on every model upgrade.
- **Production telemetry.** Log each answer's prompt version, model ID, sources and citations, verification outcome and repair count. Failures in production should become new eval items.

### Gaps
- No published benchmark or rubric exists for even-handedness on *theological* questions. Margin would need to author doctrinal pairs and validate them with human raters from more than one tradition.
- I found no guidance on acceptable quote-normalization rules for historic texts: archaic spelling, KJV italics, translation variants. These are a product decision.
- Practitioner literature on small-app evals (e.g., Husain, Shankar et al.'s "Who Validates the Validators?" on criteria drift) could not be checked this session.

---

## 6. Concrete checklist for Margin's prompts and pipeline

### Takeaway
Treat the app as a gated prompt chain:
1. Select references with structured output, validated against a canonical verse table.
2. Retrieve deterministically, with a small relevance filter.
3. Answer with Citations (documents first, question last, explicit source discipline, abstention phrasing and mode rules in a cached system prompt).
4. Verify in code, then with a judge, allowing one repair round and a safe fallback.
5. Evaluate continuously.

Persona mode and host mode share the same evidence rules. Quotation marks always mean verbatim text from a library document.

### Cited Findings (evidence anchors for the checklist)
- **Document order, XML and quote-first.**
  - Documents first and query last ("up to 30 percent").
  - XML document wrappers with `<source>` metadata.
  - Quote-first grounding.
  - "I don't know" permission.
  - Claim-by-claim quote verification with retraction.
  - External knowledge restriction.

  — [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices); [Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)
- **Citations properties.**
  - Guaranteed-valid pointers.
  - Verbatim `cited_text`, not counted as output tokens.
  - Custom-content block granularity.
  - All-or-none enabling.
  - Incompatible with structured outputs.
  - The search-result `source` and `title` fields are returned with each citation.

  — [Citations](https://platform.claude.com/docs/en/build-with-claude/citations); [Search results](https://platform.claude.com/docs/en/build-with-claude/search-results)
- **Prompting changes and caching.**
  - Prefill is unsupported from Claude 4.6.
  - On the newest models, visible `<thinking>` scratchpads may be declined.
  - Opus 5 needs explicit conciseness prompting.
  - Avoid "CRITICAL/MUST" language.
  - Explain the reason for each instruction (the text-to-speech example).
  - Use 3–5 diverse examples.
  - Caching: static content first, minimum cacheable lengths, and toggling citations invalidates caches.

  — [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices); [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- **Balance and personas.**
  - Balance defaults: balanced information, multiple perspectives where consensus is lacking, neutral terminology, reticence on hot-button opinions. Religion is explicitly included.
  - Persona rules: never deny being an AI; break character to avoid harm.

  — [Constitution](https://www.anthropic.com/constitution); [Even-handedness](https://www.anthropic.com/news/political-even-handedness)
- **Research risks.**
  - Distraction by irrelevant context. — [Shi et al.](https://arxiv.org/pdf/2302.00093)
  - Middle-position degradation. — [Liu et al.](https://arxiv.org/abs/2307.03172)
  - Sycophancy. — [Perez et al.](https://arxiv.org/pdf/2212.09251); [Sharma et al.](https://www.anthropic.com/research/towards-understanding-sycophancy-in-language-models)
  - Weak abstention. — [AbstentionBench](https://arxiv.org/abs/2506.09038v1)
  - Persona drift. — [Li et al.](https://arxiv.org/pdf/2402.10962); [Assistant Axis](https://www.anthropic.com/research/assistant-axis)
  - Quotation hallucination. — [QUILL](https://arxiv.org/pdf/2411.03675)
  - Fabricated references. — [Walters & Wilder](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10484980/)
  - Unfaithful chain-of-thought. — [Anthropic](https://www.anthropic.com/research/reasoning-models-dont-say-think)

### Inferences (the checklist; these are recommendations built from the findings above)

**A. Pipeline structure (prompt chain with gates)**
1. **Step 1, passage selection** (its own call):
   - Use structured outputs (JSON schema). This is fine here because no citations are needed.
   - Return 2–4 references, a one-line reason for each, and a confidence (high/medium/low).
   - **Gate:** validate each reference against a canonical book/chapter/verse table. Drop or repair invalid ones and log them; this rate is a hallucination metric.
   - Optionally merge in hits from a lexical/BM25 or contextual-embedding search over the Bible text, to catch passages the model forgot (Contextual Retrieval: BM25 plus embeddings plus reranking cut retrieval failures by 49–67%).
2. **Step 2, retrieval:**
   - Fetch verse text and commentary keyed by reference (deterministic).
   - Keep the per-answer context small (Shi; context rot).
   - Store metadata for every chunk: author, work, edition or translation, verse range, and a stable ID (e.g., `henry/john/3/14-17#p2`).
3. **Step 2.5, relevance filter** (optional, cheap model or rule):
   - Keep only commentary chunks that bear on the question (Self-RAG IsRel analog).
   - If nothing survives, route to the abstention template rather than letting the model improvise.
4. **Step 3, answer** (Citations on, no structured outputs):
   - Pass each Bible passage and each commentator excerpt as a **custom-content document**, or as `search_result` blocks. Use one block per verse and one block per commentary sentence or short paragraph, so citations resolve to precise, speakable locations.
   - Put the citable text in the content, a human-readable name in `title`, and JSON metadata in `context`.
   - Citations must be enabled on all documents in the request.
5. **Step 4, verification:**
   - (a) Code checks: every quoted span is a normalized exact match within the attributed document's `cited_text` or source text. Reference validity. Speaker and source match. Fabricated-name detector. Word count. Speech formatting.
   - (b) A judge call (different model or fresh context, thinking on, "Unknown" allowed) checks every unquoted attribution for support.
   - (c) For questions flagged as contested, a balance check.
   - On failure, run **one** repair round with specific feedback (evaluator-optimizer). If it still fails, fall back to a safe script: read the verse and one verified quote, and say the commentators can't be summarized reliably for this question.
6. **Logging:** store everything needed to turn production failures into eval items.

**B. System prompt** (stable, mode-specific, cached; written as explained rules rather than shouted commands)
- **Role and audience, with the reason.** Answers are spoken by text-to-speech to someone listening, often on the move. So: plain prose, no lists, symbols or ellipses, and references spoken naturally ("John chapter three, verses fourteen to seventeen").
- **Source discipline, with the reason.** "Quotation marks mean the exact words of one of the documents provided, because listeners take a quotation as that author's own words, and our system checks every quotation word-for-word and discards answers that fail." Also:
  - Paraphrases are signposted ("Henry's point is…") and never put in quotation marks.
  - Do not quote anyone not present in the documents.
- **Knowledge policy.** State it explicitly: for example, statements about what Scripture or commentators say must come from the documents (external knowledge restriction). If any general background is allowed, it must be brief and framed as background, not attributed.
- **Abstention wording.**
  - Give exact phrases for three distinct cases:
    - the sources are silent ("The commentaries I have here don't take up that question");
    - the sources disagree;
    - the question rests on a false premise ("That line isn't in the Bible, though it's often thought to be…").
  - Say that a short honest answer counts as a good answer. Don't pad to reach 100 words; the floor can be relaxed for abstentions.
- **Host-mode balance rules:**
  - When commentators differ, give each comparable space and its strongest textual reasoning.
  - Use each tradition's own terms (neutral terminology).
  - Describe disagreements without declaring a winner unless asked. If asked, lay out each side's case.
  - Don't mirror the user's stated position (sycophancy).
  - Say when all available commentators come from similar traditions, so their agreement isn't presented as universal Christian consensus.
- **Character-mode persona card:**
  - Name, dates, tradition and work, taken from library metadata only.
  - Voice notes and a few signature stylistic features.
  - Hard limits, with reasons:
    - speak only from that commentator's retrieved text;
    - quote verbatim;
    - no invented anecdotes, sermons or biography;
    - no knowledge after the commentator's death;
    - if their text is silent, say so in character and don't extrapolate;
    - drop character for crisis, safety or sincere "are you an AI?" questions (constitution).
  - Keep the AI disclosure visible in the UI.
- **Length.** "100–190 words" (about 40–75 seconds at a typical speaking rate). On Opus 5-class models, ask explicitly for brevity, since effort doesn't control length. Enforce in code.
- **3–5 diverse examples** in `<examples>`:
  - one host comparison;
  - one in-character answer;
  - one abstention because the sources are silent;
  - one contested question handled evenly;
  - one false premise.

  Vary their structure so the model doesn't copy a template. Examples drawn from the real task beat generic ones (2023 long-context study).
- **Tone it down.** Avoid "CRITICAL/MUST" capitals; newer models overtrigger on them. Say what to do rather than what not to do.

**C. User turn (dynamic content)**
- **Documents first, then the question, then a one-line task reminder.** Without the Citations API, use the XML pattern:
  - `<documents><document index="n"><source>…</source><document_content>…</document_content></document>…</documents>`
  - then `<question>…</question>`;
  - then "First copy the exact sentences you will rely on into `<quotes>`, numbered and labeled by document index (write 'No relevant quotes found.' if none). Then write the spoken answer in `<answer>`, using only those quotes." Strip `<quotes>` before text-to-speech.
- **Ordering.** Place the most relevant documents first or last, not buried in the middle (Lost in the Middle). Keep the total short.
- **Flags.** Pass flags from the pipeline in the user turn, e.g., `<contested>true</contested>` or `<sources_silent>true</sources_silent>`, so the right rules fire. With prefill gone, persona reminders also go in the user turn.

**D. Quote-first and citation patterns by model generation**
- **Citations API (preferred).** Quote-first is implicit. Make sure every spoken quotation is covered by a citation whose `cited_text` contains it. Speak quotations from `cited_text`, or verify against it.
- **Without Citations,** on Fable/Opus 5.x and Sonnet 5.5, request quotes as a normal output section, or as a separate extraction call (chaining). Don't request a visible `<thinking>` scratchpad, which may be declined. Rely on adaptive thinking with `effort` for internal reasoning.
- **Post-hoc check.** Optionally run a "find a supporting quote for each claim, remove unsupported claims" pass, as a separate call (Anthropic's verify-with-citations recipe, or CoVe's independent verification questions).

**E. Even-handedness specifics**
- Run a lightweight classifier on the question, "contested among Christian traditions?", to switch on stricter balance rules and the balance check.
- Measure with paired prompts (Q5). Also count per-side words and quotes in code to catch asymmetric coverage.
- Historic commentaries sometimes contain polemical language about other traditions. Quote it faithfully when it's relevant, attribute and contextualize it, and don't adopt it in the host's own voice (neutral-terminology principle).

**F. Persona constraints**
- Calls are stateless, so resend the full persona card every turn.
- Cap in-character multi-turn runs (drift within about 8 rounds in Li et al.). Re-anchor after each turn.
- Route emotionally vulnerable or meta-AI conversations to the host voice (Assistant Axis triggers).
- Treat persona fidelity as a separate eval dimension. It doesn't improve accuracy (Zheng et al.), so never let it override source rules.

**G. Playlists** (multi-session study plans)
- Use structured outputs: sessions, passages, themes, and commentators per session.
- Validate every reference and every commentator–passage pairing against the library. A session may only cite commentary that exists.
- For contested themes, require at least one session or segment that presents differing views evenly.
- Use evaluator-optimizer to check coherence and progression. Have a human review the first batch.

**H. Caching and cost**
- Cache the static system prompt plus examples. They must exceed the model's minimum cacheable length: 512 tokens on the newest models, 1,024–4,096 on older ones.
- Put per-question documents after the breakpoint.
- Keep the citations setting constant across requests; toggling it invalidates caches.
- `cited_text` doesn't count as output tokens, which offsets the input overhead of enabling citations.

**I. Change management**
- Version prompts. Run the eval suite (Q5) on every prompt or model change, and re-baseline on model upgrades.
- Keep the verification layer even when pass rates look perfect, as a guard against model or prompt regressions.

### Gaps
- No direct evidence on how Claude's Citations behave with very fine-grained custom blocks (single verses or sentences) on large multi-document inputs. Benchmark this on Margin's own data.
- How well Claude voices specific historical preachers, and whether persona prompts change Claude's faithfulness to retrieved text, has not been studied publicly for Claude. Measure it.
- Domain facts to verify before relying on attributions (from general knowledge, not researched here):
  - Matthew Henry died in 1714 before finishing the New Testament, and the later volumes (traditionally Romans–Revelation) were completed by other ministers from his notes.
  - Church Fathers' texts in the public domain are mostly 19th-century English translations, so quotations should be attributed to the translation edition.

  Both affect how the app labels "who said this".
- OpenAI and Google guidance (Q3 Gaps) could add more on document formatting and instruction placement, but was not verified this session.

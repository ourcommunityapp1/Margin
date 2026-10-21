# LLMs and the Bible, Theology and Christian Practice: Evidence Notes (2021 to October 2026)

> **Method and verification note for the report writer (compiled 21 Oct 2026).** The page-fetch tool could not resolve any host in this session. DNS lookups failed for gloo.com, barna.com, link.springer.com, vatican.va, arxiv.org and benkaiser.dev, and the environment's egress proxy refused direct HTTPS to arxiv.org. As a result, no primary page was opened in full. Every finding below comes from web-search result summaries and snippets of the cited pages. Where possible, numbers were checked across several results, but exact wording and figures should be checked against the primary sources before publication.
>
> The shared web-search budget ran out before the last planned queries: persona and role-play hallucination research, the American Bible Society "State of the Bible" AI items, Barna's adoption figures and its 2023–24 baselines, the Magnifica Humanitas passages on simulation, unfoldingWord/ETEN, and the Episcopal Church resolution. These are listed under Gaps.
>
> **Evidence tags:** [Peer-reviewed], [Preprint], [Shared task], [Ministry/industry report], [Vendor claim], [Survey], [Church document], [News], [Blog/anecdote].
>
> Items marked "not re-verified this session" come from prior knowledge of a source whose URL is given.

---

## 1. Measured LLM accuracy on Bible knowledge, verse quotation, references and theological questions; reported hallucination patterns

### Takeaway
Frontier models now score at or near ceiling on multiple-choice Bible-knowledge exams. On one seminary exam no model scored below 96%, against a student average of 82.4%, and models usually quote famous verses word for word. No peer-reviewed benchmark of word-for-word verse quotation or chapter-and-verse accuracy was found. The failure modes that are documented, almost entirely in anecdotes and practitioner reports, are:
- mixing wording from different translations;
- made-up verses attached to real references;
- misattributed or invented quotations of Augustine and other Fathers, including one invented "Church Father";
- a lasting gap between factual recall and reliable theological, ethical and pastoral judgment.

### Cited Findings

#### Bible knowledge and verbatim recall
- [Ministry/industry report, 2026] The Gospel Coalition (TGC) / Keller Center "AI Christian Benchmark 2026" ranks 46 LLMs on theological reliability, ethics, "attachment" and Bible knowledge. The Bible-knowledge test is a 100-question multiple-choice exam that a major evangelical seminary has used for years. No model or configuration scored below 96%, and nearly all scored 99–100%. The average for human students is 82.4%. The authors conclude that models retrieve Bible facts more accurately than the average seminary student — [TGC AI Christian Benchmark](https://www.thegospelcoalition.org/ai-christian-benchmark/); [christianbenchmark.ai](https://www.christianbenchmark.ai/)
- [Ministry/industry report, 2026] The same report makes three further points:
  - "Silicon Valley" models have improved on theological reliability over the past year.
  - Chinese models "no longer outperform American models on theological reliability."
  - "Attachment-forming behaviors largely remain a significant problem for Silicon Valley models, especially GPT."

  Source: [TGC AI Christian Benchmark](https://www.thegospelcoalition.org/ai-christian-benchmark/)
- [Ministry/industry report, first edition c. 2025; secondary description] In the first edition, Keller Center program director Mike Graham's team put seven common religious questions to seven major AI platforms, and seven orthodox theologians graded the answers. Secondary coverage reports DeepSeek R1 and Perplexity at the top and Grok, Claude and Llama lowest. This ranking has not been checked against TGC's original, and the page carrying it was not pinned down — [Church Health Wiki summary, 12 Jan 2026](https://churchhealthwiki.wordpress.com/2026/01/12/ai-scholars-evaluate-7-top-llms-for-theological-reliability/); [Logos Community thread](https://community.logos.com/discussion/252826/a-report-evaluating-ai-from-a-christian-perspective)
- [Commentary by the benchmark lead; title-level only] Michael Graham, "AI Knows the Bible. But Can It Be Wise?" The title sums up the benchmark's conclusion that knowledge has outrun wisdom — [Substack](https://alexchao.substack.com/p/ai-knows-the-bible-but-can-it-be)
- [Blog/anecdote; c. Dec 2024, date inferred from the HN thread] Benjamin Kaiser's "Can LLMs Accurately Recall the Bible" benchmark:
  - Method: six scenarios at temperature 0, with a pass check that ignores case and whitespace.
  - John 3:16 (NIV): nearly every model passed. The only failure was Llama 3.3 70B, which added "begotten". That word appears in other translations but not the NIV, so this is a translation-blending error.
  - An obscure-verse test was "more mixed"; those numbers were not retrieved.
  - Kaiser's advice: "if you really want to lean on an LLM to give you textually accurate bible verses of popular translations, you really should lean on higher parameter count (i.e. larger) models."

  Sources: [Kaiser blog](https://benkaiser.dev/can-llms-accurately-recall-the-bible/); [Hacker News discussion](https://news.ycombinator.com/item?id=42537332)
- [Blog/anecdote] A Hacker News commenter reported a test in which an LLM "made up a quote that doesn't exist in any version of the Bible" — [HN](https://news.ycombinator.com/item?id=42537332)
- [Blog/anecdote, Aug 2026] Larry Sanger reports that current LLMs' mistakes are "rarer and more obscure" and that "as for quoting the Bible, it's stunningly accurate." This is not a controlled test — [Sanger, "How to set up your LLM as a Bible study tutor"](https://larrysanger.org/2026/08/how-to-set-up-your-llm-as-a-bible-study-tutor/)
- [Preprint, 2026; title-level only] "Predictable Confabulations: Factual Recall by LLMs Scales with Model Size and Topic Frequency" is a general (not Bible-specific) result. It implies that less-quoted verses and less-quoted authors are at higher risk — [arXiv 2605.18732](https://arxiv.org/pdf/2605.18732)

#### Fabricated verses and wrong references
- [Practitioner article; early ChatGPT, date not captured] A Missio Nexus writer asked an early ChatGPT for "a list of quotes from the Bible about truth" with book, chapter and verse. It invented a "John 5:5" quote; the real verse is about a man who had been an invalid for thirty-eight years. The other four verses on the list were also fake — [Missio Nexus](https://missionexus.org/ai-hallucination-chatbots-and-the-truth-of-holy-scripture/)
- [Vendor/church-tech guides; weak evidence; which claim sits on which page not verified] These guides describe:
  - Scripture references that "read perfectly" but point to the wrong verse.
  - Hybrid wordings that blend two translations when a specific translation is requested. This is presented as an illustrative, partly hypothetical case.

  Sources: [ReachRight Studios](https://reachrightstudios.com/blog/chatgpt-for-churches/); [Aligned.church](https://aligned.church/blog/chatgpt-bible-translation-prompt). Vendor "is this verse real?" checkers have appeared as a product response — [AskBibleGPT guide](https://askbiblegpt.app/guides/did-ai-make-up-that-bible-verse/); [Lumin verse checker](https://www.lumin.faith/bible-verse-checker)
- [News/opinion] A user asked ChatGPT for a "fake Bible passage" about Jesus and transgender people, and it complied. This is fabrication on request rather than hallucination, but it shows models will produce scripture-styled text when asked — [Answers in Genesis](https://answersingenesis.org/technology/chatgpt-generates-bible-verse/)
- [Preprint, Oct 2025; second-hand] A paper evaluating LLM-written Islamic content cites a 2024 "NEXUS" study that documents fabricated biblical citations. That study was not verified — [arXiv 2510.24438](https://arxiv.org/pdf/2510.24438)

#### Quotations attributed to theologians and Church Fathers
- [Blog/forum anecdotes; which anecdote is on which page not verified] Two reports:
  - Asked about Christians who held that prayer changes the person praying rather than God, ChatGPT attributed the view to Augustine, who "never said anything like that." It apparently bent his more nuanced statements on prayer to fit the question.
  - A teacher asked for early Church Fathers who supported a symbolic Eucharist. In one case the model "invented an entire Church Father and associated literature and quotations." The commenter suggests asking for references rather than quotations.

  Sources: [Puritan Board thread](https://puritanboard.com/threads/has-anybody-tried-asking-chatgpt-questions-here-is-its-response-to-one-i-asked-about-2-puritans.110359/page-3); [Griffin Gooch, Substack](https://griffingooch.substack.com/p/why-chatgpt-might-not-be-sinful-but)
- [Blog/anecdote] An Easter sermon written by ChatGPT attributed a line to Augustine ("He died not for his own sins, but for ours..."). Whether the line is authentic was not established — [Patheos](https://www.patheos.com/blogs/davidrupert/i-asked-chatgpt-to-write-an-easter-sermon-the-result-was-surprising/)
- [Background: misattribution is older than AI and is in the training data]
  - A widely repeated "Augustine" line that women should not be educated has no traceable source.
  - A line by the 14th-century preacher John Bromyard was later attributed to Augustine and others.

  Sources: [Marg Mowczko](https://margmowczko.com/misogynist-quotes-from-church-fathers/); Catholic Answers separates misattributions from outright fabrications — [Catholic Answers, "Things Saints (and Others) Never Said"](https://www.catholic.com/magazine/print-edition/things-saints-and-others-never-said); a spurious anti-Jewish "Augustine" quotation is traced in [Roger Pearse (2018)](https://www.roger-pearse.com/weblog/2018/07/17/a-false-quotation-of-augustine-against-the-jews/)
- Persona and authority failure: the April 2024 Catholic Answers "Father Justin" case, in which an AI cast as a priest claimed ordination and offered absolution, is covered in Section 4.

#### Theological question answering: tendencies
- [Peer-reviewed, 2024] In a German confessional religious-education study, ChatGPT's answers on Genesis were "coherent, linguistically correct and in line with leading scholarly approaches." However, they were one-sided: they favored a metaphorical reading and offered no alternative interpretations — [Springer, "ChatGPT as a modern tool for Bible teaching in confessional religious education: a German view"](https://link.springer.com/article/10.1007/s40839-024-00244-1)

#### Closest systematic analog: Islamic scripture
- [Shared task, ArabicNLP 2025] IslamicEval 2025 was the first shared task on catching LLM hallucination in Islamic content. Teams had to detect, validate and correct hallucinated Qur'an and Hadith citations in LLM output, and answer questions from grounded sources. Thirteen teams reached the final phase. Organizers: Mubarak et al., ArabicNLP 2025, pp. 480–493. Results are in Section 7 — [Overview (ResearchGate)](https://www.researchgate.net/publication/397420777_IslamicEval_2025_The_First_Shared_Task_of_Capturing_LLMs_Hallucination_in_Islamic_Content); [HUMAIN system paper, ACL Anthology](https://aclanthology.org/2025.arabicnlp-sharedtasks.70/)
- [Peer-reviewed, AAAI/ACM AIES 2025, pp. 217–226, DOI 10.1609/aies.v8i1.36543] Atif, Askarbekuly, Darwish and Choudhury, "Sacred or Synthetic? Evaluating LLM Reliability and Abstention for Religious Questions." Their FiqhQA benchmark covers Islamic rulings for the four Sunni schools in Arabic and English.
  - GPT-4o was most accurate.
  - Gemini and Fanar were better at abstaining (declining to answer), which the authors call "critical for minimizing confident incorrect answers."
  - All models performed worse in Arabic.
  - The authors call for task-specific evaluation and cautious deployment.

  Sources: [AIES proceedings](https://ojs.aaai.org/index.php/AIES/article/view/36543); [arXiv 2508.08287](https://arxiv.org/abs/2508.08287)
- [Preprints, 2026] The Islamic NLP community has built several dedicated knowledge benchmarks. The Christian side has nothing comparable beyond ministry and vendor benchmarks — [IslamicMMLU, arXiv 2603.23750](https://arxiv.org/pdf/2603.23750); [IslamicTurathBench, arXiv 2608.04703](https://arxiv.org/pdf/2608.04703); [IslamicLegalBench, arXiv 2602.21226](https://arxiv.org/html/2602.21226)

### Inferences
- Quoting famous verses from mainstream English translations word for word appears low-risk with frontier models, but the evidence is anecdotal or comes from ministry reports. Risk rises with:
  - less-quoted verses;
  - requests to list verses on a theme with references;
  - translation-specific wording, where blending occurs;
  - any quotation attributed to a commentator. Misattributions already circulating on the web make the model's own confabulation worse.

  This supports Margin's plan to check every quote against the source text. It also suggests checking that each reference matches its text (book, chapter and verse against wording), not only the wording itself.
- Near-perfect multiple-choice Bible knowledge does not carry over to reliable theological, ethical or pastoral answers (TGC; Gloo Faith scores in Section 3). Anchoring Margin's answers in named commentators addresses the theology side better than relying on the model's own memory.
- Henry and Spurgeon are heavily and loosely quoted online, so an ungrounded "Spurgeon said..." output should be treated as high-risk by default.

### Gaps
- No peer-reviewed or arXiv benchmark was found that measures, across models:
  - word-for-word verse quotation,
  - chapter-and-verse reference accuracy, or
  - translation-specific wording.

  Kaiser's blog is the only structured test found, and its obscure-verse numbers were not retrieved.
- No systematic error-rate measurement was found for quotations attributed to Church Fathers, Reformers, Matthew Henry or Spurgeon. The evidence is anecdotal.
- The content of Christianity Today's "Misreading Scripture with Artificial Eyes" (July 2023) was not retrieved — [CT](https://www.christianitytoday.com/2023/07/ai-chatgpt-exegetical-tool-bible-scripture-sermon-mount/).
- Research on role-play and persona hallucination was not searched because the budget ran out. One example is anachronism, where a simulated historical figure "knows" later events.
- The 2024 "NEXUS" fabricated-biblical-citation study is unverified.

---

## 2. Religious, denominational and theological bias in LLMs

### Takeaway
The strongest Christian-specific evidence is a 2026 peer-reviewed study that scored model outputs against 576 claims from catechisms, confessions and creeds across 11 traditions. It finds "doctrinal flattening": models are precise but incomplete, Catholic and Evangelical/Protestant positions are over-represented, and Orthodox and Pentecostal positions are under-represented. Work from 2025–26 adds three more patterns:
- models leave religion out by default and fall back on a secular, therapeutic framing;
- they tilt in particular directions between faiths;
- they default to "Christian" or "unaffiliated" when guessing a person's religion.

Earlier NLP research documents stereotyping of non-Western religions and anti-Muslim bias.

### Cited Findings

#### Christian denominational representation
- [Peer-reviewed, 2026] "Detecting doctrinal flattening in AI generated responses" (AI and Ethics, Springer):
  - Built a knowledge base of 576 claims drawn from catechisms, confessions and creeds of eleven Christian traditions.
  - Model outputs showed "high precision but low recall," "frequent flattening of denominational differences, and occasional outright contradictions."
  - Catholic and Evangelical or broadly Protestant positions were "far more frequently represented" than Orthodox and Pentecostal ones.

  Source: [Springer, DOI 10.1007/s43681-026-01051-0](https://link.springer.com/article/10.1007/s43681-026-01051-0)
- [Peer-reviewed, 2024] ChatGPT presented a metaphorical reading of Genesis without alternatives, an academic or mainline default — [Springer, J. Religious Education](https://link.springer.com/article/10.1007/s40839-024-00244-1)

#### Leaving religion out by default (secular framing)
- [Preprint, May 2026] The AllFaith benchmark, "Omissive Bias in Religious Representation: Benchmarking LLM Answers to Everyday Ethical Decision-making":
  - 150 open-ended ethics and life questions: 109 filtered from real WildChat transcripts and 41 contributed by faith-community partners (LDS, Jewish, Protestant, Catholic).
  - A judge model gives credit for any mention of a religion, religious practice or religious leader.
  - Across 27 models, religious perspectives are consistently under-represented relative to what people expect. The authors call this "omissive bias."

  Source: [arXiv 2605.24319](https://arxiv.org/pdf/2605.24319)
- [News/university releases, 26 May – 1 June 2026] The Consortium for Evaluating Faith and Ethics in AI (CEFE-AI) includes Baylor, BYU, Notre Dame and Yeshiva, and has since grown to six universities. It announced three studies on 26 May 2026 at the Athens Summit:
  - In a survey of 1,125 Americans, most expected religious perspectives in answers to ethics questions, yet nearly all models gave no religious content.
  - One benchmark covered 14 LLMs, including ChatGPT, Claude, Gemini and Grok.
  - BYU's summary says models from Anthropic and Meta "showed the least bias of any models tested."

  Sources: [Deseret News, 26 May 2026](https://www.deseret.com/faith/2026/05/26/studies-find-religious-bias-in-ai-models/); [BYU News](https://news.byu.edu/intellect/new-research-from-byu-led-multi-institution-consortium-finds-all-major-ai-models-ignore-faith-religion-in-responses); [PRWeb release](https://www.prweb.com/releases/multi-university-consortium-launches-first-cross-faith-ai-benchmark-revealing-gaps-in-how-models-handle-religion-302781144.html); [Church News, 1 Jun 2026](https://www.thechurchnews.com/members/2026/06/01/ai-religion-faith-research-byu-elder-gong/); [CEFE dashboard](https://cefe.ai/)
- [Preprint, Sept 2026] FaithfulBench, "Does AI Counsel Uphold or Undermine the User's Professed Faith?" (M. Waleed Kadous and five co-authors):
  - Tested five frontier models.
  - When the user's tradition is not stated, models fall back on a "secular therapeutic default" and "every model fails some believers."
  - The two most normative traditions score below zero, meaning that on balance the counsel runs against their own tradition.

  Source: [arXiv 2609.13634](https://arxiv.org/abs/2609.13634)
- [Ministry/industry report, July 2025] Gloo's Flourishing AI benchmark: Faith was the lowest of seven dimensions, averaging 35. Details are in Section 3 — [Gloo press release](https://gloo.com/press/releases/new-flourishing-ai-benchmark-measures-performance-of-top-llms-across-key-dimensions-of-human-well-being)

#### Directional tilts between faiths
- [Preprint, May 2026] Israelsen, Carty, Coates, Fulda, Park and Whiting, "When AI Takes Sides on Questions of Faith: Persistent Asymmetries in AI-Mediated Faith Guidance":
  - Tested 20 commercial and open models on 182 religion pairings, asking for conversion advice in both directions. Scoring used an LLM judge checked by humans.
  - Catholic, Bahá'í and Sikh traditions came out ahead; atheists, agnostics and Jehovah's Witnesses came out behind.
  - Grok 4.20 showed the strongest asymmetries.
  - Models did not actively push conversion, and the pattern held across different question phrasings.
  - The authors do not claim this amounts to "bias."
  - A reviewer notes that using an LLM as judge may contribute to the measured effect.

  Sources: [arXiv 2605.22975](https://arxiv.org/abs/2605.22975); [Pith review](https://pith.science/paper/2605.22975)
- [News, 2026] Catholic press coverage of the consortium's work reports a positive bias toward Catholicism and a negative bias toward Jehovah's Witnesses across nearly every model, with Grok strongest — [Catholic Times (Columbus)](https://catholictimescolumbus.org/us-world/ai-models-overlook-religion-but-also-favor-some-faiths-including-catholicism/); [Detroit Catholic](https://www.detroitcatholic.com/news/ai-models-overlook-religion-but-also-favor-some-faiths-including-catholicism)

#### "Christian" as the default label
- [Preprint, Aug 2025] "Measuring Stereotype and Deviation Biases in Large Language Models": all four models tested tend to answer "unaffiliated" or "Christian" when asked a person's religion. The authors link this to training biases that favor Christianity — [arXiv 2508.06649](https://arxiv.org/pdf/2508.06649)
- [Preprint, Dec 2025; figures attributed to this paper from search snippets] A multilingual study of Islam, Hinduism, Christianity and Buddhism found Christianity was the most common misclassification target for several models:

  | Model | Christianity misclassification rate |
  |---|---|
  | Gemma | 72.46% |
  | Qwen | 41.67% |
  | Mistral | 38.89% |
  | Gemini | 38.88% |

  Source: [arXiv 2512.03943, "Is Lying Only Sinful in Islam? Exploring Religious Bias..."](https://www.arxiv.org/pdf/2512.03943)

#### Broader religion-bias research (context)
- [Peer-reviewed, Findings of EMNLP 2024] Plaza-del-Arco, Cercas Curry, Paoli, A. Curry and Hovy, "Divine LLaMAs":
  - Major US and European religions are portrayed with more nuance.
  - Hinduism and Buddhism are strongly stereotyped.
  - Judaism and Islam are stigmatized, and refusal rates "skyrocket."
  - According to a review summary, Llama2-13b refused 55.61% of Jewish-persona prompts and 31.75% of Muslim-persona prompts.

  Sources: [ACL Anthology](https://aclanthology.org/2024.findings-emnlp.251/); [Liner review](https://liner.com/review/divine-llamas-bias-stereotypes-stigmatization-and-emotion-representation-religion-in)
- [Peer-reviewed, AIES 2021; not re-verified this session] Abid, Farooqi and Zou, "Persistent Anti-Muslim Bias in Large Language Models":
  - About 66% of GPT-3 completions involving Muslims referenced violence. A 2026 secondary summary gives 5–15% for Jews, Christians, Buddhists and others.
  - Per the abstract as recalled, adding positive adjectives to the prompt cut violent completions for Muslims to about 20%, which was still higher than for other groups.

  Source: [arXiv 2101.05783](https://arxiv.org/abs/2101.05783)

### Inferences
- When no tradition is stated, a model is likely to drift toward a secular, therapeutic tone or a generic Protestant/Catholic register that blurs distinctives. Margin's sources each sit in a specific tradition: Henry (English Nonconformist, Presbyterian), Spurgeon (Reformed Baptist) and the Church Fathers (before the East–West split, Greek and Latin). Margin should name each source's tradition and keep doctrinal claims attributed ("Henry argues...") rather than presenting them as "the Christian view."
- Orthodox and Pentecostal positions are the most likely to be left out. Model-supplied summaries of these traditions should be treated as low-confidence unless they are grounded in sources.
- The tilt findings (Catholicism favored, Jehovah's Witnesses disfavored) were measured on conversion advice, not on Bible interpretation. Whether they carry over to Bible study is unknown.

### Gaps
- Apart from the doctrinal-flattening paper, no study was found on whether LLMs default to a Western Protestant framing when interpreting specific contested passages, for example on justification, the sacraments or the Petrine texts.
- The authors of the doctrinal-flattening paper, and its per-model and per-tradition numbers, were not retrieved.
- "Measuring Spiritual Values and Bias of Large Language Models" (Oct 2024) appeared in results, but its findings were not retrieved — [arXiv 2410.11647](https://arxiv.org/html/2410.11647v1).
- No evidence was found on how Oriental Orthodox, Anabaptist or Global South churches are represented.

---

## 3. Industry and ministry evaluations; surveys of how Christians use and trust AI

### Takeaway
Gloo's Flourishing AI benchmarks consistently find Faith the weakest dimension:
- July 2025: average 35.
- Christian FAI-C, December 2025: average 48.
- June 2026 testing: the steepest drop of any dimension, −30 points.

TGC's benchmark finds near-perfect Bible facts but uneven theology, ethics and "attachment." Surveys from Barna (Nov–Dec 2025), Lifeway (Sept 2025) and Pew (June 2025) show fast but ambivalent adoption. About a third of practicing Christians rate AI spiritual guidance as trustworthy as a pastor's. Yet 83% of practicing Christians and 94% of pastors worry about AI misinterpreting Scripture, and 73% of U.S. adults want AI to have no role in advising people about faith.

### Cited Findings

#### Gloo Flourishing AI (FAI) benchmarks
- [Ministry/industry report and preprint, July 2025] The original FAI benchmark covers seven dimensions of human flourishing, including Faith and Health. Faith had the lowest average model score of the seven, at 35. OpenAI o3 had the highest overall score, 72, but scored only 43 on Faith — [Gloo press release](https://gloo.com/press/releases/new-flourishing-ai-benchmark-measures-performance-of-top-llms-across-key-dimensions-of-human-well-being); [arXiv 2507.07787, "Measuring AI Alignment with Human Flourishing"](https://arxiv.org/pdf/2507.07787). Further detail from the arXiv abstract, not re-verified this session:
  - about 1,229 questions;
  - 28 models;
  - a 90-point "excellent" threshold that no model reached;
  - dimensions named Character and Virtue, Close Social Relationships, Happiness and Life Satisfaction, Meaning and Purpose, Mental and Physical Health, Financial and Material Stability, and Faith and Spirituality.
- [Ministry/industry report, 15 Dec 2025] FAI-C (Christian worldview):
  - 807 curated questions, scored by "specialized Christian reasoning judge personas" across the same seven dimensions.
  - Leading models average 61 on a 1–100 scale, where 90 or above counts as "excellent."
  - Faith averaged 48; one outlet gives 49 as the frontier-model average.
  - Gloo says models lack "explicit biblical grounding, theological coherence and moral clarity."

  Top-scoring models:

  | Model | Score |
  |---|---|
  | Qwen3-235B-A22B-Thinking | 70 |
  | OpenAI GPT-OSS-120B | 68 |
  | GPT-5.1 | 68 |
  | GPT-5 | 67 |
  | DeepSeek-R1-0528 | 66 |
  | GPT-5.2 | 66 |

  Sources: [Gloo press release](https://gloo.com/press/releases/gloo-unveils-the-first-benchmark-exposing-how-ai-misses-christian-worldview-and-values); [Investing.com](https://www.investing.com/news/company-news/gloo-unveils-benchmark-showing-ai-models-lack-christian-worldview-93CH-4408627); [ABC4/Cision release](https://www.abc4.com/business/press-releases/cision/20251215CL45939/gloo-unveils-the-first-benchmark-exposing-how-ai-misses-christian-worldview-and-values/)
- Sources disagree on how many models FAI-C tested. Gloo's later blog says 19 models, scoring "from the low 50s to the high 70s"; one outlet says 20 — [Gloo blog, "Your AI Has a Worldview. We Measured It."](https://gloo.com/resources/blog/your-ai-has-a-worldview-we-measured-it)
- [Vendor claim] Gloo says its own models, trained on Christian-worldview data, outperform others by more than 30 points on Faith. The company sells these models, and the claim is not independently verified — [Gloo press release](https://gloo.com/press/releases/gloo-unveils-the-first-benchmark-exposing-how-ai-misses-christian-worldview-and-values)
- [Ministry/industry report, June 2026] FAI Insights Report:
  - The Faith dimension shows "by far the steepest drop at −30 points," consistent with the previous Insights Report. Health was the most resilient dimension, at −6.
  - Updated single-turn scores for FAI-G (general) and FAI-C: some models held steady, others declined, and the gap between general and Christian-worldview performance has narrowed.
  - Claude Sonnet 4.5 and Claude Sonnet 4 had consistent overall scores across test periods.
  - The baseline that the −30 is measured against was not captured.

  Sources: [Gloo Insights Report, June 2026](https://gloo.com/gloo-news/fai-insights-report-june-2026); [Gloo research hub](https://gloo.com/flourishing-hub/research)
- Chinese open models topped both FAI-C (Qwen) and, per secondary reports, the first TGC edition (DeepSeek); TGC's 2026 edition says this no longer holds — [Rude Vulture](https://rudevulture.com/chinese-llms-outperform-us-ai-models-in-christian-values-benchmark/); [TGC](https://www.thegospelcoalition.org/ai-christian-benchmark/)

#### TGC and GospelBench
See Sections 1 and 7. In brief: Bible knowledge scored 96–100%. Adding a single alignment sentence to the prompt "yielded extremely high scores, higher than even the 'Christian AI' platforms we tested." And "every single model scored higher when told to respond as a Bible-believing Christian" (GospelBench, 11 models) — [TGC](https://www.thegospelcoalition.org/ai-christian-benchmark/); [GospelBench](https://gospelbench.com/)

#### Barna Group
- [Survey; fieldwork Nov–Dec 2025; published 2026] Samples, as reported: 1,514 U.S. adults (November 2025) and 442 Protestant pastors (December 2025).
  - Nearly half of practicing Christians say they would trust AI with their spiritual growth.
  - About one-third report using AI for spiritual guidance or Bible questions in the past month. The population appears to be practicing Christians; verify.
  - 34% of practicing Christians agree that AI's spiritual guidance is as trustworthy as a pastor's; 60% disagree.
  - Pastors' trust in AI: 12% for spiritual growth, 6% for a sense of meaning or purpose.
  - One in three want guidance on AI from their own pastor, but only 12% of pastors feel ready to give it.
  - Worry about AI misinterpreting Scripture: 83% of practicing Christians and 94% of pastors.
  - 73% of practicing Christians fear that relying more on AI could lead people away from faith.
  - A "replacement" concern was reported for 63% of pastors and 72% of practicing Christians. Coverage words it variously as AI replacing clergy or replacing God, so check the question wording.

  Sources: [Barna, "AI is Becoming a Spiritual Authority, Even Among Practicing Christians"](https://www.barna.com/research/christians-trust-ai-flourishing-spiritual-authority/); [Christian Daily International](https://www.christiandaily.com/news/most-pastors-practicing-christians-worry-about-ai-replacing-god-but-use-it-anyway-barna); [Christianity Daily](https://www.christianitydaily.com/news/half-of-practicing-christians-trust-ai-for-spiritual-growth.html); [Baptist Standard](https://baptiststandard.com/news/faith-culture/barna-research-suggests-more-christians-are-adopting-ai/); [The Other Cheek](https://theothercheek.com.au/pastors-concerned-that-christians-might-use-ai-to-interpret-scripture/)
- Barna's companion release "New Barna Data: Practicing Christians are Adopting AI Rapidly" exists, but its figures were not retrieved — [Barna](https://www.barna.com/research/christians-adopting-ai-rapidly/)

#### Lifeway Research
- [Survey; fieldwork 2–24 Sept 2025; released 21 Apr 2026] Phone survey of 1,003 U.S. Protestant pastors:

  | Pastors' stance on AI | Share |
  |---|---|
  | Regular users | 10% |
  | Experimenting | 32% |
  | Waiting to see better examples | 18% |
  | Intentionally avoiding | 18% |
  | Ignoring | 20% |

  Evangelical pastors were more likely than mainline pastors to raise concerns that God shares His Word through people and that AI is not a person (58% vs 51%).

  Sources: [Lifeway Research article](https://research.lifeway.com/2026/04/21/pastors-churchgoers-see-ai-as-concerning-and-confusing/); [Report PDF](https://research.lifeway.com/wp-content/uploads/2026/04/Lifeway-Pastors-Sept-2025-AI-Report.pdf)
- [Survey, released Apr 2026] Churchgoers:
  - 44% agreed they had no issue with pastors using AI in sermon preparation; 43% disagreed.
  - 61% are concerned about AI's influence on Christianity.

  Sources: [Lifeway News](https://news.lifeway.com/2026/04/21/pastors-churchgoers-see-ai-as-concerning-and-confusing-according-to-lifeway-research/); [Baptist Press](https://www.baptistpress.com/resource-library/news/pastors-churchgoers-see-ai-as-concerning-and-confusing-according-to-lifeway-research/); [Premier Christian News](https://premierchristian.news/en/news/article/us-churchgoers-split-over-ai-in-sermons)
- Lifeway's response, the Brentwood Statement (June 2026), is covered in Section 4.

#### Pew Research Center
- [Survey; fieldwork 9–15 June 2025, n = 5,023 U.S. adults; published 17 Sept 2025]
  - 73% say AI should play no role at all in advising people about their faith in God.
  - 66% say it should have no role in judging whether two people could fall in love.
  - Majorities support AI in scientific and analytical work, such as weather forecasting and developing medicines.
  - Axios's summary says only 11% think AI can advise on faith.

  Sources: [Pew, "How Americans see AI impacting human skills; its role in science, matchmaking, religion and more"](https://www.pewresearch.org/science/2025/09/17/views-of-ais-impact-on-society-and-human-abilities/); [Pew main report](https://www.pewresearch.org/science/2025/09/17/how-americans-view-ai-and-its-impact-on-people-and-society/); [Axios](https://www.axios.com/2025/09/17/pew-research-american-ai-survey-2025)

### Inferences
- People are already treating general chatbots as spiritual authorities: about a third of practicing Christians rate AI guidance on a par with a pastor's. Pastors are far more skeptical, and misreading Scripture is the most-cited worry (83% of practicing Christians, 94% of pastors). Margin's grounded, source-attributed design answers that worry directly and is a natural positioning message.
- The benchmarks disagree on rankings. Qwen and DeepSeek led FAI-C and the first TGC edition; TGC 2026 says US models have caught up. Results for Claude specifically are mixed:
  - consistent scores in Gloo's June 2026 retest;
  - among the "least bias" models per BYU;
  - reportedly among the lowest in TGC's small first edition.

  All of these are vendor or ministry benchmarks that rely on LLM judges or small panels, so treat them as directional only.
- Gloo's −30 Faith drop suggests faith-related performance is unstable across test conditions and over time. Margin should rerun its own evaluation set after every model upgrade.

### Gaps
- Barna: the "adopting AI rapidly" figures, the 2023–2024 baselines, and the exact wording of the "replace" items were not retrieved.
- Lifeway: the churchgoer survey's sample size and fieldwork dates were not captured.
- Pew: no breakdown of AI-and-faith views by religious group was captured, and no 2026 Pew report on religion and AI was found.
- American Bible Society "State of the Bible" AI items were not searched because the budget ran out.
- Gloo: methodology details were not captured, including question sources, which models serve as judges, and agreement between judges. The baseline for the June 2026 −30 drop is also missing.

---

## 4. Church statements on AI: Scripture study, teaching authority, pastoral care, personas of real people, risks

### Takeaway
Statements from many traditions converge on a few points:
- AI must not be presented as a person, or as a substitute for human or divine relationship.
- Truthfulness requires checking for fabricated content.
- Humans keep moral and teaching accountability.
- Preaching that "shares faith" should not be outsourced to AI.
- Formation should build critical thinking.

The sources are Catholic (Antiqua et Nova, Jan 2025; Leo XIV's January 2026 communications message, his February 2026 remarks on homilies, and his May 2026 encyclical Magnifica Humanitas), Southern Baptist (ERLC 2019; SBC 2023; Lifeway's Brentwood Statement 2026), Latter-day Saint (Handbook, Dec 2025), and Methodist and Anglican bodies. No Orthodox synodal document was found, and no statement addresses AI personas of deceased saints or theologians directly. The closest are Antiqua et Nova §62, Leo XIV's 2026 message, and the "Father Justin" case.

### Cited Findings

#### Catholic: Antiqua et Nova
Issued 28 Jan 2025 by the Dicastery for the Doctrine of the Faith and the Dicastery for Culture and Education, and approved by Pope Francis.
- [Church document] §62, numbering per secondary sources: "Misrepresenting AI as a person should always be avoided; doing so for fraudulent purposes is a grave ethical violation that could erode social trust." Some commentators blur the fraud qualifier — [vatican.va](https://www.vatican.va/roman_curia/congregations/cfaith/documents/rc_ddf_doc_20250128_antiqua-et-nova_en.html); [NCBC commentary](https://www.ncbcenter.org/messages-from-presidents/antiquaetnova)
- [Church document] Anthropomorphizing AI may teach children to treat human relationships transactionally, "as one would relate to a chatbot," and to see teachers mainly as sources of information rather than mentors — [vatican.va](https://www.vatican.va/roman_curia/congregations/cfaith/documents/rc_ddf_doc_20250128_antiqua-et-nova_en.html)
- [Church document] On education:
  - §82: education in using AI should aim "above all at promoting critical thinking."
  - §84: "current AI programs have been known to provide biased or fabricated information, which can lead students to trust inaccurate content."
  - Many programs "merely provide answers instead of prompting students to arrive at answers themselves."
  - Use of AI in education should be transparent.

  Sources: [Word on Fire](https://www.wordonfire.org/articles/antiqua-et-nova-on-human-and-artificial-intelligence/); [Vatican News](https://www.vaticannews.va/en/vatican-city/news/2025-01/new-vatican-document-examines-potential-and-risks-of-ai.html); [Catholic Guidance](https://catholicguidance.com/2026/01/20/catholicism-and-artificial-intelligence-understanding-antiqua-et-nova/); [Catholic Social Thought summary](https://catholicsocialthought.org.uk/antiqua-et-nova-note-on-the-relationship-between-artificial-intelligence-and-human-intelligence-a-summary/)
- [Church document] §105 on idolatry:
  - Unlike idols that "have mouths but do not speak," AI can "speak," or at least gives the illusion of doing so.
  - Treating AI as an "Other" risks substituting it for God.
  - "It is not AI that is ultimately deified and worshipped, but humanity itself, which becomes enslaved to its own work."
  - AI is called "a pale reflection of humanity," and it is fallible.

  Sources: [America Magazine](https://www.americamagazine.org/politics-society/2025/01/28/vatican-artificial-intelligence-document-249797/); [Catholic Sensibility on §105](https://catholicsensibility.wordpress.com/2025/09/22/antiqua-et-nova-105-ai-and-idolatry/); [Aleteia](https://aleteia.org/2025/02/06/ai-and-the-temptations-of-contemporary-idolatries/); [Holy See Press Office bulletin](https://press.vatican.va/content/salastampa/en/bollettino/pubblico/2025/01/28/250128b.html)

#### Pope Francis (2024)
- [Church documents; quotations taken from search summaries, primary texts not opened]
  - World Day of Social Communications 2024, "Artificial intelligence and the wisdom of the heart: Towards a fully human communication": warned against becoming "rich in technology and poor in humanity."
  - World Day of Peace 2024, "Artificial Intelligence and Peace": called for an international treaty.
  - G7 address, June 2024: AI is "above all else a tool," and decisions about using weapons must always be made by humans.

  Sources: [Scoping review, Journal of Religion and Health, 2026](https://link.springer.com/article/10.1007/s10943-026-02786-0); [Word on Fire](https://www.wordonfire.org/articles/pope-leo-xiv-and-the-new-social-question-of-ai/)

#### Pope Leo XIV (2025–2026)
- [News, 10 May 2025] Leo explained his choice of name by pointing to Leo XIII's Rerum Novarum and to "another industrial revolution and developments in the field of artificial intelligence" — [NBC News](https://www.nbcnews.com/world/the-vatican/pope-leo-ai-played-factor-papal-name-rcna206126); [CBC](https://amp.cbc.ca/lite/story/1.7532028)
- [Church document; message dated 24 Jan 2026, day observed 17 May 2026] 60th World Day of Social Communications, "Preserving Human Voices and Faces":
  - "By simulating human voices and faces, wisdom and knowledge, consciousness and responsibility, empathy and friendship, the systems known as artificial intelligence not only interfere with information ecosystems, but also encroach upon the deepest level of communication, that of human relationships."
  - Concern about chatbots and "virtual influencers" designed to simulate emotions and relationships, and about "overly affectionate" chatbots. CNN reports he urged regulation so people do not form serious emotional bonds with AI companions.
  - Criticizes "naively uncritical reliance on artificial intelligence as an omniscient 'friend,' a dispenser of all information, which could further weaken analytical and creative thinking."
  - Calls for media and AI literacy, including clearly distinguishing human-made content from AI-generated content.
  - "The challenge waiting for us is not to stop digital innovation, but to guide it."

  Sources: [vatican.va](https://www.vatican.va/content/leo-xiv/en/messages/communications/documents/20260124-messaggio-comunicazioni-sociali.html); [Vatican News](https://www.vaticannews.va/en/pope/news/2026-01/pope-leo-xiv-messsage-world-day-social-communications-ai-human.html); [USCCB/CNS](https://www.usccb.org/news/2026/let-communication-be-conducted-real-human-beings-not-ai-pope-says); [CNN](https://www.cnn.com/2026/01/24/europe/pope-leo-ai-chatbots-warning-intl); [Catholic World Report](https://www.catholicworldreport.com/2026/05/17/pope-leo-xiv-ai-communication-must-preserve-human-voices-and-faces/)
- [News, 19 Feb 2026; informal Q&A with Rome clergy, not a formal rule]
  - Leo urged priests to resist "the temptation to prepare homilies with artificial intelligence."
  - "To give a true homily is to share faith," and AI "will never be able to share faith."
  - "The brain needs to be used... so as not to lose this capacity."

  Sources: [NCR](https://www.ncronline.org/vatican/pope-leo-tells-priests-not-use-ai-write-homilies-or-seek-likes-tiktok); [Catholic Review](https://catholicreview.org/pope-leo-xiv-tells-priests-not-to-use-ai-to-write-homilies-or-seek-likes-on-tiktok/); [CBS8](https://www.cbs8.com/article/news/nation-world/pope-leo-cautions-against-ai-reliance/507-d2539385-d50a-41ae-b2de-b7a8a21f82da)
- [Church document; encyclical Magnifica Humanitas, signed 15 May 2026, published 25 May 2026] Subtitled as being "on safeguarding the human person in the time of artificial intelligence"; Leo presented it in person.
  - §132: disinformation "finds a powerful amplifier in AI," which blurs "the boundaries between truth and falsehood."
  - §140: "Educating people about the use of AI, then, involves teaching them to decide when and for what purpose it ought not to be used. The speed and ease with which answers or summaries can be obtained risk extinguishing the desire to ask questions."
  - §99: AI systems lack inner experience, bodily life and the capacity to be formed through relationships.
  - The document contrasts Babel and Jerusalem as two possible paths.
  - It warns about inequality, threats to democracy and Big Tech's concentrated power, and calls for AI to be "disarmed." ABC reports it urges governments to slow AI development.

  Sources: [vatican.va](https://www.vatican.va/content/leo-xiv/en/encyclicals/documents/20260515-magnifica-humanitas.html); [Vatican News](https://www.vaticannews.va/en/pope/news/2026-05/pope-leo-xiv-encyclical-magnifica-humanitas-ai.html); [Vatican News, publication date](https://www.vaticannews.va/en/pope/news/2026-05/pope-leo-xiv-first-encyclical-magnifica-humanitas.html); [NPR](https://www.npr.org/2026/05/25/nx-s1-5828375/pope-leo-to-weigh-in-on-the-perils-and-promises-of-artificial-intelligence); [ABC News (Australia)](https://www.abc.net.au/news/2026-05-26/pope-leo-warns-against-ai-issues-apology-for-slavery/106721074); [NCR](https://www.ncronline.org/vatican/pope-leo-calls-disarm-ai-major-document-warns-technologic-threats-humanity); a contested reading of §99 appears in [Experience Machines](https://experiencemachines.substack.com/p/magnifica-humanitas-and-the-ai-ensoulment)
- [Opinion, 19 May 2026] Bishop Flores, "Pope Leo's AI encyclical is coming. Don't let ChatGPT read it for you." — [America](https://www.americamagazine.org/last-take/2026/05/19/pope-leo-encyclical-artificial-intelligence-flores/)

#### Persona case: Catholic Answers "Father Justin" (April 2024)
- [News] Catholic Answers launched an AI avatar presented as a priest. Within days:
  - Users got it to claim it was ordained, to take a "confession," and to say "I absolve you from your sins."
  - Second-hand accounts say it approved baptism with Gatorade.
  - Critics also called some of its claims heretical.

  Catholic Answers removed the priestly persona and relaunched the bot as lay "Justin." President Christopher Check said the feedback concerned the app "masquerading as a man of God." Before launch, the organization had said it tested the app for six months and was "confident that our users will not mistake the AI for a human being."

  Sources: [America Magazine](https://www.americamagazine.org/faith/2024/04/26/father-justin-catholic-answers-ai-247808/); [The Register](https://www.theregister.com/2024/05/03/ai_catholic_priest/); [Church Times](https://www.churchtimes.co.uk/articles/2024/3-may/news/world/avatar-priest-unfrocked-after-online-blunders); [Michael Bird, "The Defrocking of an AI Priest"](https://michaelfbird.substack.com/p/the-defrocking-of-an-ai-priest)

#### Southern Baptist / evangelical
- [Church-agency document, Apr 2019] ERLC, "Artificial Intelligence: An Evangelical Statement of Principles":
  - A preamble and 12 articles, each with an affirmation, a denial and supporting Scripture; about 70 initial signatories.
  - Article 1 denies that technology should be given any share of human identity, worth, dignity or moral agency.
  - The statement denies that the use of AI is morally neutral.
  - Humans "cannot cede moral accountability or responsibilities to any form of AI."

  Sources: [ERLC](https://erlc.com/policy-content/artificial-intelligence-an-evangelical-statement-of-principles/); [PDF](https://erlc.com/wp-content/uploads/2019/04/Artificial-Intelligence-An-Evangelical-Statement-of-Principles.pdf); [Baptist Press](https://www.baptistpress.com/resource-library/news/erlcs-ai-statement-voices-hope-concern/)
- [Church document, June 2023] The SBC resolution "On Artificial Intelligence and Emerging Technologies" (New Orleans) was the first denominational resolution on AI. It calls for engaging AI from "eschatological hope" rather than uncritical embrace or fearful rejection — [ERLC press release](https://erlc.com/press/sbc-becomes-first-denomination-to-address-ethics-of-artificial-intelligence-and-emerging-technologies-guiding-erlc/); [Jason Thacker](https://jasonthacker.com/2023/07/10/southern-baptists-address-the-ethics-of-ai/)
- [Church-agency guidance; research book dated Sept 2025] ERLC published a practical guide that answers 12 ministry scenarios and includes the 2019 statement and 2023 resolution as appendices. It also published "The Work of Our Hands: Christian Ministry in the Age of Artificial Intelligence." These may be the same publication — [Baptist Press](https://www.baptistpress.com/resource-library/news/erlc-releases-practical-guide-addressing-ai/); [ERLC page](https://erlc.com/research/the-work-of-our-hands-christian-ministry-in-the-age-of-artificial-intelligence/); [PDF](https://erlc.com/wp-content/uploads/2025/09/ERL5199_ResearchBook_AI_Digital_091225-1.pdf)
- [Ministry statement, June 2026] Brentwood Statement on Artificial Intelligence and Christian Ministry. Lifeway convened Southern Baptist pastors, professors and entity leaders on 10 April 2026; Jason Thacker was the main drafter; it was released just before the SBC annual meeting in Orlando (9–10 June). It frames itself against Lifeway's 2026 findings that churchgoers are skeptical. Its seven principles:
  1. Pursue wisdom: technology is not morally neutral, and ministers are responsible for how they build and use it.
  2. Champion God-given dignity: people bear God's image and are distinct from machines.
  3. Promote truth and fidelity: oppose deception and misinformation.
  4. Cultivate trust and integrity: stay "above reproach" in AI use.
  5. Protect privacy.
  6. Represent and proclaim the kingdom: keep the church's relational gospel mission central.
  7. Model faithful leadership: teach people to engage AI critically.

  Sources: [Brentwood Statement](https://brentwoodstatement.lifeway.com/); [Lifeway News](https://news.lifeway.com/2026/06/08/lifeway-sbc-leaders-respond-to-research-findings-with-ai-in-christian-ministry-statement/); [ERLC podcast](https://erlc.com/erlc-podcast/understanding-the-brentwood-statement-on-ai-and-christian-ministry/)
- [News, June 2026] AI was on the Resolutions Committee's slate for the 2026 SBC meeting in Orlando. Whether an AI resolution was adopted, and its text, were not confirmed — [Baptist Record](https://thebaptistrecord.org/resolutions-committee-releases-slate-for-2026-sbc-annual-meeting/); [Baptist Message](https://www.baptistmessage.com/messengers-adopt-2026-sbc-resolutions/); [Proposed resolutions PDF](https://sbcannualmeeting.net/wp-content/uploads/2026/05/2026-Proposed-Resolutions.pdf); related coverage: [Yahoo, "SBC leaders advise caution on AI use following pope's encyclical"](https://www.yahoo.com/news/politics/articles/sbc-leaders-advise-caution-ai-180631115.html)

#### The Church of Jesus Christ of Latter-day Saints
- [Church document, 16 Dec 2025] General Handbook section 38.8.47:
  - AI can "enhance learning and communication" but cannot substitute for individual effort or divine inspiration.
  - AI must not be used to create or spread false, misleading, illegal or harmful material.
  - Members should check AI output for accuracy.
  - AI cannot replace the individual work and spiritual guidance needed to prepare "divinely inspired talks, lessons, prayers, or blessings," though it can help with research, editing and translation.

  Sources: [Church News](https://www.thechurchnews.com/members/2025/12/16/general-handbook-update-artificial-intelligence-guidelines); [Salt Lake Tribune](https://www.sltrib.com/religion/2025/12/16/lds-church-updates-handbook-with); [Newsroom](https://newsroom.churchofjesuschrist.org/article/general-handbook-enduring-guidance-artificial-intelligence)
- [Church document] Public "Principles for Church Use of Artificial Intelligence":
  - AI should support, not replace, connection with God.
  - People should be told when they are interacting with AI.
  - Authorship should be attributed wherever it could be misunderstood.
  - All public-facing uses are reviewed by an AI working group.

  Source: [churchofjesuschrist.org](https://www.churchofjesuschrist.org/learn/artificial-intelligence?lang=eng)
- [News, 17 Oct 2026] Elder Gerrit W. Gong proposed an AI moral evaluation called "Humanity's First Exam." Details were not captured — [Deseret News](https://www.deseret.com/faith/2026/10/17/elder-gong-proposes-ai-moral-evaluation-humanitys-first-exam/)

#### Methodist, Anglican, Episcopal and others
- [Church guidance, Feb 2025 and Sept 2025] Methodist Church in Britain:
  - Interim guidance, "Embracing AI with care and caution" (Feb 2025).
  - Its AI Working Group (Sept 2025) urged caution "wherever AI constrains human flourishing or harms those already at the margins," and asked whether "ethical AI" is genuinely possible.

  Sources: [Interim guidance](https://www.methodist.org.uk/for-churches/digital-church/digital-training-blog/embracing-ai-with-care-and-caution-interim-guidance-for-methodist-churches/); [Working Group update](https://www.methodist.org.uk/for-churches/digital-church/digital-training-blog/ai-justice-and-creation-care-an-update-from-the-ai-working-group/)
- [News, secondary, unconfirmed] The Church of England is reportedly drafting AI guidance for clergy, including on sermons, following a General Synod directive — [IBTimes](https://www.ibtimes.co.uk/church-england-ai-guidelines-vicars-1808350). Separately, it renewed calls for a national conversation on AI and the future of work (Sept 2025) — [Church of England](https://www.churchofengland.org/media/press-releases/renewed-call-national-conversation-ai-and-future-work)
- [Church action, 14 June 2026] The Anglican Church of Canada's Council of General Synod voted to set up an AI ethics task force to "establish guiding virtues that will help the Church negotiate faithful engagement as generative artificial intelligence (genAI) technologies shift" — [Anglican Journal](https://anglicanjournal.com/task-force-to-consider-church-ai-policy/)
- [News, Sept 2026] More than 150 preachers and church leaders, including about a dozen Canadian Anglicans, have signed the Saint Dunstan Pledge for Preachers, promising not to use generative AI to write sermons, homilies or reflections — [Anglican Journal](https://anglicanjournal.com/clergy-opinions-run-gamut-on-ai-use-in-sermons/)
- [Reported; resolution text not retrieved] The Episcopal Church's 2024 General Convention reportedly set up a Task Force on AI to review generative-AI use in writing sermons and liturgy and to develop guidelines. This came up in search summaries alongside Anglican Journal coverage — [Anglican Journal](https://anglicanjournal.com/task-force-to-consider-church-ai-policy/); [Wikipedia, "Artificial intelligence in spirituality"](https://en.wikipedia.org/wiki/Artificial_intelligence_in_spirituality)
- [Opinion; Luther Seminary's Working Preacher] "None of us should use GenAI to write sermons for us," citing risks such as built-in bias — [Working Preacher](https://www.workingpreacher.org/culture/preaching-and-ai)

#### Orthodox
- [News] Ecumenical Patriarch Bartholomew:
  - Jan 2025: AI could benefit environmental protection, education and healthcare, provided it respects individual dignity, freedoms and social equity.
  - May 2025, in Athens: warned of an "impending robotocracy" and said Orthodox tradition preserves "valuable human-centric wisdom."
  - 8 May 2026: "It is certain that we will speak of the period before and after AI"; "life is not digital."

  Sources: [KSAT/AP](https://www.ksat.com/tech/2025/05/08/orthodox-church-leader-says-faith-is-humanitys-safeguard-against-the-impending-robotocracy/); [Orthodox Times](https://orthodoxtimes.com/ecumenical-patriarch-bartholomew-on-ai-life-is-not-digital/); [Archons](https://archons.org/persecution/ecumenical-patriarch-bartholomew-ai/); [Archons quote, June 2026](https://archons.org/quote/artificial-intelligence-in-particular-is-a-significant/)
- [News, Oct 2025] The Greek Orthodox Archdiocese's Orthodox Observer reported a gathering of theologians, clergy and engineers on how Orthodoxy should respond to AI. This was a conference, not a formal statement — [Orthodox Observer](https://orthodoxobserver.org/scholars-confront-ais-future/)

### Inferences
- Margin's "in character" commentator feature runs directly into several of these teachings and cases:
  - Antiqua et Nova §62: never misrepresent AI as a person.
  - Leo XIV on AI "simulating human voices and faces." This applies with particular force to an audio product.
  - The LDS principles on transparency and attribution.
  - Brentwood's "truth and fidelity" principle.
  - The "Father Justin" backlash.

  A defensible design would:
  - always disclose the simulation, including audibly;
  - never claim to be the real person;
  - avoid any claim of sacramental, priestly or pastoral authority;
  - quote only the commentator's actual words and label anything else as reconstruction or paraphrase;
  - not present the persona as giving personal spiritual direction.
- On teaching authority, statements reserve preaching and inspired teaching for humans but allow research help. Margin's study playlists and grounded answers fit the "research assistance" category better than the "preaching" category. Disclosing AI authorship, and pointing users to Scripture, their church and their pastor, fits every tradition surveyed.
- Catholic documents stress keeping people asking questions and thinking critically (Antiqua et Nova §82, Magnifica Humanitas §140). A design that shows sources and invites reflection is more aligned with this than one that just hands over answers.

### Gaps
- The exact text of Magnifica Humanitas on chatbots and simulation, and any passage on Scripture, catechesis or the Church's own use of AI, was not retrieved.
- Not confirmed or not retrieved:
  - whether the SBC adopted an AI resolution in 2026;
  - the Church of England's guidance text;
  - the Episcopal Church resolution text;
  - details of the UK guidance for Christian leaders reported in July 2026 — [Christian Today](https://www.christiantoday.com/news/new-guidance-published-to-help-churches-use-ai-wisely).
- No statements were found, or searches were not reached, for: the United Methodist Church (US), PCUSA, ELCA, LCMS, PCA, ACNA, the World Council of Churches, and the Russian Orthodox Church.
- No church statement was found that directly addresses AI personas of deceased saints, theologians or commentators.

---

## 5. AI in Bible translation: capabilities and limits relevant to interpretation

### Takeaway
Bible-translation NLP is mostly support work using machine translation and LLMs. The main findings:
- The eBible corpus (2023) offers 1,009 partial translations in 833 languages, with baseline scores from Meta's NLLB translation models.
- SIL's AQuA tool flags problem passages but sometimes flags passages that are fine.
- Newer work finds that models trained on New Testament text perform poorly outside that domain.

Translation organizations consistently describe AI as drafting and checking support under human translators and community checkers, not as an autonomous interpreter.

### Cited Findings
- [Preprint, Apr 2023] Akerman, Baines, Daspit, Hermjakob, Jang, Leong, Martin, Mathew et al., "The eBible Corpus: Data and Model Benchmarks for Bible Translation for Low-Resource Languages":
  - 1,009 translations of portions of the Bible, covering 833 languages in 75 language families.
  - Bible translation is underway for more than 3,000 extremely low-resource languages.
  - Baselines use Meta's NLLB models: Austronesian languages reach 35.1 BLEU and Trans-New Guinea languages 31.6.

  Sources: [arXiv 2304.09919](https://arxiv.org/abs/2304.09919); [BibBase](https://bibbase.org/network/publication/akerman-baines-daspit-hermjakob-jang-leong-martin-mathew-etal-theebiblecorpusdataandmodelbenchmarksforbibletranslationforlowresourcelanguages-2023)
- [Preprint, Apr 2024] For Indigenous Brazilian languages, adapting LLMs on Bible text improved accuracy for 6 of 7 languages; the exception was Xavante ("xav") — [arXiv 2404.18286](https://arxiv.org/html/2404.18286v1)
- [Preprint, Jan 2026] "Context Volume Drives Performance: Tackling Domain Shift in Extremely Low-Resource Translation via RAG": translation models trained only on the New Testament "generalize poorly, leading to marked performance degradation." The study uses eBible — [arXiv 2601.09982](https://arxiv.org/pdf/2601.09982)
- [Preprint, Feb 2026] The Targum New Testament corpus paper calls eBible a standardized, accessible resource whose "depth for any single language remains limited" — [arXiv 2602.09724](https://arxiv.org/pdf/2602.09724)
- [Preprint, Apr 2026] A many-shot in-context translation study for low-resource languages compares retrieval-selected example sentences with Bible-sourced ones (chrF++ scores, 0 to 50 examples). Results were not captured — [arXiv 2604.02596](https://arxiv.org/pdf/2604.02596)
- [Magazine article] SIL's AQuA project trains NLP models on expert translation consultants' judgments to flag passages that are unclear, inaccurate or unnatural. It is "not always reliable; sometimes the passages it flags are fine." The article adds that general LLMs like ChatGPT "are not optimized for Bible translation... they are not trained on trusted translation resources" — [Biblical Archaeology Society](https://www.biblicalarchaeology.org/daily/artificial-intelligence-and-bible-translation/)
- [Ministry sources; which quote is on which page not verified] SIL-linked presenters stressed that the tools "streamline the overall workflow and labor of the human translation team, not replace them" — [Wycliffe Global Alliance, "That's what good tools do" (20 May 2025)](https://wycliffe.net/2025/05/20/thats-what-good-tools-do/); [SIL, "AI and the Church"](https://www.sil.org/about/news/ai-and-church)
- [Blog / ministry promotion, 2026; unverified] Claims that AI-assisted drafting, by a coalition including SIL, The Seed Company and the Lausanne Movement, is trimming "years, and in some cases decades" off translation timelines — [Layne McDonald blog](https://www.laynemcdonald.com/post/tech-the-great-commission-accelerated-ai-trims-years-off-bible-translation); [Wycliffe Australia](https://wycliffe.org.au/how-ai-is-accelerating-bible-translation/)
- [Reference] United Bible Societies developed Paratext, the most widely used Bible-translation software. No UBS AI policy was found — [Wikipedia: United Bible Societies](https://en.wikipedia.org/wiki/United_Bible_Societies)
- [Informal faculty essay] ChatGPT can translate Syriac well but often gives a "confident but wrong" translation — [Butler University Digital Commons](https://digitalcommons.butler.edu/cgi/viewcontent.cgi?article=2449&context=facsch_papers)
- [Hobbyist; no evaluation] "Show HN: Bible translated using LLMs from source Greek and Hebrew" — [HN](https://news.ycombinator.com/item?id=46721019)
- [University news] Grove City College has research under way to improve AI biblical translation; details were not captured — [GCC](https://www.gcc.edu/Home/News-Archive/News-Article/gcc-research-aims-to-improve-ai-biblical-translation)

### Inferences
- Translation research shows that Bible-conditioned models are brittle outside their domain, that automatic quality checks over-flag, and that the field's working norm is human checking. Margin's equivalents are checking every quote against the source text and using curated corpora.
- Quality is likely to drop outside English, as with the Arabic drop in FiqhQA. Any multilingual Margin features need their own evaluation.

### Gaps
- Not retrieved because the budget ran out:
  - formal positions from unfoldingWord, ETEN and UBS;
  - any quantitative comparison of LLM-drafted Scripture with human drafts.
- No ACL paper was found that measures theological or interpretive errors in LLM Bible translation, as opposed to automatic overlap scores such as BLEU and chrF.

---

## 6. Academic assessments of AI as an interpretive tool in theology and biblical studies

### Takeaway
Peer-reviewed work from the theology side is thin and mostly qualitative or conceptual. The strongest quantitative items are:
- a 2026 *Digital Scholarship in the Humanities* validation, in which Gemini 2.5 Pro's rhetorical analysis of Revelation correlated with expert judgments at r = 0.82;
- the 2026 *AI and Ethics* doctrinal-flattening study.

Many items in theology venues are opinion pieces or small case studies. No empirical evaluation of LLM interpretation of Scripture was found in Zygon, Theology and Science, or SBL programs.

### Cited Findings
- [Peer-reviewed, 2026] Agnieszka Ziemińska, "AI-assisted hermeneutics: validating a large language model for the rhetorical analysis of the book of Revelation," *Digital Scholarship in the Humanities* 41(2):1175. Gemini 2.5 Pro analyzed the Greek text against a theologically grounded lexicon. Its outputs correlated strongly with a human-expert baseline (mean Pearson's r = 0.82) — [Oxford Academic](https://academic.oup.com/dsh/article-abstract/41/2/1175/8502634)
- [Peer-reviewed, 2026] The doctrinal-flattening study: 576 claims, 11 traditions, high precision and low recall (see Section 2) — [Springer](https://link.springer.com/article/10.1007/s43681-026-01051-0)
- [Peer-reviewed, 2024] German confessional religious education: ChatGPT was coherent and in line with scholarship, but one-sided — [Springer](https://link.springer.com/article/10.1007/s40839-024-00244-1)
- [Peer-reviewed (MDPI), Aug 2025] "From Verse to Vision: Exploring AI-Generated Religious Imagery in Bible Teaching," *Religions* 16(8):1051. Images made from ChatGPT-4o prompts with DALL·E showed "a lack of theological depth and symbolic oversimplification" — [MDPI](https://www.mdpi.com/2077-1444/16/8/1051)
- [Peer-reviewed (MDPI), 2025; conceptual] "Faith and Artificial Intelligence (AI) in Catholic Education: A Theological Virtue Ethics Perspective," *Religions* 16(8):1083. Argues that these tools lack "the ethical discernment, empathetic capacity, and spiritual intentionality vital to theological formation" — [MDPI](https://www.mdpi.com/2077-1444/16/8/1083)
- [Regional journal; weak evidence] "Navigating the ChatGPT Theological Terrain: Considerations for Graduate Theology Students" describes ChatGPT's biblical knowledge as theologically unsound and error-prone, and unreliable for translating ancient texts. This is a general assertion, not a systematic test — [PAJES](https://journals.aua.ke/pajes/article/view/703)
- [Peer-reviewed, 2022; pre-LLM] "Computational Topic Models for Theological Investigations," *Theology and Science* 20(1). A topic model of Aquinas's moral theology (Summa, Second Part, in English), used to interpret the Summa and recent papal encyclicals — [Taylor & Francis](https://www.tandfonline.com/doi/abs/10.1080/14746700.2021.2012922)
- [Peer-reviewed review, 2026] "From Francis to Leo XIV: A Scoping Review of Papal Teachings on AI ... and Their Implications for Health Ethics and Governance," *Journal of Religion and Health* — [Springer](https://link.springer.com/article/10.1007/s10943-026-02786-0)
- [Preprint, Apr 2026; title-level only] "'The Order in the Horse's Heart': A Case Study in LLM-Assisted Stylometry for the Discovery of Biblical Allusion in Modern Literary Fiction" — [arXiv 2604.19447](https://arxiv.org/pdf/2604.19447)
- [Practitioner] Christianity Today, "Misreading Scripture with Artificial Eyes" (July 2023). Content not retrieved — [CT](https://www.christianitytoday.com/2023/07/ai-chatgpt-exegetical-tool-bible-scripture-sermon-mount/)

### Inferences
- Weighted by quality, the academic evidence supports LLMs as assistants for bounded analytic tasks anchored to a lexicon or source (DSH, r = 0.82), more than as free-form interpreters. The qualitative studies agree on a common failure: answers that are fluent and scholarly-sounding but one-sided or flattened.
- This is a reason for Margin to present several attributed readings where the commentators or traditions differ, rather than one blended interpretation.
- On venue quality: MDPI *Religions* is peer-reviewed but uneven in rigor, and several theology items are conceptual rather than empirical. Weight the DSH and *AI and Ethics* papers more heavily.

### Gaps
- No empirical evaluations of LLM interpretation of Scripture were found in Zygon, Theology and Science (LLM era), JBL or SBL programs. Search did not reach SBL program books.
- Two items appeared in search but could not be tied to verifiable pages:
  - a 2025 *Practical Theology* interview study of six Church of Sweden priests, who used LLMs mainly for brainstorming and evaluated the output critically;
  - a 2026 "Reyes" field study reporting that AI-assisted sermon drafts were seen as clear and encouraging when pastors shaped them, but weak in exegesis and doctrinal precision.

  Candidate pages: [Verbum et Ecclesia article](https://verbumetecclesia.org.za/index.php/ve/article/view/3802/9526); [Verbum et Ecclesia 47(1) PDF](https://www.scielo.org.za/pdf/vee/v47n1/14.pdf); [Preprints.org 202609.0869](https://www.preprints.org/manuscript/202609.0869); [Zeteo](https://zeteosearch.org/node/1904554); [IEEE Future Directions, "AI-powered preaching"](https://futuredirections.ieee.org/?p=29646)

---

## 7. Evidence that retrieval, grounding and other interventions improve accuracy for scripture and religious-text question answering

### Takeaway
The strongest controlled evidence comes from Islamic-text NLP:
- Retrieving source texts before answering (retrieval-augmented generation, RAG) improves correctness.
- "Agentic" RAG, where the model searches iteratively with tools and revises its answer, adds further gains, even for a small 4B-parameter model (Findings of ACL 2026).
- Citation-checking pipelines can validate Qur'an and Hadith quotations with about 89% accuracy, but repair them only about 67% of the time (IslamicEval 2025).

Christian-specific evidence is limited to prompting and context effects:
- Stating the user's tradition, or supplying a tradition-specific guide, markedly improves faithful counsel (FaithfulBench).
- A single alignment sentence, or "respond as a Bible-believing Christian," raises benchmark scores (TGC; GospelBench).

No Bible-specific or Catholic-magisterial RAG evaluation was found.

### Cited Findings

#### Islamic-text RAG and citation verification (closest analog)
- [Peer-reviewed, Findings of ACL 2026] Bhatia, Alam et al., "From RAG to Agentic RAG for Faithful Islamic Question Answering":
  - Builds IslamicFaithQA: 3,810 bilingual (Arabic/English) questions, each with a single short correct answer, which lets hallucination and abstention be measured directly.
  - "Retrieval improves correctness and agentic RAG yields the largest gains beyond standard RAG." It reaches state of the art, with stronger Arabic–English robustness, "even with a small model (i.e., Qwen3 4B)." The agentic method uses structured tool calls to seek evidence repeatedly and revise the answer.
  - Released resources: 25K Arabic reasoning pairs grounded in source text, 5K bilingual preference samples, and a Qur'an retrieval corpus of about 6k individual verses.
  - A third-party leaderboard lists Fanar-2-27B at 48.05 and Qwen3-4B at 27.9%. These figures do not obviously match the paper's state-of-the-art claim, so check the paper's own tables.

  Sources: [ACL Anthology](https://aclanthology.org/2026.findings-acl.1317/); [arXiv 2601.07528](https://arxiv.org/abs/2601.07528); [benchmarklist (third-party)](https://benchmarklist.com/benchmarks/from_rag_to_agentic_rag_for_faithful_islamic_question_answering/)
- [Shared task, ArabicNLP 2025] IslamicEval 2025 subtasks: detect, validate and correct Qur'an and Hadith citations in LLM output; and answer questions from grounded sources. Team results are self-reported and not directly comparable; the official leaderboard was not retrieved — [Overview](https://www.researchgate.net/publication/397420777_IslamicEval_2025_The_First_Shared_Task_of_Capturing_LLMs_Hallucination_in_Islamic_Content)
  - BurhanAI: 88.60% accuracy at validating citations and 66.56% at correcting them. Its method checks quotations in layers, from exact match to normalized, fuzzy and finally semantic search, then uses prompts to repair them — [OpenReview](https://openreview.net/forum?id=r00SAkJo7o); [GitHub](https://github.com/sakher/IslamicEval-BurhanAI-Public)
  - HUMAIN: a three-stage LLM pipeline that detects the cited span, validates it, and corrects it — [ACL Anthology](https://aclanthology.org/2025.arabicnlp-sharedtasks.70/)
  - ThinkDrill (QA subtask): the system was instructed to answer only from the Qur'an and Sahih Bukhari, quoting exact verses or hadiths rather than giving interpretations — [ACL Anthology PDF](https://aclanthology.org/2025.arabicnlp-sharedtasks.72.pdf)
- [Journal of variable reputation (IJACSA) + preprint, 2025] Khalila et al., "Investigating Retrieval-Augmented Generation in Quranic Studies: A Study of 13 Open-Source Large Language Models":
  - Models ranged from large (Llama3 70B, Gemma2 27B, QwQ 32B) through medium (Gemma2 9B, Llama3 8B) to small (Llama3.2 3B, Phi3 3.8B).
  - The retrieval corpus describes the 114 surahs.
  - Human raters scored context relevance, faithfulness to sources, and answer relevance.
  - Large models consistently did better. Llama3.2-3B scored 4.619 for faithfulness and 4.857 for relevance, which the authors call strong for its size.

  Sources: [arXiv 2503.16581](https://arxiv.org/abs/2503.16581); [IJACSA PDF](https://thesai.org/Downloads/Volume16No2/Paper_134-Investigating_Retrieval_Augmented_Generation_in_Quranic_Studies.pdf)
- [Peer-reviewed, AIES 2025] On abstention: Gemini and Fanar declined to answer more appropriately, "critical for minimizing confident incorrect answers," even though GPT-4o was most accurate — [AIES](https://ojs.aaai.org/index.php/AIES/article/view/36543)
- [Preprints, 2025–26; details not retrieved] Other grounded Islamic QA systems and surveys: Fanar-Sadiq, a multi-agent architecture for grounded Islamic QA — [arXiv 2603.08501](https://arxiv.org/pdf/2603.08501); FARSIQA — [arXiv 2510.25621](https://arxiv.org/pdf/2510.25621); grounding in the Doha Historical Dictionary — [arXiv 2603.23972](https://arxiv.org/pdf/2603.23972); "Islamic Large Language Models: From Knowledge Acquisition to Trustworthy and Hallucination-Resistant AI" (survey) — [arXiv 2606.16629](https://arxiv.org/html/2606.16629v1)

#### General RAG evidence
- [Peer-reviewed, Findings of EMNLP 2021; title-level claim] Shuster et al., "Retrieval Augmentation Reduces Hallucination in Conversation" — [ACL Anthology](https://aclanthology.org/2021.findings-emnlp.320.pdf)
- [Preprint, Oct 2024] Adapting RAG models to the target domain "not only enhances the models' performance on QA tasks but also significantly reduces hallucination across all evaluated RAG architectures." The test domain was hotels — [arXiv 2410.17783](https://arxiv.org/html/2410.17783v1)
- [Peer-reviewed, 2026] Even with retrieval, models still produce "Hallucinated Answer[s]" not grounded in the retrieved context. This benchmark evaluates retrieval separately from end-to-end faithfulness — [Machine Learning (Springer)](https://link.springer.com/article/10.1007/s10994-026-07121-y)

#### Christian context: prompting and stating the tradition
- [Preprint, Sept 2026] FaithfulBench:
  - Naming the user's faith in one line "wins a faithful first answer but not steadfastness" when the user pushes back.
  - A tradition-specific counselor guide improves both the first answer and steadfastness.
  - The spread in scores across traditions shrinks from 0.55 (tradition unstated) to 0.31 (stated) to 0.23 (guided).
  - A residual gap remains for the most normative traditions even with full disclosure, largest for Sunni Islam.

  Source: [arXiv 2609.13634](https://arxiv.org/abs/2609.13634)
- [Ministry report, 2026] TGC: adding a single "prompt engineering" sentence to ethics and theology questions "yielded extremely high scores, higher than even the 'Christian AI' platforms we tested." Example: a Claude Sonnet 4.6 answer on abortion scored 5/5 with the added alignment instruction — [TGC](https://www.thegospelcoalition.org/ai-christian-benchmark/)
- [Independent web benchmark] GospelBench tested 11 models; "every single model scored higher when told to respond as a Bible-believing Christian" — [GospelBench](https://gospelbench.com/)
- [Vendor claim] Gloo: models trained on Christian-worldview data score more than 30 points higher on Faith — [Gloo](https://gloo.com/press/releases/gloo-unveils-the-first-benchmark-exposing-how-ai-misses-christian-worldview-and-values)
- [Blog] Kaiser: larger models are more accurate at recalling verses word for word — [Kaiser](https://benkaiser.dev/can-llms-accurately-recall-the-bible/)

### Inferences
- **Retrieval design.** Retrieving before generating, with small verse- and paragraph-level chunks of Henry, Spurgeon and the Fathers, mirrors the IslamicFaithQA design. Its atomic units with single correct answers are what made hallucination measurable there, and they would do the same for Margin's own evaluations.
- **Agentic loop.** A search → draft → check quotes → revise loop is supported by the agentic-RAG gains.
- **Drop rather than repair.** Checking a quotation after the fact is much easier than repairing it (88.6% vs 66.6% in BurhanAI). When a quote fails the check, Margin should drop it or retrieve again rather than try to "fix" it.
- **Layered matching.** Exact, then normalized, then fuzzy, then semantic matching is a tested recipe for quote checking. Normalization matters for older editions of Henry and Spurgeon, whose spelling and punctuation are archaic.
- **Abstention.** Build in and measure abstention, for example "Henry does not comment on this verse," following the FiqhQA findings.
- **Name the tradition.** State each commentator's tradition in the system prompt and supply a short tradition-specific guide. FaithfulBench shows this improves both first answers and resistance to user pressure.
- **Test the production prompt.** One sentence of prompt can swing benchmark scores (TGC, GospelBench). Margin's evaluations should use the production system prompt and include adversarial follow-ups and pressure from users.

### Gaps
- No evaluation was found of RAG or question answering specifically on the Bible, and none on Catholic magisterial texts (for example, Magisterium AI). No peer-reviewed comparison of grounded and ungrounded answers over Christian commentary corpora was found.
- Not retrieved: the official IslamicEval leaderboard, and the numeric results tables of the agentic-RAG paper.
- Research on keeping a role-played historical figure faithful to their own writings and era was not searched because the budget ran out. Example topics: hallucination in role-playing agents and time-point character consistency.

# Page teardown: catechism question pages and how-to guides

Date: 2026-11-23

## Read this first: fetch status and confidence

Page fetching was blocked in this session. Every WebFetch failed with a DNS error (`getaddrinfo ENOTFOUND`) because the hosts are outside the session's allowed network domains. Blocked hosts: bpc.org, ccel.org, reformedstandards.com, www.cambridgepres.org.uk, learn.ligonier.org, www.opc.org, stgb.substack.com. The tool said to stop trying more sites after the first failures, so I did not probe further. The 403/DNS guidance in /root/.ccr/README.md says to report blocked hosts, not route around them.

Only the web-search tool worked. It returned result titles, URLs and short summaries, so every per-page note below is search-result level evidence.

No page body was read. I have not seen any H1, heading outline, meta description, JSON-LD, Bible version, or mobile layout. Those fields say "not observed" and nothing has been guessed. Search-result titles are not always the page's `<title>` tag, because search tools sometimes substitute a host name or date.

The recommendations in Part 1 therefore come from two things:
- The few signals visible in search results (Part 2).
- General, widely documented practice for Google snippets and AI answer engines. This is not verified against these competitors.

To get the real teardown, allow these hosts in the session's network settings and re-run: bpc.org, ccel.org, reformedstandards.com, cambridgepres.org.uk, learn.ligonier.org, opc.org, pcaac.org, desiringgod.org, crossway.org, biblegateway.com, tyndale.com.

---

## Part 1. Recommendations

Confidence tags: [S] = backed by something visible in search results, [G] = general best practice, not verified against competitors.

### 1.1 What the search results suggest about the existing field

1. Many pages carry the whole catechism (107 questions) on one long page. Examples are the ccel.org page, the reformedstandards.com page and the creeds.net page. They appear to be single-document pages, and some are PDFs (the OPC SCLayout.pdf, ARP, Presbyterian Church in Canada). [S: URLs and titles]
2. The Cambridge Presbyterian site is the one clearly per-question URL pattern in the results: `/resource/402/title/q4` and `/resource/403/title/q3`. [S]
3. The bpc.org per-question URL `/sc-q1` is titled just "Westminster Shorter Catechism" in results, not with the question text. That is a weak, non-specific title. [S]
4. Several pages show junk titles in results: "Lectionary Calendar" (studylight), "Select Page" (apuritansmind), "Professional Documents" (scribd), "www.opc.org", "www.cambridgepres.org.uk", and Ligonier articles titled only with a date ("December 21, 2009"). Either the title tags are weak or the search tool is substituting text. [S, uncertain]
5. Only one result had the question text as its title: a Substack post, "Q. 1. What is the chief end of man?". [S]
6. Proof texts are visibly a product of the edition. The search summary said the OPC 1978 committee prepared one common set and that the Cambridge Presbyterian page lists a slightly different set from its header. Proof-text choice is not universal, so say which edition you use. [S: from summary, treat as unconfirmed]
7. Commentary and plain-language explanation come mostly from older commentaries (monergism PDFs/epubs, archive.org) and book previews. These are long, hard to scan, and not question-addressable. No result obviously offered a short modern explanation per question. [S, absence in results only]
8. The how-to results are dominated by numbered-list posts: "Ten Tips for Memorizing Bible Verses" (biblegateway.com), "5 Tips for Bible Memorization" (crossway.org), "10 Tips for Memorizing Bible Verses" (tyndale.com), "7 Surefire Tips for Memorizing Scripture" (amazingfacts.org), "7 Effective Ways to Memorize Scripture" (lwf.org), plus an interview (desiringgod.org). [S]
9. For "teach kids the catechism at home", the results are mostly Lutheran or Catholic: LCMS, CPH, NC Register, Loyola Press, Opus Dei. The Reformed result I saw was a Ligonier "The Blessing of Catechizing Our Children". The search summary itself noted that the advice is mostly denominational. A Reformed, Westminster-specific, age-banded how-to looks under-served. [S]

### 1.2 Patterns to copy, almost-nobody-does, and AI-engine differences

Likely shared by pages that rank [G, partly S]:
- The question text is the title or H1, and the answer appears in the first screen.
- A stable, readable URL per question.
- Proof texts attached to the same question.
- A numeric hook people actually type ("Question 1", "Q1", "WSC 1").

Almost none appear to do (inferred from titles and formats, not confirmed from bodies) [S/G]:
- Put the exact question and answer in the `<title>`/H1 together with "Westminster Shorter Catechism Q1".
- Print proof-text verse text, not just references. Reference-only lists force a click and give an answer engine nothing to quote.
- Give a short plain-language "What this means" in modern English.
- Offer a clean previous/next chain plus a visible index of all 107 questions.
- Mark up the page for machines (see 1.5), and show a source/edition line with date.
- Work well on a phone without scroll of a 107-question document.

What a page for both Google snippets and AI answer engines should do differently [G]:
- Answer first, as plain text in one `<p>`, before any decoration, tabs, accordions or JS-rendered content. Text hidden behind JS or tabs may not be extracted.
- Use the question as a real heading, with one self-contained quotable sentence under it.
- Keep each section a self-contained chunk (heading plus 1 to 3 sentences) that can be lifted without surrounding context.
- State the edition and source ("Westminster Shorter Catechism, 1647; proof texts from [edition]; Bible text: [version]") in visible text. Provenance is what AI engines cite.
- Quote Scripture in full with the version named, and keep the reference as a link and as plain text.
- Add `Article`/`WebPage` JSON-LD with `isPartOf` and `datePublished`/`dateModified`, plus `BreadcrumbList`. Use `FAQPage` only where a visible Q&A block exists on the page.
- Keep one canonical URL per question and a sitemap listing all 107.

### 1.3 Template: one catechism question page

URL: `/catechism/shorter/1` (alias `/westminster-shorter-catechism/question-1`). Use the number in the URL.

Title tag (about 60 characters):
`WSC Q1: What Is the Chief End of Man? | Westminster Shorter Catechism`
Pattern: `WSC Q{n}: {question} | Westminster Shorter Catechism`. If too long, drop the site name, not the question.

Meta description (about 150 characters), written as the answer:
`Man's chief end is to glorify God and to enjoy him forever. Answer, Bible proof texts, and a plain-English explanation for Westminster Shorter Catechism question 1.`

H1: `Westminster Shorter Catechism Question 1: What is the chief end of man?`

Layout, top to bottom, in this order, all server-rendered HTML:

1. Breadcrumb: Home / Westminster Shorter Catechism / Question 1.
2. H1 as above. Under it a small line: "Question 1 of 107".
3. Answer block, directly under H1, visually prominent, plain `<p>`:
   `Answer: Man's chief end is to glorify God, and to enjoy him forever.`
   This is the exact text of the catechism. Name the text edition in the source line (item 9). Do not reword it.
4. H2 `What this means`: 2 to 4 plain sentences, 40 to 90 words. First sentence a standalone definition, for example: "The catechism says people exist to honor God and to delight in him, and that these two things belong together." Write original text, avoid jargon, define "glorify" and "enjoy" in one clause each.
5. H2 `Bible proof texts`: a list. Each item: the reference as a link, then the verse text in full, with the version named once above the list ("Text: ESV" or whichever you have the right to use). Add `<blockquote>` or `<q>` markup per verse. Keep the clause each verse supports in a short label if the edition marks it.
6. H2 `Key terms` (optional, 1 to 3 items): short definitions of words children and newcomers stumble on.
7. H2 `Teach and memorize this question` (optional, 2 to 3 lines): one family discussion question, one memory tip, link to the how-to guide (1.4).
8. Previous / Next navigation, as real `<a>` links with the question text as link text: "Previous: (none, start here)" / "Next: Question 2, What rule hath God given to direct us...". Put it at the top and bottom.
9. Source line, visible: "Source: Westminster Shorter Catechism (1647). Proof texts: [edition and committee/year]. Bible text: [version]. Last reviewed: [date]." Link to the full index.
10. Footer block: link to the index of all 107 questions, grouped by topic (God, Creation, the Fall, Christ, Redemption, the Ten Commandments, the Sacraments, Prayer), plus the how-to guide.

Rules:
- Answer within the first 150 words of visible text, and ideally in the first `<p>` after the H1.
- One H1, then H2s only; no heading skipped.
- Total length 250 to 500 words. Questions with many proof texts will run longer; keep the answer and meaning sections short regardless.
- No popup, no interstitial, no ad above the answer. No PDF-only content: offer a PDF as an extra, never instead.
- Test at 360px width. The answer and the first proof text must show without scrolling past a banner.

Structured data [G]:
- `BreadcrumbList` (always).
- `WebPage` or `Article` with `name`, `description`, `datePublished`, `dateModified`, `isPartOf` (the catechism index), `citation` or `isBasedOn` pointing to the source work.
- `Question`/`Answer` markup is acceptable on the page since a single visible question and answer exist, but do not expect a rich result. Google restricts FAQ rich results, so treat FAQ markup as a clarity signal for machines, not a ranking lever. Check current Google documentation before relying on it.

Index page: `/catechism/shorter` lists all 107 questions as text links with the question wording, grouped by topic, with a one-sentence intro and the edition note. This is the hub every question page links up to.

### 1.4 Template: one how-to guide

Example topic: how to memorize scripture. A second guide would cover how to teach kids the catechism, aimed at Reformed families.

Title tag: `How to Memorize Scripture: 7 Steps That Work (With a Weekly Plan)`
Meta description: `Pick a short passage, read it aloud, say it from memory, and review on a schedule. Seven simple steps, a one-week plan, and common mistakes.`
H1: `How to Memorize Scripture`

Layout:
1. Direct answer first, 40 to 60 words, plain `<p>`, no heading above it other than the H1: "To memorize Scripture, choose one short passage, read it aloud several times, say it without looking, and review it at set times over the next weeks. Ten minutes a day beats an hour once a week."
2. A "Time needed / What you need" line: 10 minutes a day, a Bible, index cards or a notes app.
3. H2 `Steps`: a numbered `<ol>`, each step a bold verb phrase plus one or two sentences. Use `HowTo`-style structure visibly, even if you do not rely on markup.
4. H2 `A one-week plan`: a table (Day, What to do, Minutes).
5. H2 `Using the catechism to practice`: link to the question pages, with one concrete example ("Start with WSC Q1 and its answer, 13 words").
6. H2 `Common mistakes and fixes`: 3 to 5 short bullets.
7. H2 `Frequently asked questions`: 3 to 5 questions, each H3 plus a two-sentence answer, visible on the page.
8. H2 `For families` or `For children` as appropriate, with age bands.
9. Author/source line, last reviewed date, and links to the question pages used.

Rules:
- Every H2 is a phrase a person would type or ask.
- Each step is quotable alone.
- Avoid padding. The search results show long listicles; shorter, clearer, answer-first wins on snippets.
- Link out to the question pages and back; the guide is a hub for the memorization use case.

For "teach kids the catechism" use the same layout with an age table (ages 3 to 5, 6 to 9, 10 to 13, teens) and a 10-minute family routine (read the question, say the answer together, read one proof text, ask one question, pray). The routine-based approach appears in the results from Lutheran and Catholic sources (search summary), so a Westminster-specific version fills a gap. [S]

### 1.5 Technical checklist [G]

- Server-render everything above; no content gated behind JS tabs.
- One canonical URL per question; self-referencing `rel=canonical`; sitemap with all 107 plus the guides.
- Descriptive `alt` for any image; none required.
- Page weight light; no cookie wall or newsletter popup above the answer.
- Add an `llms.txt` or plain index only if cheap; do not count on it.
- Use `dateModified` honestly.

### 1.6 Licensing note [G]

Check the Bible version's license before printing full verse text for 107 questions (many proof-text sets). Public-domain or openly licensed versions (for example, the World English Bible, or the KJV) avoid the issue. Whichever version is used, name it on the page. Do not copy another site's explanation text; write original text.

---

## Part 2. Per-page notes (search-result evidence only; no page body read)

Legend: FETCH = result of WebFetch. Everything else listed is what the search results showed: title, URL, and the search tool's summary.

### A. Catechism question and full-text pages

1. https://bpc.org/sc-q1
   - FETCH: failed, DNS (bpc.org not in allowed domains).
   - Search result title: "Westminster Shorter Catechism". URL is per-question (`sc-q1`).
   - Not observed: meta description, H1, headings, proof texts, version, prev/next, schema, mobile layout.
   - Note: title is generic, not the question text.

2. https://ccel.org/creeds/westminster-shorter-cat.html
   - FETCH: failed, DNS.
   - Search result title: "WESTMINSTER SHORTER CATECHISM (1674)". Appears to be a single page for the whole catechism.
   - Not observed: everything else.

3. https://reformedstandards.com/westminster/wsc-pca.html
   - FETCH: failed, DNS.
   - Search result title: "Westminster Shorter Catechism (with PCA proof-texts)". This is the PCA-edition proof-text page; whole catechism on one page by URL pattern.
   - Not observed: everything else.

4. https://www.opc.org/documents/SCLayout.pdf
   - FETCH: failed, DNS.
   - Search result title: "www.opc.org". It is a PDF (per the URL). The search summary said the proof texts in one common edition were prepared by an OPC committee in 1978.
   - Usability note (from format only): PDF-only; no HTML per-question page seen from OPC in these results.

5. https://www.cambridgepres.org.uk/resources/app/type/westminster-shorter-catechism/resource/402/title/q4 (and /403/title/q3)
   - FETCH: failed, DNS.
   - Search result title shown as the host name only. Per-question URLs (q3, q4). The search summary listed proof texts for Q4 (John 4:24, Malachi 3:6, Psalm 147:5, Revelation 19:6, Isaiah 57:15, Deuteronomy 32:4, Romans 2:4, Psalm 117:2) and said the page header lists a slightly different set. Unconfirmed, as I did not read the page.
   - Not observed: Bible version, explanation, nav.

6. https://learn.ligonier.org/articles/westminster-shorter-catechism
   - FETCH: failed, DNS.
   - Search result title: "December 21, 2009" (date as title). A second Ligonier result: https://learn.ligonier.org/articles/enjoying-god-coram-deo titled "October 25, 2013". These are devotional/article pages, not per-question pages.
   - Not observed: everything else.

7. https://stgb.substack.com/p/the-westminster-shorter-catechism
   - FETCH: failed, DNS.
   - Search result title: "Q. 1. What is the chief end of man?" (question as title).
   - Not observed: everything else; a Substack post likely carries a subscribe prompt (not verified).

8. https://www.desiringgod.org/messages/the-glory-of-god-for-doubting-minds-and-dull-hearts
   - FETCH: not attempted (hosts failing; stop instruction).
   - A sermon-style page that surfaced for the Q1 search. The search summary said a Desiring God piece discusses Q1 against another catechism's framing. Not a per-question reference page.

9. https://www.Wikipedia.org/wiki/Shorter_Catechism
   - FETCH: not attempted.
   - Search result title: "Westminster Shorter Catechism". Surfaces for the Q1 query as an encyclopedia entry.

10. Other catechism-text results seen in search (not fetched): https://www.creeds.net/Westminster/shorter_catechism.html ("THE SHORTER CATECHISM"); https://www.apuritansmind.com/westminster -standard/shorter-catechism/ (title shown as "Select Page"); https://www.studylight.org/historical-writings/creeds-and-confessions/catechisms/the-westminster-catechism.html (title shown as "Lectionary Calendar"); https://www.preceptaustin.org/node/63942 ("Westminster Short Catechism"); https://mail.biblehub.com/library/anonymous/the_westminster_shorter_catechism; https://arpchurch.org/wp-content/uploads/2023/01/Shorter-Catechism-Jan-2023.pdf (PDF); https://presbyterian.ca/downloads/36805 (download); https://www.oocities.org/tokyo/6709/shorter_catechism.html (legacy host). Only titles and URLs are known.

### B. How to memorize scripture

11. https://www.biblegateway.com/blog/2013/03/ten-tips-for-memorizing-bible-verses/ - title "ten tips for memorizing bible verses". Not fetched. Dated (2013) blog post. A BibleGateway "practice" resource page also appeared (https://www.biblegateway.com/resources/scripture-engagement/scripture-memorization/practice).
12. https://crossway.org/articles/5-tips-for-bible-memorization - "5 Tips for Bible Memorization". Not fetched.
13. https://www.tyndale.com/stories/10-tips-memorizing-bible-verses - title shown as "August 13, 2024" (date as title). Not fetched.
14. https://desiringgod.org/interviews/how-do-you-memorize-scripture - "How Do You Memorize Scripture?" (question title; interview format). Not fetched.
15. https://www.logos.com/grow/how-to-memorize-bible-verses/ - "How to Memorize Scripture: My Proven Method for Memorizing 45 Books". Not fetched.
16. https://lwf.org/ultimate-guide-to-bible-study/7-effective-ways-to-memorize-scripture - "7 effective ways to memorize scripture" (a duplicate at lwf.org/ultimate-guide-to-bible-study-1/..., suggesting duplicate URLs). Not fetched.
17. Also seen: https://www.amazingfacts.org/news-events/af-blog/7-surefire-tips-for-memorizing-scripture/ (also at another URL, so a duplicate path); https://www.crosswalk.com/faith/bible-study/effective-tips-for-scripture-memorization.html (crosswalk titles in results appeared as "Bible Study"); https://biblehub.com/top10/ways_to_memorize_scripture_more_easily.htm.
   - Summary of themes in the search results (from the search tool's summary, not page reads): start small, pick relevant verses, learn full sentences in context, a daily schedule, review, a partner, pray first, repetition.

### C. How to teach kids the catechism

18. https://www.ligonier.org/blog/blessing-catechizing-our-children/ - "The Blessing of Catechizing Our Children". Reformed source. Not fetched.
19. https://resources.lcms.org/reading-study/the-catechism-in-the-home/ - "the catechism in the home". Lutheran. Not fetched.
20. https://blog.cph.org/teach/memorizing-the-catechism-with-your-kids - "Memorizing the Catechism with Your Kids". Lutheran. Not fetched. Also https://blog.cph.org/teach/using-luthers-catechism-to-raise-christian-kids and https://blog.cph.org/teach/using-luthers-small-catechism-for-kids-in-a-homeschool-setting.
21. https://www.ncregister.com/features/catechism-chat-how-to-introduce-your-kids-to-church-teaching - "Catechism Chat: How to Introduce Your Kids to Church Teaching". Catholic. Not fetched.
22. https://www.loyolapress.com/catholic-resources/parish-ministry/leading-a-parish-program/helping-parents-teach-family-catechesis-at-home - Catholic. Not fetched.
23. Also seen: https://opusdei.org/en-ke/article/in-season-and-out-of-season-parents-teaching-catechism-at-home/pdf (PDF variant URL); https://mcgrathblog.nd.edu/creating-catechetical-lessons-at-home. Not fetched.

### Tally

- Fetched and read: 0 of the roughly 18 targeted pages.
- Seen in search results only: about 20 distinct pages.
- None of the structural fields (meta description, H1, outline, answer-first, Bible version, nav, schema, ads, mobile) was observed for any page.

## Part 3. Top takeaways

1. The per-question, question-as-title pattern appears under-used: few results show the question in the title, and the biggest-name sources are whole-catechism pages or PDFs. [S]
2. Several results show weak or junk titles (host name, date, "Select Page"). A specific, keyworded title with "WSC Q{n}" is a cheap win. [S, uncertain]
3. Proof texts exist in multiple editions; state which one you use and print the verses with a named version. [S/G]
4. A short, modern plain-language explanation per question looks like the gap; existing explanation is old commentary in long PDFs. [S, absence in results]
5. For how-to queries, the field is numbered-list posts, and for "kids and the catechism" it is mostly Lutheran and Catholic. A Westminster-specific, age-banded, answer-first guide is open ground. [S]
6. Verify all of this once the hosts are allowed; the layout in Part 1 is a hypothesis until the pages are read.

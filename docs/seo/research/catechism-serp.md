# Catechism SERP research

Date: 2026-11-23. Method: 44 generic queries run through a web-search tool (standard mode), US-only.

## Read this first: limits of this data

- **No volumes.** No search-volume, difficulty or click data was available. Nothing here is a number of searches. Counts below are counts of results I saw, not demand.
- **Result order is the order the search tool returned, not a verified Google ranking.** Treat "top results" as a proxy for who is visible, not as exact positions. The tool also returns a short generated summary, which I used only as a hint.
- **Page contents were not inspected.** Every page fetch failed (the session network blocks these hosts: bpc.org, wsc.pcusa.org, cambridgepres.org.uk, biblehub.com, devout.org and a vercel app all returned DNS failure). Page types and quality notes are inferred from the result title, the URL pattern and the search tool's summary of the result. Verify any single page by hand before relying on it.
- No people's names are used in queries or in this file.

## Summary: the 8 most useful findings

1. **Per-question pages for the Westminster Shorter Catechism already exist, and a few domains own them.** Almost every "WSC question N" query returned the same families: `bpc.org/sc-qN` (church site), `biblehub.com/library/anonymous/the_westminster_shorter_catechism/question_N...`, `cambridgepres.org.uk/resources/app/type/westminster-shorter-catechism/resource/.../qN`, `thisday.pcahistory.org` (daily devotional posts), `sermonaudio.com` (sermon PDFs), and `ccel.org`. A new site will not win by simply publishing the question and answer.
2. **The incumbents are weak on titling and presentation.** Result titles for the church per-question pages are generic ("Westminster Shorter Catechism" for every `bpc.org/sc-q*` page) or just the domain name (cambridgepres, sermonaudio, codeclimate). Only biblehub uses the question text as the title. No result I saw is clearly built answer-first with proof texts, a plain-language meaning and a memorize tool on one page. (Inferred from titles, URLs and summaries.)
3. **Question 1 and other "meaning" queries are served by essays, not a question page.** "What is the chief end of man" returned a classic divinity text, magazine essays, a Substack post and tag pages on a link-aggregator, with no dedicated WSC Q1 page in the first 10. The "explained" variant returned Wikipedia, sermon audio, a slide deck and articles. A single answer-first Q1 page looks beatable.
4. **Some questions have intent collisions with Catholic catechisms.** "what is God catechism answer" returned Catholic, Baltimore-style and Episcopal pages and no WSC Q4. Short generic phrasings need the word "Westminster" or "Shorter" to match; a page should target both and disambiguate.
5. **Memorize and tool queries are the clearest gap.** "How to memorize the Westminster Shorter Catechism" returned background essays and a BibleMemory.com group page, and the tool itself said it found no dedicated step-by-step guide. Flashcard and app queries are answered by user-made Brainscape decks, product listings, an App Store listing (a paid iPad app), a few small indie web apps, and one denominational flashcard site (`wsc.pcusa.org`). No page offers a free per-question web memorizer tied to indexable question pages.
6. **PDF, "Scripture proofs", modern English and songs queries are dominated by PDFs, bookstores and product pages.** Printable queries return denominational PDFs (OPC, BPC, ARP, EPC) and ebook shops. The "with Scripture proofs" query returned six near-duplicate publisher store URLs plus library catalogs. "Modern English" returned mostly bookstores. Songs returned Bandcamp, music stores, a Substack and a forum. A free, well-designed, section-by-section printable and an on-page proof-text view are open.
7. **Larger Catechism question-level coverage is thin.** General queries return Wikipedia, Britannica, CCEL, biblehub and large PDFs. For a specific question (Q105) results were biblehub, creeds.net, sermon audio/PDFs and a Substack. There are far fewer dedicated per-question pages than for the Shorter Catechism, and one memory-app collection page (`web.remem.me`) shows up.
8. **Creeds and catechism-comparison queries are fragmented and opinion-led.** Creed text queries are owned by Wikipedia, Britannica and Catholic or university reference pages. Creed memorization queries return lesson plans and a Catholic newspaper column about why the 2011 wording is hard to memorize. "Best catechism to start with" returned blog posts, a bookstore explainer and a Catholic comparison; "New City Catechism vs Westminster Shorter" returned opinion essays and a critical review, with no neutral side-by-side page.

## Page-type key

`Q` per-question page | `REF` reference, wiki or full-text page | `PDF` PDF document | `APP` app-store or app listing | `PROD` book, music or product store page | `BLOG` article, essay, Substack or blog | `CH` church or denominational site page | `SERM` sermon or audio page | `DEVO` daily devotional or commentary series | `TOOL` web flashcard, quiz or memory tool | `FORUM` forum thread | `CAT` library catalog or ebook aggregator

Page types are my inference from title and URL (see limits above). "wiki" means Wikipedia and mirrors.

## Query table

Results are in the order returned. Short forms: bpc = bpc.org, cambridge = cambridgepres.org.uk, biblehub = biblehub.com, ligonier = learn.ligonier.org, pcahistory = thisday.pcahistory.org.

### A. Westminster Shorter Catechism, question level

| # | Query | Top results seen (domain, title as returned, type) |
|---|---|---|
| A1 | What is the chief end of man | ccel.org (divinity text chapter) REF/BLOG; christianitytoday.com "Is Man's Purpose an Enigma?" BLOG; kingdomheard.substack.com "Man's chief end" BLOG; tabletalkmagazine.com "what is a chief end" BLOG; ligonier.org "meaning justified ends" BLOG; desiringgod.org sermon BLOG/SERM; monergism.com "mans chief end" tag pages (4 paginated URLs) REF. No dedicated WSC Q1 page in view. |
| A2 | Westminster Shorter Catechism question 4 | biblehub "question 4 0 what is god" Q; Wikipedia WSC REF; tapatalk.com "WSC Question 4 - What is God?" FORUM; scribd.com OPC PDF PDF; mail.biblehub.com full catechism REF; ccel.org full text REF; ligonier "Westminster Shorter Catechism" REF; seriousd6.github.io library REF; monergism.com audio series pages SERM; cambridge "q4" Q. |
| A3 | what is God catechism answer | usccb.org Catechism of Catholic Church REF; vatican.va (x3) REF; catholicculture.org REF; nd.edu Catholic summary REF; bibleanalysis.org "Who is God in catechism?" BLOG; bcponline.org "An Outline of the Faith" (Episcopal) REF; theaquilareport.com archive "question 2 what is god" BLOG; sacred-texts.com Baltimore-style catechism REF. No WSC Q4 page; intent is Catholic-leaning. |
| A4 | What is sin ... question 14 | bpc "sc-q14" Q (title: "Westminster Shorter Catechism"); ccel.org creeds REF; pcahistory (two posts) DEVO; ligonier full-catechism page REF; sermonaudio PDFs (x2) SERM/PDF; ligonier sin guide BLOG; centernet.pcusa.org PDF PDF; sacred-texts REF; codeclimate.com GitHub source of a daily-devotion repo (raw .md) DEVO; wesley.nnu.edu historical text REF; cambridge "q14" Q. |
| A5 | What is effectual calling ... question 31 | bpc "sc-q31" Q; biblehub "What is Effectual Calling?" Q; sermonaudio PDFs SERM; codeclimate.com source DEVO; sermonindex.net historical commentary REF; pcahistory (3 posts) DEVO; bpc commentary pages (awq31, jwq31, jfq31) REF; everand.com podcast listing SERM; reformedforum.org podcasts SERM; monergism.com REF; cambridge "q31" Q. |
| A6 | WSC what is the first commandment question 45 | academia.edu "The First Commandment" BLOG; pcahistory Q45-46 DEVO; bpc "sc-q46" Q; ccel.org REF; pma.pcusa.org "first commandment" CH; ligonier REF; sermonaudio PDFs SERM; biblehub Q47 Q; cambridge "q4546" Q; bpc "sc-q47" Q. |
| A7 | Shorter Catechism question 1 glorify God and enjoy him forever meaning explained | Wikipedia REF; taylorfrancis.com book chapter CAT; ligonier "enjoying God" BLOG; funet.fi historical text REF; desiringgod.org (3 language URLs) BLOG; Google Slides deck (docs.google.com) REF; sermonaudio PDF SERM; sermons.logos.com (x2) SERM; opc.org PDF PDF; ccel.org REF; medium.com "What Is the Chief End of Man?" BLOG; scribd PDF PDF; biblestudytools.com BLOG; pocketcasts podcast SERM. |
| A8 | WSC Lord's Prayer question 100 hallowed be thy name | blueletterbible.org "Q. 100 ... preface of the Lord's Prayer" Q (also Heidelberg); worship.calvin.edu article BLOG; bpc "sc-q101" Q; ccel.org REF; pma.pcusa.org "hallowed name" CH; bpc "tvq101" REF; biblequestions.info post BLOG; pcahistory Q101 DEVO; bpc "sc-q100" Q; cambridge "q101" Q; sermonaudio PDFs SERM; shopify CDN sample PDF of an illustrated edition PROD/PDF; sites.google.com church page CH. Note: "hallowed be thy name" is Q101, not Q100; the Q&A numbers confuse searchers. |
| A9 | WSC what is baptism question 94 | music.amazon.ca podcast episode SERM; bpc "sc-q94" Q; biblehub "What is Baptism?" Q; codeclimate.com source DEVO; pcahistory (2 posts) DEVO; everand.com podcast listings (2) SERM; sermonindex.net REF; sermonaudio PDFs/web SERM; bpc commentary REF; cambridge "q94" Q; podcast.app, player.fm podcast listings SERM. |
| A10 | WSC Lord's Supper question 96 | bpc "sc-q96" Q; biblehub "question 96" Q; pcahistory School & Family Catechist DEVO; codeclimate.com DEVO; sermonaudio PDFs SERM; biblehub Q97 Q; everand podcasts SERM; cambridge "q96" Q; sermonindex.net REF; genevaninstitute.org tag page BLOG; podcast.app SERM. |
| A11 | WSC what is justification question 33 | biblehub "question 33 0 0 what is justification" Q; bpc "sc-q33" Q; ligonier "Faith alone" BLOG; pcahistory (5 posts) DEVO; codeclimate.com DEVO; sermonaudio PDFs SERM; cambridge "q33" Q; everand podcast SERM; heritagebooks.org blog BLOG; ligonier full catechism REF; cprf.co.uk PDF PDF. |
| A12 | Shorter Catechism fourth commandment sabbath question 58 | biblehub "question 58 ... what is required" Q; funet.fi historical text REF; pma.pcusa.org "fourth commandment" CH; sermonindex.net (x2) REF; bpc "sc-q58"/"sc-q57" Q; codeclimate.com DEVO; challies.com post BLOG; sermonaudio PDFs SERM; pcahistory Q57-58 DEVO; biblehub Q57 Q; christianobserver.org lesson CH/BLOG; garyware.me post BLOG; everand podcast SERM. |
| A13 | Shorter Catechism what is prayer question 98 | music.amazon.com podcast episode SERM; biblehub "question 98 ... what is prayer" Q; bpc "sc-q98" Q; pcahistory (5 posts) DEVO; everand podcast SERM; cambridge "q98" Q; sermonaudio PDFs SERM; sermons.logos.com SERM; devout.org "catechism/westminster-shorter/98" Q (a per-question reference site); player.fm podcast SERM. |
| A14 | WSC sum of the ten commandments question 42 | bpc "sc-q42" Q; biblehub "question 42 what is the" Q; sermonindex.net REF; sermonaudio PDF SERM; bpc commentary pages REF; pma.pcusa.org "about ten commandments" CH; centernet.pcusa.org PDF PDF; codeclimate.com DEVO; ligonier REF; archive.org book PDF PDF; cambridge "q42" Q; reformedforum.org SERM; monergism.com kids PDF PDF; studylight.org catechism text REF. |
| A15 | what is repentance unto life WSC question 87 | bpc "sc-q87" Q; biblehub "What is Repentance unto Life?" Q; pcahistory (3 posts) DEVO; sermonaudio PDF SERM; cambridge "q87" Q; thegospelcoalition.org "what is true repentance" BLOG; sermonindex.net REF; everand and podcast.app podcasts SERM; ligonier BLOG/devotional. |
| A16 | what are the decrees of God Shorter Catechism question 7 explained simply | bpc "sc-q7" Q; christianitytoday.com "7: The Decrees of God" BLOG; sermonaudio PDFs SERM; biblehub "question 7 0 what are the" Q; pcahistory (3 posts) DEVO; funet.fi REF; codeclimate.com DEVO; reformedperspectives.org BLOG; cambridge "q7" Q; genevaninstitute.org BLOG. |

### B. Memorization, tools and formats

| # | Query | Top results seen |
|---|---|---|
| B1 | Westminster Shorter Catechism memorization | banneroftruth.org "what exactly is the WSC and why memorise it" (UK, US and staging URL variants) BLOG; biblememory.com group page TOOL; Wikipedia REF; britannica.com REF; thegospelcoalition.org "rote learning catechism", "should know catechisms" BLOG; ligonier "what is a catechism", "3 reasons to catechize your kids" BLOG; monergism.com REF; theaquilareport.com archive BLOG; sharperiron.org FORUM. |
| B2 | how to memorize the Westminster Shorter Catechism | biblememory.com group pages (2) TOOL; banneroftruth.org article BLOG; Wikipedia REF; ligonier "how did the shorter catechism..." BLOG; wsc.pcusa.org TOOL (flashcards / spaced repetition per the tool summary); matt2819.com "how to use the WSC" BLOG; treasurecoastpca.org blog CH; challies.com sponsored post BLOG; monergism.com kids PDF PDF; issuu.com article (about a different catechism) BLOG. The tool noted no dedicated step-by-step guide for this catechism appeared. |
| B3 | Shorter Catechism flashcards | wsc.pcusa.org TOOL; brainscape.com user decks (x2) TOOL; reformers.com.au product PROD; wtsbooks.com memory cards (x2) PROD; thewestminsterstandard.org/kids TOOL; Wikipedia REF; resources.lcms.org (Lutheran) CH; kids.britannica.com REF; wsc-ebenezer-2026.vercel.app "WSC Memorizer" APP/TOOL; rainbowresource.com PROD. |
| B4 | Shorter Catechism for kids | Wikipedia REF; reformed.org directory REF; wavellpc.org.au/catechism (several URLs, church site) CH; thegospelcoalition.org "simple catechism game" BLOG; monergism.com ebook listing pages (3 paginated) CAT; worship.com listing PROD; lulu.com "The Children's Shorter Catechism" PROD; catechisma.pages.dev "westminster-shorter-catechism-for-kids" REF (small static site); rainbowresource.com PROD; thewestminsterstandard.org/kids TOOL; squarespace blog on children's catechism versions BLOG; christianitytoday.com BLOG; ligonier BLOG. |
| B5 | Shorter Catechism with Scripture proofs | archive.org book PDF PDF; books.apple.com ebook APP/PROD; banneroftruth.org (six near-duplicate store URLs) PROD; deriv.nls.uk PDF PDF; store.ligonier.org PROD; catalog.folger.edu CAT; goodreads.com (editions pages) CAT; wellcomecollection.org CAT. No free web page showing proofs per question in view. |
| B6 | Shorter Catechism songs | shortercatechism.bandcamp.com PROD; exodusbooks.com (2) PROD; wscputtosong.substack.com BLOG/SERM; last.fm PROD; store.veritaspress.com (2) PROD; allmusic.com PROD; heritagebooks.org PROD; wscputtosong.substack.com Q100 post BLOG; christianitytoday.com BLOG; songtexte.com lyrics PROD; puritanboard.com FORUM; thegospelcoalition.org lead sheets (New City Catechism) BLOG; reformation21.org BLOG; dougwils.com BLOG; eden.co.uk PROD. |
| B7 | Shorter Catechism app | apps.apple.com "Catechism for Life" (two URLs) APP; olivetree.com store (two URLs) PROD; wsc-ebenezer-2026.vercel.app APP/TOOL; gcp.org "Shorter Catechism To Go" PROD; logos.com product PROD; makariosdevelopment.vercel.app (Android app site) APP; perlego.com CAT; biblia.com REF; catechism.cph.org (Lutheran) CH; Wikipedia REF; thegoodbook.co.uk BLOG. |
| B8 | Shorter Catechism PDF printable | proquest.com page PDF; perlego.com (2) CAT; cdn.subsplash.com PDF; opc.org/documents/SCLayout.pdf PDF; deriv.nls.uk (2) PDF; scribd.com (2) PDF; monergism.com ebook CAT; epc.org PDF PDF; gcp.org interactive PDF PROD; store.thegospelcoalition.org modern English PDF PROD/PDF; bpc.org PDF PDF; arpchurch.org PDF PDF. |
| B9 | Shorter Catechism modern English | store.thegospelcoalition.org PDF; Wikipedia REF; scribd.com PDF; eden.co.uk (3) PROD; powells.com PROD; booksrun.com PROD; ccel.org REF; store.ligonier.org PROD; epc.org PDF PDF; 10ofthose.com (2) PROD; wtsbooks.com PROD; exodusbooks.com PROD; abebooks.fr PROD. Modern-English texts are mostly in-copyright, sold by publishers. |
| B10 | WSC full text all 107 questions | Wikipedia (several) REF; seriousd6.github.io library REF; cdn.subsplash.com PDF; biblehub index REF; bpc.org PDF PDF; ccel.org REF; catechisma.pages.dev REF; deriv.nls.uk PDF PDF; mdwiki.org REF; monergism.com audio SERM; brainscape.com TOOL; revfrankhughesjr.org PDF PDF; archive.org PDF PDF. |
| B11 | WSC audio recording | Audible listings (many regional) PROD; reformedforum.org REF/SERM; ccel.org mp3 index SERM; everand.com audiobooks PROD; podcasts.apple.com (2) SERM; apps.apple.com "Catechism for Life" APP; ligonier podcast SERM; monergism.com audio series SERM; a squarespace store PROD. |
| B12 | WSC Bible memory plan one question per week | biblememory.com group pages (3) TOOL; Wikipedia REF; codeclimate.com "westminster-daily" about page DEVO; podcasts.apple.com "Westminster Daily" SERM; faithlafayette.org New City Catechism excerpt PDF PDF; ssrpc.s3 church-school PDF CH/PDF; revesbypc.org.au CH; theaquilareport.com BLOG; wsc.pcusa.org TOOL. The tool noted no single canonical weekly plan. |
| B13 | WSC quiz online | matt2819.com quiz pages for many question ranges (1-3, 1-20, 21-28, 43-48, 88-90, 100-107, 1-107, and others) TOOL. This is the only independent quiz site seen, and its footer says no reproduction without permission (per the tool summary). |

### C. Westminster Larger Catechism

| # | Query | Top results seen |
|---|---|---|
| C1 | Westminster Larger Catechism | Wikipedia (several URL variants) REF; britannica.com REF; wikiwand.com REF; ccel.org (x2) REF; biblehub index REF; archive.org PDF PDF; seriousd6.github.io REF; arpchurch.org PDF PDF; heritagebooks.org PDF PDF; monergism.com ebook CAT; bpc.org PDF PDF; epconnect.org PDF PDF; sermonindex.net CAT; everand.com CAT; mixcloud.com page (odd result) SERM. |
| C2 | WLC question 1 man's chief and highest end | ccel.org REF; Wikipedia REF; ligonier REF; biblehub index REF; opc.org LCLayout.pdf PDF; deriv.nls.uk PDF PDF; sacred-texts.com REF; sermonaudio SERM; presbyterian.ca PDF PDF; benjaminglaser.substack.com BLOG; sermonindex.net CAT. |
| C3 | WLC question 105 sins forbidden first commandment | monergism.com book PDF PDF; biblehub index REF; mail.biblehub.com "What are the Sins Forbidden in the First Commandment?" Q; sermonindex.net REF/CAT; creeds.net larger2.html REF; ccel.org REF; sermonaudio PDFs/sermons SERM; presbyterian.ca PDF PDF; garyware.me post BLOG; opc.org LC handout PDF PDF; benjaminglaser.substack.com BLOG; web.remem.me collection TOOL. |
| C4 | Larger Catechism vs Shorter Catechism difference | Wikipedia REF; britannica.com REF; puritanboard.com thread (x2) FORUM; wikiwand REF; opc.org New Horizons "Is the Larger Catechism Worthwhile?" BLOG; frame-poythress.org BLOG; ccel.org REF (x3); books.apple.com PROD. |

### D. Creeds

| # | Query | Top results seen |
|---|---|---|
| D1 | how to memorize the Apostles' Creed | my-lifebridge.super.site lesson page BLOG; sermons.logos.com workshop SERM; irp.cdn-website.com school PDF PDF; woh.org (3 URLs) BLOG; traditionlostandfound.substack.com BLOG; Wikipedia REF; jstor.org table of contents CAT; unm.edu page REF; finds.life.church "Apostles' Creed Explained: A Line-By-Line Guide" BLOG; brians.wsu.edu REF; ligonier "Praying the Apostles' Creed" BLOG; christianity.com wiki BLOG; churchatthecross.squarespace.com CH. |
| D2 | Apostles' Creed text | Wikipedia (several) REF; britannica.com (2) REF; ucsd.edu (2) REF; marquette.edu REF; simple.wikipedia REF; usccb.org REF; wikiwand REF; uc.edu doc PDF/REF; newworldencyclopedia.org REF; handwiki.org REF; Catholic Encyclopedia (Wikisource) REF; fandom wiki REF; seriousd6.github.io REF; englishtexts.org REF; theopedia.com REF; logos.com history BLOG; vaticannews.va REF; ccel.org REF; vatican.va REF. |
| D3 | Nicene Creed text | Wikipedia (several; including English versions page) REF; britannica.com REF; ucsd.edu (2) REF; uc.edu doc and PDF REF/PDF; uidaho.edu REF; ekd.de REF; sacred-texts.com REF; Wikisource REF; newworldencyclopedia.org REF; bkv.unifr.ch REF; englishtexts.org REF; logos.com BLOG; ewtn.com REF; seriousd6.github.io REF; ebsco.com research starter REF; vatican.va REF; jimrutt.substack.com BLOG. |
| D4 | memorize the Nicene Creed | archbalt.org "why can't I memorize the Nicene Creed" (print URL) BLOG; catholicreview.org (2 URLs) BLOG; classicaldifference.com (2 URLs) BLOG/CH; thereligionteacher.com lesson plans BLOG; marquette.edu REF; Wikipedia REF; ligonier REF/BLOG; odu.edu REF; humilityanddoxology.com memory-work PDF PDF; usccb.org REF; logos.com BLOG; biblegateway.com blog BLOG; richardcaugustinejr.substack.com BLOG; journals.sagepub.com article CAT. |
| D5 | Apostles' Creed meaning line by line explained for kids | finds.life.church guide BLOG; enduringword.com (3 URLs) BLOG; hozana.org BLOG; idisciple.org BLOG; bibleverserandomizer.com/creed/apostles TOOL/BLOG; everand.com CAT; catholictreasury.info REF; christianity.com BLOG; catholicmom.com lesson plan BLOG; Wikipedia simple REF; ligonier podcast SERM; crosswalk.com BLOG; sermons.logos.com SERM; oursundayvisitor.com BLOG. |

### E. Catechism comparison and starting points

| # | Query | Top results seen |
|---|---|---|
| E1 | New City Catechism questions and answers | blogs.thegospelcoalition.org and thegospelcoalition.org (several URLs) REF/BLOG; scribd.com doc PDF; crossway.org (2 URLs) BLOG/PROD; blog.truthforlife.org BLOG; media.thegospelcoalition.org devotional PDF PDF; bible.com YouVersion reading plan (2 URLs) TOOL; christianbook.com (2) PROD; newcitycatechism.com (official site; also an app per summary) TOOL/REF; exodusbooks.com sample PDF PDF; blogs.efca.org BLOG; truthforlife.org store PROD. |
| E2 | Heidelberg Catechism Q&A 1 | ligonier (3 URLs) BLOG; docs.google.com slide deck REF; rca.org (denominational) CH/REF; thegospelcoalition.org pastor blog post BLOG; blueletterbible.org Q1 Q; goodreads.com author-blog mirror BLOG; hymnary.org BLOG; firstthings.com BLOG; zoho wiki REF; biblehub REF; thebanner.org BLOG. |
| E3 | catechism for children | walmart.com listing PROD; usccb.org children (2) CH; monergism.com ebook listing CAT; christianitytoday.com (2) BLOG; gutenberg.org ebooks REF; mitpressbookstore.mit.edu PROD; crosswalk.com BLOG; thegospelcoalition.org review BLOG; scribd.com YouCat Kids PDF; garrattpublishing.com.au sample PDF PDF; GBS.edu PDF PDF; ligonier BLOG; angeluspress.org PROD; ministry-to-children.com BLOG; ncregister.com BLOG; churchleaders.com BLOG; opusdei.org PDF/BLOG; holyjoys.org BLOG; theaquilareport.com BLOG; reformed.org REF. Mixed Catholic and Protestant intent. |
| E4 | best catechism to start with | en.wikipedia.com Ilmihal REF (odd match); wtsbooks.com "What Is a Catechism? A Simple Guide for Beginners" BLOG; goodreads.com CAT; corechristianity.com "why you should use a catechism" BLOG; squarespace blog "Absolute Beginner's Guide to teaching the Children's Catechism" BLOG; ebsco.com REF; christoverall.com BLOG; challies.com BLOG; stgb.substack.com BLOG; catholictreasury.info "comparing catechisms" REF; ligonier BLOG; crossway.org BLOG; baylor.edu PDF PDF; thegospelcoalition.org BLOG; theaquilareport.com BLOG. |
| E5 | New City Catechism vs Westminster Shorter Catechism | thegospelcoalition.org (several) BLOG; modernreformation.org "new catechisms" BLOG; desiringgod.org BLOG; heidelblog.net (2, including a critical review) BLOG; Wikipedia REF; truthforlife.org PROD; britannica.com REF; opc.org New Horizons "Heidelberg and Westminster: Two Reformed Catechisms" BLOG; ligonier BLOG. |
| E6 | Heidelberg Catechism memorization | network.crcna.org "memorizing catechism" (2) CH; scholar.ufs.ac.za / journals.ufs.ac.za academic articles CAT; docs.google.com PDF PDF; ligonier BLOG; phoenixurc.squarespace.com resource list CH; biblememory.com group TOOL; substack BLOG; Wikipedia REF; gotquestions.org BLOG; prca.org memory-work book CH/PROD; canrc.org CH; ccel.org REF. |

## Analysis

### Which domains dominate

- **Per-question WSC (our core cluster):** `bpc.org`, `biblehub.com`, `cambridgepres.org.uk` (church resource pages), `thisday.pcahistory.org` (daily devotional posts, sometimes two or three per question), `sermonaudio.com` (sermon PDFs, many results each), `ccel.org`, and `codeclimate.com` (a raw source mirror of a devotion project's markdown files, which means plain source files can rank at all). Podcast listing pages (`everand.com`, `podcast.app`, `player.fm`, Amazon and Apple podcasts) fill the lower slots. `devout.org` also appears with a per-question URL pattern, though it appeared for only one query.
- **Essays on meaning:** `ligonier.org`, `desiringgod.org`, `thegospelcoalition.org`, `monergism.com`, `christianitytoday.com`, plus Substacks.
- **Reference text:** Wikipedia (in many mirrored URL forms), Britannica, `ccel.org`, `sacred-texts.com`, `seriousd6.github.io` and `mdwiki.org`.
- **Commerce:** `banneroftruth.org`, `store.ligonier.org`, `wtsbooks.com`, `exodusbooks.com`, `eden.co.uk`, `store.veritaspress.com`, `heritagebooks.org`, Audible, Everand, Perlego.
- **Denominational PDFs:** `opc.org`, `bpc.org`, `epc.org`, `arpchurch.org`, `presbyterian.ca`, `centernet.pcusa.org`.
- **Small and new sites do show up:** `matt2819.com` (quizzes), `catechisma.pages.dev`, `seriousd6.github.io`, `wscputtosong.substack.com`, two vercel-hosted apps, `web.remem.me`. This suggests the space is not locked by high-authority sites outside the per-question block.

### Which query groups are served by apps, PDFs or thin pages

- **Served mostly by app or product listings:** app (B7), flashcards (B3, partly user-generated Brainscape decks), songs (B6), Scripture proofs (B5), modern English (B9), audio (B11).
- **Served mostly by PDFs:** printable (B8), full text (B10), Larger Catechism general (C1, C2), Nicene memory-work sample.
- **Served by thin or low-structure pages (inferred):** per-question church pages whose titles are identical or just the domain name; podcast listing pages for single questions; raw source files; paginated tag pages (`monergism.com/mans-chief-end?page=N`).

### Groups with no good dedicated page seen

1. How to memorize the Shorter Catechism, as a practical method (B2).
2. A free web-based per-question memorizer tied to indexable question pages (B3, B7, B12).
3. A weekly or graded memory plan for the 107 (B12).
4. Section-by-section printable with proof texts, designed for use (B8, B5).
5. Plain-language meaning per question for kids and new readers, with the answer shown first (B4, A1 "explained").
6. Larger Catechism per-question pages with a link to the matching Shorter question (C3).
7. Version-aware creed pages: text plus memorize tool plus the wording differences between traditions (D1 to D4).
8. A neutral comparison and chooser: Shorter vs Larger vs Heidelberg vs New City vs children's versions (E4, E5).

### Where a clearly better page could win

| Opportunity | Why it looks beatable (evidence in this research) | What the better page would have |
|---|---|---|
| WSC per-question page, all 107 (A2 to A16) | Incumbents have generic or domain-only titles; content is spread across commentary, sermon and podcast listings; only biblehub titles by question text | Title in the form of the question text plus "Westminster Shorter Catechism Q N"; the answer in the first screen; proof texts shown inline; two-to-four sentence plain-language meaning; Q-to-Q navigation; the matching Larger Catechism question; "memorize this" control |
| Q1, "meaning" queries (A1, A7) | No dedicated Q1 page in view for A1; A7 returns a Wikipedia page, essays and sermon audio | One answer-first Q1 page with a short meaning section and links to deeper reading |
| Memorize guide (B1, B2) | Results are background essays; the tool itself reported no dedicated how-to | A step-by-step method (chunking by section, spaced review, recite-then-reveal), pace options, tied to the question pages |
| Flashcards, quiz and app intent (B3, B7, B13) | Mix of user-made decks, paid listings, a few indie apps and one quiz site with a no-reproduction footer | A free in-browser flashcard and recite-check tool, crawlable via the per-question pages |
| Printable and proofs (B5, B8) | PDFs from denominations, ebook shops, six near-duplicate store URLs | Section printable sheets (God, Fall, Redemption, Commandments, Sacraments, Prayer) with proof texts, as HTML plus PDF |
| Kids (B4) | Fragmented: a directory, one church's multi-page set, product listings, a small static site | A child-friendly layer on each question and a children's route for the 107 |
| Weekly plan (B12) | No canonical plan; church PDFs and group pages only | A pace-based plan (for example, one question a week or a section a month) with a downloadable schedule |
| Creeds memorize (D1, D4, D5) | Lesson plans, a Catholic columnist on why the wording is hard, group blogs; text queries are owned by Wikipedia-level sites | Memorize pages with line-by-line chunks, a recite-check tool and wording variants by tradition. Do not expect to win the raw "text" queries (D2, D3) against Wikipedia and universities; treat them as supporting pages |
| Comparison and chooser (E4, E5) | Opinion pieces and a critical review; no neutral table | A side-by-side comparison (length, audience, structure, origin, who uses it) and a "which one first" guide |
| Larger Catechism (C3) | Per-question coverage thin, long PDFs dominate | Per-question pages that mirror the Shorter template, built after the Shorter set |

### Risks and caveats for planning

- **Intent collisions:** short generic phrasings ("what is God catechism answer", "catechism for children", "best catechism to start with") return Catholic and mixed results. Target "Westminster" or "Shorter" phrasings first.
- **Question numbering confusion:** searchers combine the wrong number with a phrase (A8: "hallowed be thy name" is Q101). The page for Q101 should name the petition in its heading.
- **Brand-heavy results:** Q1 and a few core questions are also covered by well-known ministry sites with high visibility (A1, A7). Win by structure and utility, not by being the only page.
- **Copyright:** the 1647 text and its proof texts are old, but modern-English editions (several publishers named in B9) are in copyright, and the one independent quiz site asks that nothing be reproduced. Plan for our own plain-language wording and a licensed or public-domain Scripture translation. This is a flag, not legal advice.
- **Data gap:** because no volume data exists here, prioritize by how weak the incumbents look and by product fit, then check demand in a search-console or keyword tool before committing large page counts.

## Suggested next checks (not done here)

- Open the top three results for A1, A2, A5, A11 and B2 in a browser to confirm page structure, title tags, schema, load speed and whether answers appear above the fold.
- Compare against real Google results in a normal browser, since this tool's order is only a proxy.
- Pull demand data from a keyword tool and group by section (Q1 to 12, 13 to 19, 20 to 38, 39 to 84, 85 to 97, 98 to 107).

## Sources

All URLs below appeared in search results; only the search-tool summaries were available (page fetches failed). Grouped by use.

Per-question WSC pages and families
- https://bpc.org/sc-q14 , https://bpc.org/sc-q31 , https://bpc.org/sc-q33 , https://bpc.org/sc-q42 , https://bpc.org/sc-q46 , https://bpc.org/sc-q47 , https://bpc.org/sc-q58 , https://bpc.org/sc-q87 , https://bpc.org/sc-q94 , https://bpc.org/sc-q96 , https://bpc.org/sc-q98 , https://bpc.org/sc-q100 , https://bpc.org/sc-q101 , https://bpc.org/sc-q7
- https://biblehub.com/library/anonymous/the_westminster_shorter_catechism/question_4_0_what_is_god.htm
- https://biblehub.com/library/anonymous/the_westminster_shorter_catechism/question_31_0_0_what_is_effectual.htm
- https://biblehub.com/library/anonymous/the_westminster_shorter_catechism/question_33_0_0_what_is_justification.htm
- https://biblehub.com/library/anonymous/the_westminster_shorter_catechism/question_87_0_0_what_is_repentance.htm
- https://biblehub.com/library/anonymous/the_westminster_shorter_catechism/question_98_0_0_what_is_prayer.htm
- https://mail.biblehub.com/library/anonymous/the_westminster_shorter_catechism/question_94_0_0_what_is_baptism.htm
- https://www.cambridgepres.org.uk/resources/app/type/westminster-shorter-catechism/resource/392/title/q14
- https://www.cambridgepres.org.uk/resources/app/type/westminster-shorter-catechism/resource/375/title/q31
- https://www.devout.org/catechism/westminster-shorter/98
- https://thisday.pcahistory.org/?p=22535 , https://thisday.pcahistory.org/?p=23242 , https://thisday.pcahistory.org/2019/09/september-22-6/
- https://codeclimate.com/github/olneyhymn/westminster-daily/content/02/21.md/source
- https://www.tapatalk.com/groups/rti/wsc-question-4-what-is-god-t1877.html
- https://blueletterbible.org/study/ccc/mh_sc10.cfm (BlueLetterBible, WSC Q100 page)

Full text, reference and PDFs
- https://ccel.org/creeds/westminster-shorter-cat.html , https://www.ccel.org/ccel/schaff/creeds3.iv.xviii.html , https://en.wikipedia.org/wiki/Westminster_Shorter_Catechism , https://learn.ligonier.org/articles/westminster-shorter-catechism , https://seriousd6.github.io/library/westminster-shorter-catechism/ , https://catechisma.pages.dev/westminster-shorter-catechism , https://mdwiki.org/wiki/Shorter_Catechism
- https://www.opc.org/documents/SCLayout.pdf , https://bpc.org/s/d-scatechism.pdf , https://arpchurch.org/wp-content/uploads/2023/01/Shorter-Catechism-Jan-2023.pdf , https://epc.org/wp-content/uploads/Shorter-Catechism.pdf , https://centernet.pcusa.org/wp-content/uploads/wsc-english1.pdf , https://store.thegospelcoalition.org/assets/product_downloads/948/pBKbGHKTU2fh2jnAMhzK8s6BXYfl9JxPWIeznJXN.pdf , https://revfrankhughesjr.org/images/The_Westminster_Shorter_Catechism.pdf , https://monergism.com/thethreshold/sdg/tosti/wsckiids.pdf

Memorization, tools, kids, apps, songs, audio, quiz
- https://wsc.pcusa.org/ , https://matt2819.com/wsc/how-to-use-the-wsc , https://matt2819.com/wsc/westminster-shorter-catechism-quizzes/ , https://matt2819.com/wsc/westminster-shorter-catechism-quiz-questions-1-to-107
- https://biblememory.com/group/view/7ac55bb07e , https://biblememory.com/group/view/34b48fadc8
- https://banneroftruth.org/uk/resources/articles/2004/what-exactly-is-the-westminster-shorter-catechism-and-why-memorise-it/ , https://www.thegospelcoalition.org/article/rote-learning-catechism/ , https://learn.ligonier.org/articles/what-is-a-catechism , https://treasurecoastpca.org/blog/post/keeping-the-word-with-you
- https://brainscape.com/flashcards/shorter-catechism-6281804/packs/9802173 , https://reformers.com.au/products/9781950611072-shorter-catechism-deck-the-westminster-assembly , https://wtsbooks.com/collections/w3-catechizing/products/shorter-catechism-memory-cards-gcp-gcp020150 , https://thewestminsterstandard.org/kids/ , https://wsc-ebenezer-2026.vercel.app
- https://wavellpc.org.au/catechism , https://reformed.org/?p=1667 , https://www.lulu.com/shop/c-matthew-mcmahon/the-childrens-shorter-catechism/paperback/product-21718128.html , https://catechisma.pages.dev/westminster-shorter-catechism-for-kids , https://www.rainbowresource.com/westminster-shorter-catechism-for-kids-workbooks
- https://books.apple.com/us/book/id985862959 , https://banneroftruth.org/uk/store/doctrine/shorter-catechism/ , https://store.ligonier.org/shorter-catechism-with-scripture-proofs-paperback , https://catalog.folger.edu/record/895993
- https://shortercatechism.bandcamp.com , https://wscputtosong.substack.com , https://store.veritaspress.com/shorter-catechism-kit.html , https://www.exodusbooks.com/westminster-shorter-catechism-songs-cds/7320/ , https://heritagebooks.org/products/the-westminster-shorter-catechism-songs-volume-3-questions-57-85-dutton.html
- https://apps.apple.com/us/app/catechism-for-life/id6739330892 , https://www.olivetree.com/store/product/54358 , https://gcp.org/products/shorter-catechism-to-go , https://makariosdevelopment.vercel.app/
- https://www.eden.co.uk/christian-books/understanding-the-faith/general-theological-issues/the-westminster-shorter-catechism-in-modern-english , https://store.ligonier.org/the-westminster-shorter-catechism-in-modern-english-paperback
- https://reformedforum.org/program/westminster-standards/wsc/ , https://www.ccel.org/ccel/anonymous/westminster1/mp3 , https://www.audible.com/pd/Shorter-Westminster-Catechism-Audiobook/B08176R3N2 , https://learn.ligonier.org/podcasts/westminster-shorter-catechism
- https://podcasts.apple.com/us/podcast/westminster-daily/id1661869655 , https://ssrpc.s3.us-east-2.amazonaws.com/public/website/resources/Westminster-Shorter-Catechism_Spring-_Year-1.pdf

Larger Catechism
- https://en.wikipedia.org/wiki/Westminster_Larger_Catechism , https://www.britannica.com/topic/Larger-Westminister-Catechism , https://ccel.org/creeds/westminster-larger-cat.html , https://biblehub.com/library/anonymous/the_westminster_larger_catechism , https://www.opc.org/documents/LCLayout.pdf , https://bpc.org/s/lcatechism.pdf , https://arpchurch.org/wp-content/uploads/2025/03/Larger-Catechism-Sept-2023.pdf
- https://mail.biblehub.com/library/anonymous/the_westminster_larger_catechism/question_105_0_0_what_are_the.htm , https://www.creeds.net/reformed/Westminster/larger2.html , https://web.remem.me/collections/78112586757101
- https://puritanboard.com/threads/wlc-wsc-differences.63657/ , https://opc.org/new_horizons/NH00/0010b.html , https://frame-poythress.org/westminster-catechisms/

Creeds
- https://finds.life.church/apostles-creed-explained/ , https://www.woh.org/2016/05/16/the-apostles-creed-belief-summary/ , https://learn.ligonier.org/articles/praying-the-apostles-creed , https://my-lifebridge.super.site/the-apostles-creed-1 , https://enduringword.com/blog-archive/creed/apostles-creed/ , https://bibleverserandomizer.com/creed/apostles , https://www.catholicmom.com/articles/2010/06/05/apostles-creed-lesson-plan-by-kristi-mccabe
- https://en.wikipedia.org/wiki/Apostles%27_Creed , https://britannica.com/topic/Apostles-Creed , https://www.usccb.org/prayers/apostles-creed , https://www.marquette.edu/faith/prayers-apostles.php , https://pages.ucsd.edu/~dkjordan/xy/xydocs/Credo-Apostles.html
- https://en.wikipedia.org/wiki/Nicene_Creed , https://www.britannica.com/topic/Nicene-Creed , https://en.wikipedia.org/wiki/English_versions_of_the_Nicene_Creed , https://www.ekd.de/en/The-Nicene-Creed-123.htm , https://sacred-texts.com/chr/nicene.htm
- https://www.archbalt.org/why-cant-i-memorize-the-nicene-creed/?print=pdf , https://catholicreview.org/why-cant-i-memorize-the-nicene-creed/ , https://classicaldifference.com/nicenecreed/ , https://thereligionteacher.com/nicene-creed-lesson-plan-activities , https://humilityanddoxology.com/wp-content/uploads/2019/11/Nicene-Creed-for-Year-of-Memory-Work.-Creed-Memory-Work-Sample.docx.pdf

Comparison and other catechisms
- https://newcitycatechism.com/ , https://www.thegospelcoalition.org/new-city-catechism/ , https://www.crossway.org/blog/2017/04/introducing-the-new-city-catechism/ , https://www.bible.com/reading-plans/4301-new-city-catechism-questions-answers-hearts-minds/day/1
- https://heidelblog.net/2016/01/trans-confessional-catechism-a-review-of-the-new-city-catechism/ , https://www.modernreformation.org/resources/essays/new-catechisms , https://www.desiringgod.org/articles/the-new-city-catechism-a-remarkable-coming-together , https://opc.org/new_horizons/NH05/HeidelbergWestminster.html
- https://www.rca.org/about/theology/creeds-and-confessions/the-heidelberg-catechism/ , https://www.blueletterbible.org/study/ccc/heidelberg/preface.cfm , https://learn.ligonier.org/articles/what-your-only-comfort , https://network.crcna.org/youth-ministry/memorizing-catechism , https://phoenixurc.squarespace.com/pastors-study/2020/10/21/resources-for-learning-the-heidelberg-catechism , https://www.prca.org/resources/catechism-material/item/893
- https://www.wtsbooks.com/blogs/resources/what-is-catechism , https://corechristianity.com/resources/articles/why-you-should-use-a-catechism , https://www.catholictreasury.info/teachings/comparing-catechisms , https://www.usccb.org/beliefs-and-teachings/who-we-teach/children , https://www.christianitytoday.com/2025/05/kids-ministry-toddler-theology-childrens-christian-catechism-books
- Intent-collision results for "what is God catechism answer": https://www.usccb.org/catechism/pt2sect2chpt1 , https://www.bcponline.org/Misc/catechism.htm , https://www.bibleanalysis.org/who-is-god-in-catechism
- Q1 results: https://tabletalkmagazine.com/article/2025/09/what-is-a-chief-end/ , https://www.desiringgod.org/messages/the-glory-of-god-for-doubting-minds-and-dull-hearts , https://www.monergism.com/mans-chief-end?page=8 , https://ccel.org/ccel/watson/divinity.v.i.html

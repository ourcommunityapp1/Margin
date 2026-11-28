# Bible text licensing for public pages (NASB, YouVersion, public-domain options, Westminster proof texts)

Date: 2026-11-23. Not legal advice. Read-only research.

## Read this first: how reliable is the evidence?

The session's network blocked direct fetches of the official sites (lockman.org, developers.youversion.com, esv.org all failed with ENOTFOUND). Everything below comes from web-search result summaries that quote or paraphrase the official pages. I did NOT read any official page in full. Treat every quote as "reported by a search summary" and re-check it on the official URL before relying on it. The YouVersion Platform terms were not found at all.

## Recommendation (practical, low risk)

1. Public, indexable pages: show proof texts in a public-domain translation, with the WEB (World English Bible) as the first choice. Use KJV or ASV as alternates. WEB is dedicated to the public domain by its publisher, is modern English, and has no UK Crown-patent issue.
2. NASB on public pages: treat it as unconfirmed. Until YouVersion or Lockman confirms in writing, do not render NASB text on public pages. Show the reference (for example "Romans 3:23") plus a link into the signed-in app or to YouVersion. References are not the licensed text.
3. If the owner still wants NASB quotations on public pages, the Lockman page (as summarised) allows quotation without written permission up to 1,000 verses, but the sources disagree on extra limits (50% of the work, no whole book, or older 500 or 25% rules). Stay well below every figure: a handful of short verses per page, never a whole chapter or book, and a site-wide count that stays low. Add the full notice with a click-enabled link to Lockman.org.
4. Do not assume YouVersion-fetched text may be republished on public pages. API licences usually limit use to what the publisher allows, and caching and attribution rules are set per version. Get this in writing.
5. Scripture-memory pages: put full memorisation text behind sign-in, in the app, or use WEB or KJV publicly. Flashcard and memorisation tools are a distinct use case that I found no explicit NASB rule for, so ask Lockman.
6. Catechism text: use the 1647 wording (public domain). Use only proof-text lists you can show are public domain (see section 4). Do not copy the OPC (2001) or any modern publisher's proof-text compilation without permission.
7. Always show a notice. Put a per-page footer for the version shown, plus a site-wide "Bible versions and copyright" page.
8. Do not rely on a search engine's ability to see the text as a reason to include licensed text. Indexable copies are the highest-exposure use.

## Questions only the owner should ask (draft email below)

- May NASB text obtained through the YouVersion Platform be shown on public, indexable pages, or only inside the signed-in app?
- Do the Lockman verse limits apply per page, per site, or per work, and is a catechism with a proof text beside each answer "a work"?
- Do flashcard and Scripture-memory tools count under the same limits?
- Is the per-page cap different on websites than in print?
- Is caching or storing fetched text in our own database allowed?
- What is the required notice wording for web pages and apps, today?

### Draft email (to Lockman Foundation and to YouVersion Platform support, adapted)

Subject: Permission question: NASB on a public catechism and Scripture-memory website

Hello,

I run [site name], a website that pairs Westminster Catechism questions with Scripture proof texts and offers Scripture-memory practice. We currently show the NASB inside a signed-in app through the YouVersion Platform. We are considering showing short NASB quotations on public, search-indexable web pages as well.

1. Does your permission to quote allow this? We would show roughly [N] verses per page and [N] verses site-wide, never a whole chapter or book. Which limits apply (1,000 verses, a percentage of the work, other)?
2. Is a flashcard or memorisation feature treated differently from ordinary quotation?
3. May text fetched through the YouVersion Platform be displayed on public pages, or only inside the app? May we cache it?
4. What is the exact notice we must show on web pages and apps today?
5. If the answer is no, is there a licence or fee for this use?

Thank you. [Name, site URL, contact]

## 1. Lockman Foundation (NASB)

Official page (not fetched; cited via search results): https://www.lockman.org/?p=3 ("Permission to Quote Copyright & Trademark Information"). Possibly also https://www.lockman.org/permission-to-quote/ (this one failed to load; the URL is unverified).

What the search summary reported:

- Verse limit: "The text of the NASB may be quoted in any form (written, visual, electronic, or audio) up to and inclusive of one thousand (1,000) verses without express written permission of The Lockman Foundation, with the standard copyright line."
- Other digital media: "For other digital media, such as social media posts, blogs, or email the abbreviation (NASB) may simply be used along with the quotation provided it is a click-enabled web link to www.Lockman.org, when possible."
- Web and apps: "For web pages or apps the full copyright notice must be used with www.Lockman.org being a click-enabled web link."
- Notice placement: must appear "on the title page, copyright page, or wherever the quoted material appears" (paraphrase of the summary).
- Beyond the limits: "Quotations and/or reprints in excess of the above limitations, or other permission requests, must be submitted online or directed to and approved in writing by The Lockman Foundation."

Unresolved conflicts about extra conditions:

- Yale Divinity Library guide (https://guides.library.yale.edu/newtestament/nasb), a secondary source: fewer than 1,000 verses, "does not provide a full book of the NT", and quotation does not reach "more that 50% of target text". It also says noncommercial uses such as a bulletin "must include (NASB®) after every usage".
- Older Bible-printing notices cite 500 verses or a 25% cap ("a complete book of the Bible nor do the verses quoted account for more than 25% of the total work in which they are quoted"). These look like old notices (1995 era).
- I could not confirm the 50% or no-whole-book conditions on the Lockman page itself. Treat the stricter numbers as the safe cap until confirmed.

Notice wording (third-party copy, current 2020 edition): "New American Standard Bible®, Copyright © 1960, 1971, 1977, 1995, 2020 by The Lockman Foundation. All rights reserved. www.Lockman.org". The exact required line, including any "Scripture quotations taken from..." lead-in, must be copied from the official page. Sources of that notice: https://www.studylight.org/site-resources/copyright-statements/eng/nas.html and https://bibleresources.org/bible-copyright-notices/.

Apps, flashcards and memorisation tools: no explicit rule found in any summary. Unclear.

AI note: a separate publisher page for the Legacy Standard Bible (https://lsbible.org/permission-to-quote-the-lsb/) mentions AI systems. That is the LSB, not the NASB; it is not evidence about the NASB.

## 2. YouVersion Platform

Official terms were not found or fetched. Developer site: https://developers.youversion.com (host unreachable here). Search summaries only found:

- A third-party review (https://learnofchrist.com/resources/youversion-platform-services) saying apps must honour "version-specific licenses, attribution, permissions, rate limits, privacy, key security, accessibility, cache rules" and that "each Bible license and permission set determines allowable content use". This is secondary.
- A community library disclaimer asking developers to credit YouVersion as the source (courtesy, not an official rule).
- Comparable aggregator for context only: API.Bible requires copyright attribution beside copyrighted Scripture each time, allows caching refreshed at least every 30 days, and prohibits sub-licensing (https://api.bible/terms-and-conditions, https://api.bible/faq). These are not YouVersion's rules.

Conclusion: I found no official statement that NASB text from the YouVersion API may or may not appear on public pages. The likely reading, that each version's publisher permissions control, makes the answer depend on Lockman's terms and any YouVersion-Lockman agreement. This must be asked directly.

## 3. Public-domain and permissive options, and ESV for comparison

KJV
- Public domain in the US. In the UK the Crown holds a letters patent administered by Cambridge University Press (CUP); CUP, Oxford University Press and Collins have the exclusive right to print the KJV in the UK. Cambridge's copyright notices say permission is needed beyond "liturgical or non-commercial educational use up to a maximum of 500 verses" (https://assets.cambridge.org/97805211/63347/copyright/9780521163347_copyright_info.pdf).
- eBible.org says the royal decree "has no effect outside of the UK, where this work is firmly in the Public Domain" (https://ebible.org/kjv/copr.htm). The patent is generally about printing and publishing; whether it reaches a UK-accessible website is a point I could not confirm. If you have UK readers or a UK host, this is a small residual risk; WEB avoids it.
- No notice is legally required in the US. Suggested courtesy line: "Scripture quotations are from the King James Version (public domain in the United States; Crown patent applies in the UK)."

ASV (1901)
- Public domain (published 1901; WEB is based on it, per https://biblegateway.com/versions/World-English-Bible-WEB). No notice required. Suggested: "American Standard Version (1901), public domain."

WEB (World English Bible)
- eBible.org: "All of the text of the World English Bible is dedicated to the public domain." (https://ebible.org/engwebp/copyright.htm)
- Trademark: "World English Bible" is a trademark of eBible.org; "All we ask is that if you CHANGE the actual text of the World English Bible in any way, you not call the result the World English Bible any more." Do not edit the text (for example modernising or changing wording) and still label it WEB. Spelling-only changes (American vs British) are excepted per the Bible Gateway note.
- Suggested notice: "Scripture quotations are from the World English Bible (WEB), public domain."

Other commonly used public-domain options (not researched in depth): Young's Literal Translation, Darby, Douay-Rheims (Challoner), Geneva 1599. Verify each edition's front matter.

ESV (Crossway), for comparison. Official pages (not fetched): https://www.crossway.org/rights-and-permissions/esv/ , https://www.esv.org/api/ , https://www.esv.org/about/terms/
- Reported: quote up to "five hundred (500) verses" without a licence, provided the quoted text stays under half of any one book and is not used in a commentary or other reference work (summary of Crossway's guideline).
- ESV API on websites: no more than "500 verses or one-half of any book (whichever is less)" per page; non-commercial; the standard ESV notice and a link to esv.org on each page.
- Notice (summary): begins "Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway..." followed by the text edition year. Copy the exact current line from Crossway.
- Sources differ on 25% versus 50% tests; check the current page.

## 4. Westminster Shorter and Larger Catechisms

- The 1647 text is old and in the public domain. Examples: one online copy states it is public domain, and a Bodleian (Oxford Text Archive) record lists CC0 (https://ota.bodleian.ox.ac.uk/repository/xmlui/handle/20.500.12024/N00456?show=full). Larger Catechism full text is on Wikisource per its Wikipedia page.
- Proof texts are a later addition, not part of the 1647 text. History from search results: a 1792 Presbyterian committee first selected and arranged proof texts; an 1888 committee revised them and supplied Shorter Catechism proofs, approved in 1894. The 1888 edition carried "COPYRIGHT, 1888, BY THE TRUSTEES OF THE PRESBYTERIAN BOARD OF PUBLICATION AND SABBATH SCHOOL WORK" (https://archive.org/download/constitutionofpr1914pres/constitutionofpr1914pres_bw.pdf). General US rule (not verified for this specific edition): works published before 1931 are in the public domain in the US as of 2026. So the 1888/1894 proofs and earlier lists are likely safe, but verify each edition.
- OPC: the Shorter Catechism proofs were presented to the 67th General Assembly (2000) and approved with corrections in 2001 (https://www.opc.org/documents/Preface.pdf, https://opc.org/preface.html). The OPC edition is sold as a book; a 2005 OPC edition is credited "Used by permission". That is a modern committee product; assume it is copyrighted until the OPC says otherwise. Some free editions use the 1978 OPC committee proofs (https://reformedstandards.com/westminster/wsc-pca.html is an example).
- PCA: the 1990 PCA Book of Church Order edition (with "Scripture Proofs") is a separate lineage. I could not find the PCA's copyright or reuse terms. Some other edition pages note permission from the publisher (for example an EPC page cites Reformed Theological Seminary and Presbyterian and Reformed Publishing Company).
- Bare verse references (for example "Rom 3:23") are facts, but a curated, editorially arranged list of references can carry compilation copyright in some jurisdictions. Low risk, not zero.
- Safest approaches: (a) use a pre-1931 proof-text list you can cite, or (b) choose your own proof texts, or (c) ask the OPC Committee on Christian Education and the PCA publishing committee for written permission.

## Suggested notice patterns

- Per page, public-domain version: "Scripture: World English Bible (public domain)."
- Per page, NASB (only if cleared): "New American Standard Bible®, Copyright © 1960, 1971, 1977, 1995, 2020 by The Lockman Foundation. All rights reserved. www.Lockman.org" with Lockman.org as a clickable link. Verify the exact line first.
- Site-wide "Bible versions and copyright" page listing each version, owner, notice and link.

## Sources consulted (all via search results; not fetched directly)

- https://www.lockman.org/?p=3
- https://guides.library.yale.edu/newtestament/nasb
- https://www.studylight.org/site-resources/copyright-statements/eng/nas.html
- https://bibleresources.org/bible-copyright-notices/
- https://lsbible.org/permission-to-quote-the-lsb/
- https://learnofchrist.com/resources/youversion-platform-services
- https://api.bible/terms-and-conditions and https://api.bible/faq
- https://www.crossway.org/rights-and-permissions/esv/ , https://www.esv.org/api/ , https://www.esv.org/about/terms/
- https://assets.cambridge.org/97805211/63347/copyright/9780521163347_copyright_info.pdf
- https://ebible.org/kjv/copr.htm , https://ebible.org/engwebp/copyright.htm
- https://biblegateway.com/versions/World-English-Bible-WEB
- https://www.opc.org/documents/Preface.pdf , https://opc.org/preface.html
- https://ota.bodleian.ox.ac.uk/repository/xmlui/handle/20.500.12024/N00456?show=full
- https://archive.org/download/constitutionofpr1914pres/constitutionofpr1914pres_bw.pdf
- https://reformedstandards.com/westminster/wsc-pca.html

## Follow-ups that need network access

Allow lockman.org, developers.youversion.com (and platform.youversion.com), esv.org, crossway.org, ebible.org and opc.org in the session, then re-run this research to replace the summary-derived quotes with verbatim text.

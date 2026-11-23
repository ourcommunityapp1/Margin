# Public pages plan: search (SEO) and AI answers (AEO)

Goal: when someone searches or asks an AI tool about a catechism question, a creed, or how to memorize
Scripture, a Katekize page is the clear, quotable answer, with one tap into the app to memorize it.

## Why this structure

- Catechism questions are searched word for word ("What is the chief end of man?"). One page per question
  already ranks for others (e.g. bpc.org/sc-q1), so 107 Shorter + 196 Larger questions are 303 long-tail pages.
- AI tools quote pages that answer first, in plain text, with clear headings and sources.
- Today the app's pages are prerendered but sit behind the sign-in check, have no per-page titles or
  descriptions, and the site has no sitemap or robots.txt. Search engines can't see the content.

## URL structure (public, outside the app)

| URL | Page |
|---|---|
| `/` | Home: what Katekize is, the courses, how memory works in one screen, Open the app |
| `/westminster-shorter-catechism` | Hub: all 107 questions grouped by the three parts, with progress-free links |
| `/westminster-shorter-catechism/1` … `/107` | One question each |
| `/westminster-larger-catechism` and `/…/1` … | Same, as the Larger Catechism is built |
| `/apostles-creed`, `/nicene-creed` | The creed, section by section, with proof texts |
| `/memorize/psalm-23`, `/memorize/lords-prayer`, … | One page per Scripture course (see the NASB decision) |
| `/how-to-memorize-scripture` | Guide |
| `/how-to-memorize-the-westminster-shorter-catechism` | Guide (how long it takes, a plan per day) |
| `/catechism-for-kids` | Guide for parents: the child track, short pieces, family routine |
| `/how-memory-works` | The research behind the stones: recall after time away, spacing, Bahrick |
| `/bible-memory-app` | Product page for "Bible memory app" searches |
| `/about` | Already exists in the app; also public |
| `/heir/...` | The app, unchanged. Marked `noindex`, since its content lives on the public pages |

Numbers in question URLs because people say "Q1" and "question 37"; the full question goes in the title and heading.

## A question page

1. Heading: the question, word for word. Breadcrumb: Westminster Shorter Catechism › Part 1 › Q1.
2. The answer, word for word, right under the heading (answer first, for search snippets and AI quotes).
3. "In plain words": the meaning notes. Only 10 of 107 Shorter questions have them today (decision below).
4. Proof texts: references, with KJV text (public domain) or links (see the NASB decision).
5. "Memorize this" button: opens the course in the app at this question.
6. Previous and next question, and the other questions in its unit.
7. Source line: the 1647 text, public domain.

Structured data (schema.org JSON-LD): `BreadcrumbList`; the question as `Question` with `acceptedAnswer`
inside a `CreativeWork` that `isPartOf` the catechism. Google no longer shows FAQ rich results for most
sites, so the gain is in how search engines and AI tools read the page, not a special result.

## Technical

- Server-rendered static pages (Next 16 server components, `generateStaticParams`), not the app's client
  provider, so the full text is in the HTML.
- `generateMetadata` per page: title ("What is the chief end of man? | Westminster Shorter Catechism Q1"),
  description (the answer), canonical URL, Open Graph image (the course's window).
- `app/sitemap.ts` listing every public page; `app/robots.ts` allowing search engines and AI crawlers
  (Googlebot, Bingbot, GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot), and pointing to the sitemap.
- `/heir/*` gets `noindex` so app screens don't compete with the public pages.
- Optional `llms.txt` listing the hubs and guides.
- Read the Next 16 docs in `node_modules/next/dist/docs/` before building (metadata, sitemap, robots APIs).

## Measurement

- Google Search Console and Bing Webmaster Tools (Bing can import from Google): queries, clicks, indexing.
- Monthly: ask ChatGPT, Perplexity, Google AI Mode and Copilot a fixed list of questions and record whether
  Katekize is cited.

## Phases

1. **Foundation**: sitemap, robots, metadata, `noindex` on the app, public home page, Search Console.
2. **Shorter Catechism**: hub plus 107 question pages (answer, proof texts, memorize button).
3. **Guides and creeds**: how to memorize Scripture, the Shorter Catechism guide, kids, how memory works,
   Apostles' and Nicene Creeds, the Bible memory app page.
4. **Larger Catechism** pages as its content is built; **Scripture course** pages after the NASB decision.
5. **Iterate** from Search Console: rewrite titles for pages with views but few clicks; write guides for
   questions people actually ask.

## Decisions for the owner

1. **Home page.** `katekize.com/` currently redirects to the app. A public home page is needed for search.
   Returning users would tap "Open the app" (the installed app already opens at `/heir`).
2. **Scripture text on public pages.** NASB on public web pages has to stay within Lockman's quotation limits
   with the copyright notice; KJV is public domain. Options: KJV on public pages and NASB in the app, or ask
   Lockman, or show references only.
3. **Plain-words notes for the other 97 Shorter questions.** Worth writing for both search and the app; each
   needs your theological review before it goes live.
4. **AI crawlers.** Allowing them is what makes AI answers cite you. Default: allow.

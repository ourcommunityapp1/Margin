# ADR-0005: Course content is exported from the website's files

- **Status:** Accepted

## Context

All course text lives in TypeScript in `src/heir/content/`:
- the Westminster Shorter and Larger Catechisms;
- the creeds;
- Scripture courses;
- intros;
- KJV verse text;
- related verses.

Each item has its chunks for adult and child tracks, meaning questions, and connections.

The NASB text is not stored. It is fetched per verse from `/api/heir/verse`.

## Decision

- **One script, `scripts/export-content.ts`,** writes one JSON file, `mobile/assets/content/content.json`. It has a
  version number and a checksum.
- **The app never hand-edits content.** Change it on the website side, then run the export.
- **The word of God is never altered.** The export copies text exactly. A test compares every exported item's text with
  the source.
- **The window images** (`public/heir/glass/`, about 18 MB) are bundled in the app, so windows work offline.

## Consequences

- **One source of truth for content.**
- **Content updates need a new app release** until we add downloading content updates (a later option).

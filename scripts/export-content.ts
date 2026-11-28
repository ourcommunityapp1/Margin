// Writes every course's text for the Katekize phone app to mobile/assets/content/content.json (ADR-0005).
// The word of God is copied exactly; this script only reads and writes. Run: node scripts/export-content.ts
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { collections, courses } from '../src/heir/content/index.ts';
import { INTROS } from '../src/heir/content/intros.ts';
import { VERSES } from '../src/heir/content/verses.ts';
import { SWAPS } from '../src/heir/swaps.ts';

const body = { collections, courses, intros: INTROS, verses: VERSES, swaps: SWAPS };
const text = JSON.stringify(body);
const checksum = createHash('sha256').update(text).digest('hex');
mkdirSync('mobile/assets/content', { recursive: true });
writeFileSync('mobile/assets/content/content.json', JSON.stringify({ version: 1, checksum, ...body }));
const items = collections.reduce((n, c) => n + c.items.length, 0);
console.log(`content.json: ${collections.length} collections, ${items} items, ${courses.length} courses, checksum ${checksum.slice(0, 12)}`);

// Flags commentary that may contain anti-Jewish or anti-Catholic polemic, for human review.
// The engine marks flagged sources so the host attributes and contextualizes them; a person
// still needs to read the list before launch.
//
//   node scripts/audit-polemic.ts            writes data/corpus/review.json.gz and a summary

import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { Corpus } from '../src/engine/corpus/store.ts';
import { fileLoader } from '../src/engine/corpus/loaders.ts';
import { BOOKS } from '../src/engine/bible/canon.ts';

const DIR = path.resolve('data/corpus');
const JEWS = /\b(Jews?|Jewish|Judaism|synagogue)\b/gi;
const HARSH = /\b(blind(ness)?|obstinate|obstinacy|perfid\w*|accursed|cursed|reprobat\w*|rejected|cast off|harden\w*|malic\w*|carnal|murderers?|crucifiers|Christ-killers|deicide|enemies of|stiff-necked|his blood be on us|synagogue of Satan|infidel\w*)\b/i;
const ROME = /\b(papists?|popery|popish|Romish|Romanists?|church of Rome|whore of Babylon|mass-?priests?)\b|\bantichrist\b(?=[^.]{0,120}\b(pope|papal|Rome|infallib\w*)\b)/i;

const corpus = await Corpus.open(fileLoader(DIR));
const flagged: { id: string; who: string; why: string; snippet: string }[] = [];

for (let bi = 0; bi < BOOKS.length; bi++) {
  for (let c = 1; c <= corpus.chapterCount(bi); c++) {
    const cd = await corpus.chapter(bi, c);
    const chunks = [...cd.henry, ...cd.spurgeon, ...cd.catena, ...cd.fathers];
    if (cd.intro) chunks.push(cd.intro);
    if (cd.spurgeonOverview) chunks.push(cd.spurgeonOverview);
    for (const k of chunks) {
      let why = '';
      let at = -1;
      for (const m of k.text.matchAll(JEWS)) {
        const near = k.text.slice(Math.max(0, m.index! - 80), m.index! + 80);
        if (HARSH.test(near)) { why = 'jews'; at = m.index!; break; }
      }
      const rome = k.text.match(ROME);
      if (!why && rome) { why = 'rome'; at = rome.index!; }
      if (why) flagged.push({ id: k.id, who: k.who, why, snippet: k.text.slice(Math.max(0, at - 100), at + 140).replace(/\s+/g, ' ') });
    }
  }
}

await writeFile(path.join(DIR, 'review.json.gz'), gzipSync(JSON.stringify({
  note: 'Heuristic flags for human review: possible anti-Jewish (jews) or anti-Catholic (rome) polemic. Not a verdict.',
  polemic: flagged,
})));
const byWho: Record<string, number> = {};
for (const f of flagged) byWho[`${f.who}/${f.why}`] = (byWho[f.who + '/' + f.why] ?? 0) + 1;
console.log(`Flagged ${flagged.length} chunks for review`, byWho);

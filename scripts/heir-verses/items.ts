// Prints every item's id and connected references as JSON, for pick.py.
import { courses, courseItems } from '../../src/heir/content/index.ts';
const out: Record<string, string[]> = {};
for (const c of courses) for (const i of courseItems(c)) out[i.id] = i.connected;
console.log(JSON.stringify(out));

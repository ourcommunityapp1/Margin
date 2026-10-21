// Puts the phone app into public/ before `next build`: the page itself, the built-in
// playlists, and the library as plain JSON for the Read tab and the player (the server reads
// the same files gzipped from data/corpus).
import { mkdir, readdir, readFile, rm, writeFile, copyFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const pub = path.join(root, 'public');
const data = path.join(pub, 'data');

await copyFile(path.join(root, 'web/app.html'), path.join(pub, 'margin.html'));
await copyFile(path.join(root, 'web/paths.js'), path.join(pub, 'paths.js'));

await rm(data, { recursive: true, force: true });
await mkdir(data, { recursive: true });
let n = 0;
for (const f of await readdir(path.join(root, 'data/corpus'))) {
  if (!f.endsWith('.json.gz')) continue;
  await writeFile(path.join(data, f.slice(0, -3)), gunzipSync(await readFile(path.join(root, 'data/corpus', f))));
  n++;
}
console.log(`web app: margin.html, paths.js and ${n} library files in public/`);

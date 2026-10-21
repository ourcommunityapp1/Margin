// Bundles the study engine for the browser as one IIFE exposing window.MarginEngine.
//   node scripts/build-browser.mjs [outfile]
import { build } from 'esbuild';

const outfile = process.argv[2] ?? 'dist/margin-engine.js';
await build({
  entryPoints: ['src/engine/browser.ts'],
  bundle: true,
  format: 'iife',
  globalName: 'MarginEngine',
  platform: 'browser',
  target: 'es2020',
  // The server-only file loader imports these lazily; they never run in the browser.
  external: ['node:*'],
  minify: false,
  legalComments: 'none',
  outfile,
});
console.log(`Wrote ${outfile}`);

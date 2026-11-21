'use client';

// A small, still copy of a course's round window for lists. Each pane is lit exactly as in the full window
// (the same panes for the same progress), and everything not yet lit is so dim that only a hint of the glass
// shows. Drawn on a plain 2D canvas from 256px copies of the window (made by scripts/heir-glass/mini.py),
// so a list of courses costs no WebGL.

import { useEffect, useRef } from 'react';

type Decoded = { size: number; glass: Uint8ClampedArray; ids: Uint8ClampedArray; flat: number[]; count: number };
const cache = new Map<string, Promise<Decoded>>();

async function pixels(url: string): Promise<ImageData> {
  const blob = await (await fetch(url)).blob();
  const bmp = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  const c = document.createElement('canvas');
  c.width = bmp.width; c.height = bmp.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0);
  return ctx.getImageData(0, 0, c.width, c.height);
}

function load(base: string): Promise<Decoded> {
  let p = cache.get(base);
  if (!p) {
    p = Promise.all([
      fetch(`${base}/pieces.json`).then((r) => r.json() as Promise<{ count: number; questions: number[][] }>),
      pixels(`${base}/glass-mini.webp`),
      pixels(`${base}/ids-mini.png`),
    ]).then(([meta, glass, ids]) => ({ size: glass.width, glass: glass.data, ids: ids.data, flat: meta.questions.flat(), count: meta.count }));
    p.catch(() => cache.delete(base));
    cache.set(base, p);
  }
  return p;
}

// How bright unlit glass is, and dusty glass (learned, but due for a refresh).
const UNLIT = 0.13, DUSTY = 0.5;

function paint(canvas: HTMLCanvasElement, d: Decoded, lit: number[], dusty?: boolean[]) {
  // Item i of n owns an even share of the window's panes, in reveal order; a fraction f lights the first f of them.
  const state = new Uint8Array(d.count + 1);
  const P = d.flat.length, n = lit.length;
  lit.forEach((f, i) => {
    const own = d.flat.slice(Math.floor((i * P) / n), Math.floor(((i + 1) * P) / n));
    const on = Math.round(Math.max(0, Math.min(1, f)) * own.length);
    for (let k = 0; k < on; k++) state[own[k]] = dusty?.[i] ? 2 : 1;
  });
  canvas.width = d.size; canvas.height = d.size;
  const ctx = canvas.getContext('2d')!;
  const out = ctx.createImageData(d.size, d.size);
  const g = d.glass, ids = d.ids, o = out.data;
  for (let p = 0; p < o.length; p += 4) {
    if (ids[p + 3] === 0) continue;
    const s = state[ids[p] + ids[p + 1] * 256] ?? 0;
    const lead = 1 - 0.75 * (ids[p + 2] / 255);
    const r = g[p], gr = g[p + 1], b = g[p + 2];
    const grey = 0.3 * r + 0.59 * gr + 0.11 * b;
    const [k, mix] = s === 1 ? [1.05, 0] : s === 2 ? [DUSTY, 0.4] : [UNLIT, 0.45];
    o[p] = Math.min(255, (r + (grey - r) * mix) * k * lead);
    o[p + 1] = Math.min(255, (gr + (grey - gr) * mix) * k * lead);
    o[p + 2] = Math.min(255, (b + (grey - b) * mix) * k * lead);
    o[p + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
}

export function MiniWindow({ base, lit, dusty, size = 64, label }: { base: string; lit: number[]; dusty?: boolean[]; size?: number; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = `${lit.join(',')}|${dusty?.map(Number).join('') ?? ''}`;
  useEffect(() => {
    let alive = true;
    load(base).then((d) => { if (alive && ref.current) paint(ref.current, d, lit, dusty); }).catch(() => { /* leave the dark circle */ });
    return () => { alive = false; };
    // `key` stands for lit and dusty, which are new arrays on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, key]);
  return (
    <span className="hr-mini" style={{ width: size, height: size }} role="img" aria-label={label}>
      <canvas ref={ref} />
    </span>
  );
}

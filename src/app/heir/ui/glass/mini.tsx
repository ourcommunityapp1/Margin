'use client';

// A small copy of a course's round window, for the Courses list and a course's page. Panes you've learned are
// lit exactly as in the full window (the same panes for the same progress). The rest rest almost black, and a
// dim light moves behind them so you can tell there's a picture there without seeing it:
//   - on its own (a course's page), the light circles the window, clockwise and then back;
//   - in a list, one light travels down through every window in turn, top to bottom, then back up.
// Drawn on a plain 2D canvas from 256px copies of the window (made by scripts/heir-glass/mini.py), so a list of
// courses costs no WebGL. Only panes whose light changed are redrawn; nothing moves off screen, in a background
// tab, or with reduced motion.

import { useEffect, useRef } from 'react';
import { LIGHT, lightAt, lightOn, paneGain, type Motion } from './light-motion';

export type { Motion };

type Pane = { id: number; px: Int32Array; cx: number; cy: number; gain: number };
type Decoded = { size: number; glass: Uint8ClampedArray; ids: Uint8ClampedArray; flat: number[]; count: number; panes: Pane[] };
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
    ]).then(([meta, glass, ids]) => {
      const size = glass.width;
      // Each pane's pixels and centre, for the moving light.
      const acc = new Map<number, { px: number[]; x: number; y: number }>();
      for (let p = 0; p < size * size; p++) {
        if (ids.data[p * 4 + 3] === 0) continue;
        const id = ids.data[p * 4] + ids.data[p * 4 + 1] * 256;
        if (!id) continue;
        let a = acc.get(id);
        if (!a) acc.set(id, (a = { px: [], x: 0, y: 0 }));
        a.px.push(p); a.x += p % size; a.y += Math.floor(p / size);
      }
      // A fixed small variation per pane, as real glass of different thickness would catch light differently.
      const panes = [...acc].map(([id, a]) => ({ id, px: Int32Array.from(a.px), cx: a.x / a.px.length / size, cy: a.y / a.px.length / size, gain: paneGain(id) }));
      return { size, glass: glass.data, ids: ids.data, flat: meta.questions.flat(), count: meta.count, panes };
    });
    p.catch(() => cache.delete(base));
    cache.set(base, p);
  }
  return p;
}

const REST = LIGHT.rest; // dark glass at rest
const DUSTY = 0.5; // learned, but due for a refresh

function shade(o: Uint8ClampedArray, g: Uint8ClampedArray, ids: Uint8ClampedArray, px: Int32Array, b: number, mix: number) {
  for (const p of px) {
    const q = p * 4;
    const lead = 1 - 0.75 * (ids[q + 2] / 255);
    const r = g[q], gr = g[q + 1], bl = g[q + 2];
    const grey = 0.3 * r + 0.59 * gr + 0.11 * bl;
    o[q] = Math.min(255, (r + (grey - r) * mix) * b * lead);
    o[q + 1] = Math.min(255, (gr + (grey - gr) * mix) * b * lead);
    o[q + 2] = Math.min(255, (bl + (grey - bl) * mix) * b * lead);
    o[q + 3] = 255;
  }
}

export function MiniWindow({ base, lit, dusty, size = 64, label, motion = { kind: 'circle' } }: {
  base: string; lit: number[]; dusty?: boolean[]; size?: number; label?: string; motion?: Motion;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = `${lit.join(',')}|${dusty?.map(Number).join('') ?? ''}|${JSON.stringify(motion)}`;
  useEffect(() => {
    let alive = true, raf = 0, visible = true;
    const canvas = ref.current;
    if (!canvas) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const seen = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); });
    seen.observe(canvas);
    load(base).then((d) => {
      if (!alive) return;
      // Item i of n owns an even share of the window's panes, in reveal order; a fraction f lights the first f of them.
      const state = new Uint8Array(d.count + 1);
      const P = d.flat.length, n = lit.length;
      lit.forEach((f, i) => {
        const own = d.flat.slice(Math.floor((i * P) / n), Math.floor(((i + 1) * P) / n));
        const on = Math.round(Math.max(0, Math.min(1, f)) * own.length);
        for (let k = 0; k < on; k++) state[own[k]] = dusty?.[i] ? 2 : 1;
      });
      canvas.width = canvas.height = d.size;
      const ctx = canvas.getContext('2d')!;
      const img = ctx.createImageData(d.size, d.size);
      const dark = d.panes.filter((p) => !state[p.id]);
      for (const p of d.panes) shade(img.data, d.glass, d.ids, p.px, state[p.id] === 1 ? 1.05 : state[p.id] === 2 ? DUSTY : REST, state[p.id] === 1 ? 0 : state[p.id] === 2 ? 0.4 : 0.45);
      ctx.putImageData(img, 0, 0);
      if (still || !dark.length) return;
      const shown = new Float32Array(d.count + 1).fill(REST);
      let last = 0;
      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        if (!visible || document.hidden || now - last < 33) return;
        last = now;
        const s = lightAt(motion, now);
        let dirty = false;
        for (const p of dark) {
          const b = REST + (LIGHT.peak - REST) * lightOn(s, p.cx, p.cy, p.gain);
          if (Math.abs(shown[p.id] - b) < 0.003) continue;
          shown[p.id] = b;
          shade(img.data, d.glass, d.ids, p.px, b, 0.45 * (1 - (b - REST) / (1 - REST)));
          dirty = true;
        }
        if (dirty) ctx.putImageData(img, 0, 0);
      };
      raf = requestAnimationFrame(frame);
    }).catch(() => { /* leave the dark circle */ });
    return () => { alive = false; cancelAnimationFrame(raf); seen.disconnect(); };
    // `key` stands for lit, dusty and motion, which are new objects on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, key]);
  return (
    <span className="hr-mini" style={{ width: size, height: size }} role="img" aria-label={label}>
      <canvas ref={ref} />
    </span>
  );
}

'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { GlassEngine, loadGlass, type GlassMeta } from './engine';

// Timing for one piece of glass waking up (ms from its start):
// 0-150 warm light catches the lead; 150-600 light rises past full; 600-1000 settles; glow fades by 900.
const EDGE = 150, RISE = 600, SETTLE = 1000, GLOW_END = 900, PEAK = 1.2;
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export type WindowHandle = {
  /** Light these questions (0-based), sweeping piece by piece. */
  reveal: (questions: number[], opts?: { stagger?: number; gap?: number }) => void;
  /** Set the window to show exactly the first n questions lit, with no animation. */
  setLearned: (n: number) => void;
  /** Questions due for review gather a little dust. */
  setDusty: (questions: number[]) => void;
  setSun: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  meta: () => GlassMeta | null;
};

type Track = { id: number; t0: number };

export const LivingWindow = forwardRef<WindowHandle, { base: string; learned?: number; className?: string }>(
  function LivingWindow({ base, learned = 0, className }, ref) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const engine = useRef<GlassEngine | null>(null);
    const meta = useRef<GlassMeta | null>(null);
    const tracks = useRef<Track[]>([]);
    const flash = useRef<{ t0: number; amount: number } | null>(null);
    const camera = useRef({ zoom: 1, focus: 0.5, targetZoom: 1, targetFocus: 0.5 });
    const learnedRef = useRef(learned);
    const [failed, setFailed] = useState(false);
    const reduce = useRef(false);

    const piecesOf = (qs: number[]) => qs.flatMap((q) => meta.current?.questions[q] ?? []);
    // Height (0 top, 1 bottom) where the light front is, so a zoomed camera can follow it.
    const frontAt = (n: number) => {
      const m = meta.current;
      if (!m || n <= 0) return 1;
      return Math.max(0, 1 - n / m.questions.length);
    };

    const applyLearned = (n: number) => {
      const e = engine.current, m = meta.current;
      if (!e || !m) return;
      e.light.fill(0); e.glow.fill(0); tracks.current = [];
      for (const id of piecesOf(m.questions.slice(0, n).map((_, i) => i))) e.light[id] = 1;
      learnedRef.current = n;
      camera.current.targetFocus = frontAt(n);
    };

    useImperativeHandle(ref, () => ({
      reveal(questions, opts = {}) {
        const e = engine.current;
        if (!e) return;
        const stagger = opts.stagger ?? 14, gap = opts.gap ?? 260;
        let t = performance.now();
        for (const q of questions) {
          const ids = meta.current?.questions[q] ?? [];
          if (reduce.current) { for (const id of ids) e.light[id] = 1; continue; }
          ids.forEach((id, k) => tracks.current.push({ id, t0: t + k * stagger }));
          t += ids.length * stagger + gap;
        }
        const last = Math.max(...questions);
        learnedRef.current = Math.max(learnedRef.current, last + 1);
        camera.current.targetFocus = frontAt(learnedRef.current);
        // The sun breaks through when the sweep finishes.
        flash.current = { t0: t + SETTLE - gap, amount: questions.length >= 5 ? 0.35 : 0.18 };
      },
      setLearned: applyLearned,
      setDusty(questions) {
        const e = engine.current;
        if (!e) return;
        e.dust.fill(0);
        for (const id of piecesOf(questions)) e.dust[id] = 1;
      },
      setSun(x, y) { if (engine.current) engine.current.sun = [x, y]; },
      setZoom(z) { camera.current.targetZoom = z; },
      meta: () => meta.current,
    }));

    useEffect(() => {
      let raf = 0, alive = true;
      reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const c = canvas.current!;
      loadGlass(base).then(({ assets, meta: m }) => {
        if (!alive) return;
        try { engine.current = new GlassEngine(c, assets); } catch (err) { console.error('glass', err); setFailed(true); return; }
        meta.current = m;
        if (reduce.current) engine.current.cloud = 0;
        applyLearned(learnedRef.current);
        const loop = (now: number) => {
          const e = engine.current!;
          // Animate pieces.
          let active = 0;
          tracks.current = tracks.current.filter(({ id, t0 }) => {
            const dt = now - t0;
            if (dt < 0) return true;
            active++;
            e.glow[id] = dt < EDGE ? dt / EDGE : Math.max(0, 1 - (dt - EDGE) / (GLOW_END - EDGE));
            if (dt < EDGE) e.light[id] = Math.max(e.light[id], 0);
            else if (dt < RISE) e.light[id] = PEAK * easeOut((dt - EDGE) / (RISE - EDGE));
            else if (dt < SETTLE) e.light[id] = PEAK - (PEAK - 1) * easeInOut((dt - RISE) / (SETTLE - RISE));
            else { e.light[id] = 1; e.glow[id] = 0; return false; }
            return true;
          });
          // Rays flare while light is arriving; the sun breaks through at the end.
          e.rayAmount += ((active ? 1.15 : 0.75) - e.rayAmount) * 0.05;
          const f = flash.current;
          if (f) {
            const x = (now - f.t0) / 1400;
            e.flash = x < 0 ? 0 : x > 1 ? 0 : f.amount * Math.sin(Math.PI * x);
            if (x > 1) flash.current = null;
          }
          // Camera eases toward its target.
          const cam = camera.current;
          cam.zoom += (cam.targetZoom - cam.zoom) * 0.06;
          cam.focus += (cam.targetFocus - cam.focus) * 0.04;
          e.zoom = cam.zoom; e.focus = cam.focus;
          e.render(now);
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      }).catch((err) => { console.error('glass', err); setFailed(true); });
      const onResize = () => engine.current?.resize();
      window.addEventListener('resize', onResize);
      return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); engine.current?.dispose(); engine.current = null; };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [base]);

    if (failed) return <div className={className} style={{ background: '#16130F' }} />;
    return <canvas ref={canvas} className={className} style={{ width: '100%', height: '100%', display: 'block' }} aria-label="Stained-glass window" role="img" />;
  },
);

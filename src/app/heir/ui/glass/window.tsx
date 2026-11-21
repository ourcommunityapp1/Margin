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
  /** Animate from what is lit now to this: one fraction (0-1) per course question, in course order. */
  revealTo: (lit: number[]) => void;
  meta: () => GlassMeta | null;
};

type Props = {
  base: string;
  /** Lab only: the first n window questions lit. */
  learned?: number;
  /** One fraction (0-1) per course question, in course order. Each course question owns an equal share of the glass. */
  lit?: number[];
  /** Course questions that need a refresh: their lit glass gathers dust. */
  dusty?: boolean[];
  onReady?: () => void;
  /** CSS pixels at the bottom covered by a panel; the glass is framed above it. */
  bottomInset?: number;
  /** The course question learned next: the lead around its glass glows softly, beckoning. */
  hint?: number;
  /** Light rays falling from the lit glass. On by default. */
  rays?: boolean;
  className?: string;
};

type Track = { id: number; t0: number };

export const LivingWindow = forwardRef<WindowHandle, Props>(
  function LivingWindow({ base, learned = 0, lit, dusty, onReady, bottomInset = 0, hint, rays = true, className }, ref) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const engine = useRef<GlassEngine | null>(null);
    const meta = useRef<GlassMeta | null>(null);
    const tracks = useRef<Track[]>([]);
    const flash = useRef<{ t0: number; amount: number } | null>(null);
    const camera = useRef({ zoom: 1, focus: 0.5, targetZoom: 1, targetFocus: 0.5 });
    const learnedRef = useRef(learned);
    const [failed, setFailed] = useState(false);
    const reduce = useRef(false);

    const litRef = useRef(lit), dustyRef = useRef(dusty), readyRef = useRef(onReady);
    litRef.current = lit; dustyRef.current = dusty; readyRef.current = onReady;
    const insetRef = useRef(bottomInset); insetRef.current = bottomInset;
    const hintRef = useRef(hint); hintRef.current = hint;
    const raysRef = useRef(rays); raysRef.current = rays;
    const visible = useRef(true);
    // All pieces in reveal order (bottom left to top right). Course question i of n owns slice i of n.
    const flat = useRef<number[]>([]);
    const itemPieces = (n: number, i: number) => {
      const P = flat.current.length;
      return flat.current.slice(Math.floor((i * P) / n), Math.floor(((i + 1) * P) / n));
    };
    const idsFor = (fractions: number[]) => fractions.flatMap((f, i) => {
      const ps = itemPieces(fractions.length, i);
      return ps.slice(0, Math.round(Math.max(0, Math.min(1, f)) * ps.length));
    });
    // Keep the light front in view when the window is taller than its frame.
    const followLight = () => {
      const e = engine.current;
      if (!e || !e.count) return;
      let on = 0;
      for (let i = 1; i <= e.count; i++) if (e.light[i] > 0.5) on++;
      camera.current.targetFocus = Math.min(0.97, Math.max(0.08, 1 - on / e.count));
    };
    const applyLit = (fractions: number[]) => {
      const e = engine.current;
      if (!e) return;
      e.light.fill(0); e.glow.fill(0); tracks.current = [];
      for (const id of idsFor(fractions)) e.light[id] = 1;
      followLight();
      camera.current.focus = camera.current.targetFocus;
    };
    const applyDust = (flags: boolean[] | undefined) => {
      const e = engine.current;
      if (!e) return;
      e.dust.fill(0);
      flags?.forEach((on, i) => { if (on) for (const id of itemPieces(flags.length, i)) e.dust[id] = 1; });
    };

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
      revealTo(fractions) {
        const e = engine.current;
        if (!e) return;
        const ids = idsFor(fractions).filter((id) => e.light[id] < 0.5);
        if (!ids.length) return;
        if (reduce.current) { for (const id of ids) e.light[id] = 1; return; }
        // However much is new, the sweep takes about two to three seconds.
        const stagger = Math.max(6, Math.min(130, 2400 / ids.length));
        const t = performance.now();
        ids.forEach((id, k) => tracks.current.push({ id, t0: t + k * stagger }));
        let on = 0;
        for (let i = 1; i <= e.count; i++) if (e.light[i] > 0.5) on++;
        camera.current.targetFocus = Math.min(0.97, Math.max(0.08, 1 - (on + ids.length / 2) / e.count));
        flash.current = { t0: t + ids.length * stagger + SETTLE * 0.6, amount: ids.length > 40 ? 0.35 : 0.22 };
      },
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
        flat.current = m.questions.flat();
        if (reduce.current) engine.current.cloud = 0;
        if (litRef.current) applyLit(litRef.current); else applyLearned(learnedRef.current);
        applyDust(dustyRef.current);
        readyRef.current?.();
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
          // The next pane beckons: warm light breathes along its lead while it waits to be lit.
          const h = hintRef.current, n = litRef.current?.length;
          if (h != null && h >= 0 && n && !tracks.current.length) {
            const ids = itemPieces(n, h);
            const wave = 0.5 + 0.5 * Math.sin(now / 700);
            ids.forEach((id, k) => { if (e.light[id] < 0.5) e.glow[id] = 0.18 + 0.5 * wave * (0.6 + 0.4 * Math.sin(k * 1.7)); });
          }
          // Rays flare while light is arriving; the sun breaks through at the end.
          e.rayAmount += ((raysRef.current ? (active ? 1.15 : 0.75) : 0) - e.rayAmount) * 0.05;
          const f = flash.current;
          if (f) {
            const x = (now - f.t0) / 1400;
            e.flash = x < 0 ? 0 : x > 1 ? 0 : f.amount * Math.sin(Math.PI * x);
            if (x > 1) flash.current = null;
          }
          // The room brightens as more of the window lets light in.
          let sum = 0;
          for (let i = 1; i <= e.count; i++) sum += Math.min(1, e.light[i]);
          e.room += (0.34 + 0.32 * (sum / Math.max(1, e.count)) - e.room) * 0.05;
          // Camera eases toward its target.
          const cam = camera.current;
          cam.zoom += (cam.targetZoom - cam.zoom) * 0.06;
          cam.focus += (cam.targetFocus - cam.focus) * 0.04;
          e.zoom = cam.zoom; e.focus = cam.focus; e.inset = insetRef.current;
          if (visible.current) e.render(now);
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      }).catch((err) => { console.error('glass', err); setFailed(true); });
      // Follow the frame's size, and stop drawing while the window is scrolled out of sight.
      const ro = new ResizeObserver(() => engine.current?.resize());
      ro.observe(c);
      const io = new IntersectionObserver(([en]) => { visible.current = en.isIntersecting; });
      io.observe(c);
      return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); engine.current?.dispose(); engine.current = null; };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [base]);

    const litKey = lit?.map((f) => f.toFixed(3)).join(',');
    const dustKey = dusty?.map((d) => (d ? 1 : 0)).join('');
    useEffect(() => {
      if (!engine.current || !lit || tracks.current.length) return;
      applyLit(lit);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [litKey]);
    useEffect(() => {
      applyDust(dusty);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dustKey]);

    if (failed) return <div className={className} style={{ background: '#16130F' }} />;
    return <canvas ref={canvas} className={className} style={{ width: '100%', height: '100%', display: 'block' }} aria-label="Stained-glass window" role="img" />;
  },
);

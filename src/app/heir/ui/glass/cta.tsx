'use client';

// The call to action is a pane of the window itself: the actual glass you're about to light, cropped
// from the photo, glowing from behind, edged in lead, with a slow sheen of light crossing it.

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { GlassMeta } from './engine';

const metaCache = new Map<string, Promise<GlassMeta>>();
export function useGlassMeta(base: string) {
  const [meta, setMeta] = useState<GlassMeta | null>(null);
  useEffect(() => {
    let live = true;
    if (!metaCache.has(base)) metaCache.set(base, fetch(`${base}/pieces.json`).then((r) => r.json()));
    metaCache.get(base)!.then((m) => { if (live) setMeta(m); }).catch(() => {});
    return () => { live = false; };
  }, [base]);
  return meta;
}

// Centre of the glass that course question i of n will light, as fractions of the image.
export function paneCentre(meta: GlassMeta, n: number, i: number): [number, number] | null {
  if (!meta.centres) return null;
  const flat = meta.questions.flat();
  const ids = flat.slice(Math.floor((i * flat.length) / n), Math.floor(((i + 1) * flat.length) / n));
  if (!ids.length) return null;
  let x = 0, y = 0;
  for (const id of ids) { x += meta.centres[id - 1][0]; y += meta.centres[id - 1][1]; }
  return [x / ids.length, y / ids.length];
}

export function GlassCta({ base, meta, next, total, href, onClick, label, sub }: {
  base: string; meta: GlassMeta | null; next: number; total: number; href?: string; onClick?: () => void; label: string; sub?: string;
}) {
  const box = useRef<HTMLElement>(null);
  const [size, setSize] = useState<[number, number]>([358, 88]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize([el.clientWidth, el.clientHeight]));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Frame a band of the window around the next pane: about half the window wide, as tall as the button allows.
  let style: React.CSSProperties = {};
  const c = meta && next >= 0 ? paneCentre(meta, total, next) : null;
  if (meta && c) {
    const [bw, bh] = size;
    const rw = 0.5;                                     // fraction of the image width shown
    const imgW = bw / rw, imgH = imgW * (meta.height / meta.width);
    const rh = Math.min(1, bh / imgH);
    const x0 = Math.min(1 - rw, Math.max(0, c[0] - rw / 2));
    const y0 = Math.min(1 - rh, Math.max(0, c[1] - rh / 2));
    style = {
      backgroundImage: `url(${base}/glass.webp)`,
      backgroundSize: `${imgW}px ${imgH}px`,
      backgroundPosition: `${(x0 / (1 - rw)) * 100}% ${rh < 1 ? (y0 / (1 - rh)) * 100 : 50}%`,
    };
  }

  const inner = (
    <>
      <span className="hr-glass-cta-glass" style={style} aria-hidden="true" />
      <span className="hr-glass-cta-sheen" aria-hidden="true" />
      <span className="hr-glass-cta-text">
        <span className="serif hr-glass-cta-label">{label}</span>
        {sub && <span className="hr-glass-cta-sub">{sub}</span>}
      </span>
      <span className="hr-glass-cta-go" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </span>
    </>
  );
  return href
    ? <Link ref={box as React.RefObject<HTMLAnchorElement>} className="hr-glass-cta" href={href}>{inner}</Link>
    : <button ref={box as React.RefObject<HTMLButtonElement>} type="button" className="hr-glass-cta" onClick={onClick}>{inner}</button>;
}

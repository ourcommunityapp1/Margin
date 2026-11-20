'use client';

import { useRef, useState } from 'react';
import { LivingWindow, type WindowHandle } from './window';

// A test bench for the living window: learn questions one at a time or a unit at a time, jump anywhere,
// change the time of day, and follow the light up close.
const TIMES = [
  { name: 'Morning', sun: [-0.15, -0.35] as [number, number] },
  { name: 'Noon', sun: [0.5, -0.6] as [number, number] },
  { name: 'Evening', sun: [1.2, -0.2] as [number, number] },
];

export function WindowLab() {
  const win = useRef<WindowHandle>(null);
  const [learned, setLearned] = useState(0);
  const [time, setTime] = useState(0);
  const [close, setClose] = useState(false);
  const total = 107;

  const learn = (n: number) => {
    const qs = Array.from({ length: Math.min(n, total - learned) }, (_, i) => learned + i);
    if (!qs.length) return;
    win.current?.reveal(qs);
    setLearned(learned + qs.length);
  };
  const jump = (n: number) => { win.current?.setLearned(n); setLearned(n); };

  const chip: React.CSSProperties = {
    border: 0, borderRadius: 18, minHeight: 40, padding: '0 14px', font: '600 14px var(--font-inter), sans-serif',
    background: 'rgba(28,24,20,0.72)', color: '#F3EADB', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#16130F', overflow: 'hidden' }}>
      <LivingWindow ref={win} base="/heir/glass/wsc" />

      <div style={{ position: 'absolute', top: 'max(12px, env(safe-area-inset-top))', left: 12, right: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ ...chip, display: 'flex', alignItems: 'center' }}>Shorter · {learned} of {total}</span>
        <span style={{ flex: 1 }} />
        <button type="button" style={chip} onClick={() => { const t = (time + 1) % TIMES.length; setTime(t); win.current?.setSun(...TIMES[t].sun); }}>{TIMES[time].name}</button>
        <button type="button" style={chip} onClick={() => { setClose(!close); win.current?.setZoom(close ? 1 : 2.2); }}>{close ? 'Whole' : 'Close'}</button>
      </div>

      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 'max(14px, env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button type="button" onClick={() => learn(1)} style={{ minHeight: 56, borderRadius: 28, border: 0, background: 'linear-gradient(180deg, #FFE3B0, #F2B866)', color: '#2A1A08', font: '700 16px var(--font-inter), sans-serif', boxShadow: '0 0 34px rgba(255,190,110,0.35)' }}>Learn a question</button>
          <button type="button" onClick={() => learn(5)} style={{ ...chip, minHeight: 56, borderRadius: 28, fontSize: 16 }}>Finish a unit</button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', ...chip, padding: '0 14px' }}>
          <input aria-label="Questions learned" type="range" min={0} max={total} value={learned} onChange={(e) => jump(Number(e.target.value))} style={{ flex: 1, accentColor: '#F2B866' }} />
          <button type="button" style={{ ...chip, background: 'transparent', padding: '0 4px' }} onClick={() => { win.current?.setDusty(Array.from({ length: Math.min(learned, 12) }, (_, i) => i * 3).filter((q) => q < learned)); }}>Dust</button>
          <button type="button" style={{ ...chip, background: 'transparent', padding: '0 4px' }} onClick={() => win.current?.setDusty([])}>Clean</button>
        </div>
        <p style={{ margin: 0, textAlign: 'center', font: '500 11px var(--font-inter), sans-serif', color: 'rgba(243,234,219,0.6)' }}>
          The Good Samaritan window, Chartres Cathedral, c. 1205–1215. Photo from Wikimedia Commons (public domain).
        </p>
      </div>
    </div>
  );
}

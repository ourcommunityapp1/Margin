'use client';

// The course's window as a round window in a stone frame. The glass inside is the live engine, lit pane by
// pane by what you've learned. A gold arc on the frame traces how far round the light has come, and a small
// glowing notch marks where the next pane will light.

import { forwardRef } from 'react';
import { LivingWindow, type WindowHandle } from './window';

type Props = {
  base: string;
  lit: number[];
  dusty?: boolean[];
  hint?: number;
  /** Share of the window lit, 0-1, for the gold arc on the frame. */
  share: number;
  size?: number;
  onReady?: () => void;
  paneDelay?: number;
  label?: string;
  /** How long the gold arc takes to move to a new share (ms). */
  arcMs?: number;
};

export const RoundWindow = forwardRef<WindowHandle, Props>(function RoundWindow({ base, lit, dusty, hint, share, size = 300, onReady, paneDelay, label, arcMs = 900 }, ref) {
  // Frame geometry in a 324-unit box; the glass sits inside a circle of radius 146.
  const C = 162, R = 152.5;
  const f = Math.max(0, Math.min(1, share));
  // The arc is a full circle drawn only as far as the share; it and the notch glide when the share changes.
  const glide = `${arcMs}ms cubic-bezier(.3,.6,.25,1)`;
  const glass = (size * 292) / 324, inset = (size - glass) / 2;
  return (
    <div className="hr-round" style={{ width: size, height: size }} role="img" aria-label={label ?? `Your window: ${Math.round(share * 100)}% lit`}>
      <div className="hr-round-glass" style={{ left: inset, top: inset, width: glass, height: glass }}>
        <LivingWindow ref={ref} base={base} lit={lit} dusty={dusty} hint={hint} rays={false} fill onReady={onReady} paneDelay={paneDelay} />
      </div>
      <svg width={size} height={size} viewBox="0 0 324 324" aria-hidden="true" className="hr-round-frame">
        <defs>
          <linearGradient id="hr-round-stone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#A69B89" /><stop offset="0.5" stopColor="#7C7364" /><stop offset="1" stopColor="#4F483F" /></linearGradient>
          <radialGradient id="hr-round-sheen" cx="35%" cy="25%" r="75%"><stop offset="0" stopColor="#FFFFFF" stopOpacity="0.22" /><stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.03" /><stop offset="1" stopColor="#FFFFFF" stopOpacity="0" /></radialGradient>
        </defs>
        <circle cx={C} cy={C} r="148" fill="none" stroke="#0B0D0F" strokeWidth="5" />
        <circle cx={C} cy={C} r="156" fill="none" stroke="url(#hr-round-stone)" strokeWidth="11" />
        <circle cx={C} cy={C} r="161.5" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="1" />
        <circle cx={C} cy={C} r="150.6" fill="none" stroke="rgba(255,240,215,0.22)" strokeWidth="0.8" />
        <circle cx={C} cy={C} r={R} pathLength={100} fill="none" stroke="#F1C46B" strokeWidth="2.4" strokeLinecap="round"
          strokeDasharray={`${f * 100} 100`} transform={`rotate(-90 ${C} ${C})`} style={{ transition: `stroke-dasharray ${glide}`, opacity: f > 0 ? 1 : 0 }} />
        {f < 1 && (
          <g style={{ transform: `rotate(${f * 360}deg)`, transformOrigin: `${C}px ${C}px`, transition: `transform ${glide}` }}>
            <circle className="hr-round-notch" cx={C} cy={C - 156} r="4" fill="#FFE2A8" />
          </g>
        )}
        <g className="hr-round-sweep"><path d={`M${C} ${C} L${C} 10 A152 152 0 0 1 238 31 Z`} fill="url(#hr-round-sheen)" opacity="0.7" /></g>
      </svg>
    </div>
  );
});

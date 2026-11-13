'use client';

// Small shared pieces: icons, the orb, a bottom sheet, a quiet notice.

import { useEffect } from 'react';

type IconProps = { size?: number; stroke?: number };
const svg = (size: number, stroke: number, children: React.ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

export const BackIcon = ({ size = 22, stroke = 1.8 }: IconProps) => svg(size, stroke, <path d="M15 5l-7 7 7 7" />);
export const CloseIcon = ({ size = 20, stroke = 1.8 }: IconProps) => svg(size, stroke, <path d="M6 6l12 12M18 6L6 18" />);
export const PlusIcon = ({ size = 20, stroke = 1.8 }: IconProps) => svg(size, stroke, <path d="M12 5v14M5 12h14" />);
export const CheckIcon = ({ size = 22, stroke = 2 }: IconProps) => svg(size, stroke, <path d="M5 12.5l4.5 4.5L19 7" />);
export const SearchIcon = ({ size = 18, stroke = 1.8 }: IconProps) => svg(size, stroke, <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>);
export const SparkIcon = ({ size = 16, stroke = 1.8 }: IconProps) => svg(size, stroke, <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />);
export const LinesIcon = ({ size = 16, stroke = 1.8 }: IconProps) => svg(size, stroke, <path d="M4 6h10M4 12h16M4 18h7" />);
export const NewNoteIcon = ({ size = 20, stroke = 1.8 }: IconProps) => svg(size, stroke, <path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6M16.5 3.5l4 4L12 16H8v-4z" />);
export const KeyboardIcon = ({ size = 22, stroke = 1.6 }: IconProps) => svg(size, stroke, <><rect x="2.5" y="6" width="19" height="12" rx="2" /><path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M8 14h8" /></>);
export const GearIcon = ({ size = 22, stroke = 1.6 }: IconProps) => svg(size, stroke, <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></>);

export const iconButton = 'flex h-11 w-11 shrink-0 items-center justify-center text-[var(--ink)]';
export const sectionLabel = 'm-0 text-[12px] font-semibold uppercase tracking-[0.8px] text-[var(--muted)]';
export const card = 'rounded-[14px] border border-[var(--line)] bg-white px-[14px] py-3 text-[15px] leading-[1.45]';

export function Orb({ size, breathing, swirl = false }: { size: number; breathing: boolean; swirl?: boolean }) {
  return (
    <span className="relative block" style={{ width: size, height: size }} aria-hidden="true">
      <span className={`dt-orb-fill absolute inset-0 rounded-full ${breathing ? 'dt-orb' : ''}`} />
      {swirl && <span className="dt-swirl absolute rounded-full" style={{ inset: size * 0.12, animationPlayState: breathing ? 'running' : 'paused' }} />}
    </span>
  );
}

// A sheet that rises from the bottom over a dimmed page. Escape or the backdrop closes it.
export function Sheet({ title, onClose, children, tall = false }: { title: string; onClose(): void; children: React.ReactNode; tall?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" onClick={onClose} className="dt-fade absolute inset-0 bg-[rgba(60,56,50,0.55)]" />
      <div className={`dt-rise absolute bottom-0 flex w-full max-w-[480px] flex-col gap-[18px] overflow-y-auto rounded-t-[26px] bg-[var(--paper)] px-5 pt-[10px] dt-bottom ${tall ? 'top-[max(8dvh,calc(env(safe-area-inset-top,0px)+56px))]' : 'max-h-[86dvh]'}`}>
        <div className="h-[5px] w-10 shrink-0 self-center rounded-[3px] bg-[#CFC9BE]" aria-hidden="true" />
        <div className="-mt-[6px] flex items-center justify-between">
          <h1 className="serif m-0 text-[24px] font-medium">{title}</h1>
          <button aria-label="Close" onClick={onClose} className={`${iconButton} -mr-[10px]`}><CloseIcon /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// A one-line notice that explains a fallback without getting in the way.
export function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-[12px] leading-[1.45] text-[var(--muted)]" role="status">{children}</p>;
}

export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(now) - start(d)) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) });
}

export const longDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

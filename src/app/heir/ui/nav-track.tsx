'use client';

// Where you have been in the app, so a Back arrow goes back to where you were (the tab you came from), not to a fixed
// parent page. Lessons are skipped: you never go "back" into a lesson you finished or closed.

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

let stack: string[] = [];

const isLesson = (p: string) => p.startsWith('/heir/lesson') || p.startsWith('/heir/night');

/** The page before this one, skipping lessons, and drop everything after it; null when there isn't one. */
export function takeBack(current: string): string | null {
  for (let i = stack.length - 1; i >= 0; i--) {
    const p = stack[i];
    if (p !== current && !isLesson(p)) { stack = stack.slice(0, i); return p; }
  }
  return null;
}

export function NavTracker() {
  const path = usePathname();
  useEffect(() => {
    if (stack[stack.length - 1] === path) return;
    // Going back by the browser or phone: the page we land on is the one before the top.
    if (stack.length > 1 && stack[stack.length - 2] === path) stack = stack.slice(0, -1);
    else stack = [...stack, path].slice(-30);
  }, [path]);
  return null;
}

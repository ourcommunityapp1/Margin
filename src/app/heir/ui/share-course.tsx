'use client';

// Share a course: the iPhone share sheet with a link to the course's page (anyone opening it is asked to sign in,
// then lands on the course and can start it). Falls back to copying the link where there's no share sheet.

import { useState } from 'react';
import type { Course } from '@/heir/content';

const icon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </svg>
);

export function ShareCourse({ course }: { course: Course }) {
  const [note, setNote] = useState('');
  const share = async () => {
    const url = `${window.location.origin}/heir/courses/${course.id}`;
    const text = `Learn ${course.title} with me on Heir`;
    try {
      if (navigator.share) { await navigator.share({ title: course.title, text, url }); return; }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // closed the share sheet
    }
    try { await navigator.clipboard.writeText(`${text}: ${url}`); setNote('Link copied'); } catch { setNote(url); }
  };
  return (
    <button type="button" onClick={share} aria-label={`Share ${course.title}`}
      style={{ alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', minHeight: 40, borderRadius: 20,
        border: '1px solid rgba(255, 255, 255, 0.22)', background: 'rgba(255, 255, 255, 0.08)', color: '#F4EFE6', font: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
      {icon}<span>{note || 'Share this course'}</span>
    </button>
  );
}

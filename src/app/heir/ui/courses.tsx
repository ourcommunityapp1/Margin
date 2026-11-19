'use client';

// The three things a person can choose to memorize.

import { courses, courseItems } from '@/heir/content';

export function CourseChoices({ value, onChange }: { value: string | null; onChange(id: string): void }) {
  return (
    <div role="radiogroup" aria-label="What to memorize" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {courses.map((c) => {
        const n = courseItems(c).length;
        return (
          <button key={c.id} type="button" role="radio" aria-checked={value === c.id} className="hr-choice"
            onClick={() => onChange(c.id)} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontWeight: 600 }}>{c.title}</span>
            <span style={{ fontSize: 15, color: 'var(--muted)', fontWeight: 400 }}>{c.blurb} {c.id === 'creeds' ? `${n} sections.` : `Questions 1–${n} so far.`}</span>
          </button>
        );
      })}
    </div>
  );
}

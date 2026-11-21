'use client';

// The courses a person can choose to memorize.

import { courses, courseItems, isVerse } from '@/heir/content';

export function CourseChoices({ value, onChange, progress }: { value: string | null; onChange(id: string): void; progress?: Record<string, { learned: number; total: number }> }) {
  return (
    <div role="radiogroup" aria-label="What to memorize" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {courses.map((c) => {
        const n = courseItems(c).length;
        return (
          <button key={c.id} type="button" role="radio" aria-checked={value === c.id} className="hr-choice"
            onClick={() => onChange(c.id)} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontWeight: 600 }}>{c.title}</span>
            <span style={{ fontSize: 15, color: 'var(--muted)', fontWeight: 400 }}>{c.blurb} {isVerse(courseItems(c)[0]) ? `${n} verses.` : c.id === 'creeds' ? `${n} sections.` : n >= 107 ? `All ${n} questions.` : `Questions 1–${n} so far.`}</span>
            {progress?.[c.id] && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, width: '100%' }}>
                <span className="hr-progress" style={{ background: 'var(--well)', height: 6, flex: 1 }} aria-hidden="true"><span style={{ width: `${Math.round((progress[c.id].learned / progress[c.id].total) * 100)}%` }} /></span>
                <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{progress[c.id].learned ? `${progress[c.id].learned} of ${progress[c.id].total} learned` : 'Not started'}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

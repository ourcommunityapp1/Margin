import { LessonRunner } from '../ui/lesson';

export default async function LessonPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const mode = q.mode === 'review' ? 'review' : q.mode === 'rise' ? 'rise' : q.mode === 'night' ? 'night' : 'lesson';
  // Before sleep the screen stays dark, whatever the hour: less light, easier sleep.
  if (mode === 'night') return <div className="hr hr-dark-shell" data-time="night" data-theme="dark"><LessonRunner mode="night" /></div>;
  return <LessonRunner mode={mode} />;
}

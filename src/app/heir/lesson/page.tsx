import { LessonRunner } from '../ui/lesson';

export default async function LessonPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const item = typeof q.item === 'string' ? q.item : undefined;
  const ids = typeof q.items === 'string' ? q.items.split(',').filter((s) => /^[A-Za-z0-9._#-]{1,40}$/.test(s)).slice(0, 40) : [];
  const mode = q.mode === 'keep' && ids.length ? 'keep' : q.mode === 'item' && item ? 'item' : q.mode === 'review' ? 'review' : q.mode === 'rise' ? 'rise' : q.mode === 'night' ? 'night' : 'lesson';
  // Before sleep the screen stays dark, whatever the hour: less light, easier sleep.
  if (mode === 'night') return <div className="hr hr-dark-shell" data-time="night" data-theme="dark"><LessonRunner mode="night" /></div>;
  return <LessonRunner mode={mode} itemId={item} itemIds={ids} />;
}

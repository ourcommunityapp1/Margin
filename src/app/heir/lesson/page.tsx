import { LessonRunner } from '../ui/lesson';

export default async function LessonPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  return <LessonRunner mode={q.mode === 'review' ? 'review' : q.mode === 'rise' ? 'rise' : 'lesson'} />;
}

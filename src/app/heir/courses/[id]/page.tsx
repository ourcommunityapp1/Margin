import { notFound } from 'next/navigation';
import { courses, getCourse } from '@/heir/content';
import { CourseScreen } from '../../ui/course-list';

export function generateStaticParams() {
  return courses.map((c) => ({ id: c.id }));
}

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getCourse(id)) notFound();
  return <CourseScreen id={id} />;
}

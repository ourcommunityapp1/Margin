import { PlanScreen } from '../ui/plan';

export default async function PlanPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  return <PlanScreen setup={q.setup === '1'} />;
}

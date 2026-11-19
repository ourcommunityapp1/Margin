import { FamilyScreen } from '../ui/family';

// In Next 16, search params arrive as a promise.
export default async function FamilyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  return <FamilyScreen setup={q.setup === '1'} />;
}

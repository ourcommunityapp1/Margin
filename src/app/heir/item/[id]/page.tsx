import { notFound } from 'next/navigation';
import { allItems, getCollection, getItem } from '@/heir/content';
import { ItemScreen } from '../../ui/item';

export function generateStaticParams() {
  return allItems().map((i) => ({ id: i.id }));
}

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = getItem(id);
  if (!item) notFound();
  const c = getCollection(item.collection)!;
  return <ItemScreen item={item} collectionTitle={c.title} unit={c.unit} />;
}

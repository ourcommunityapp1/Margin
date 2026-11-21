import { redirect } from 'next/navigation';

// "When you lie down" runs in the normal lesson screen.
export default function NightPage() {
  redirect('/heir/lesson?mode=night');
}

// The time of day decides the background and whether the bedtime review is offered.

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

export function timeOfDay(date: Date): TimeOfDay {
  const h = date.getHours();
  if (h >= 5 && h < 9) return 'dawn';
  if (h >= 9 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'dusk';
  return 'night';
}

export function greeting(t: TimeOfDay): string {
  return t === 'dawn' ? 'Good morning' : t === 'day' ? 'Good afternoon' : t === 'dusk' ? 'Good evening' : 'Good night';
}

export function dayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

// The church year's two great seasons, for putting a seasonal course first while it's in season.

const DAY = 86_400_000;
const at = (y: number, m: number, d: number) => new Date(y, m, d);

/** The first Sunday of Advent: four Sundays before Christmas. */
export function adventSunday(year: number): Date {
  const christmas = at(year, 11, 25);
  const back = christmas.getDay() === 0 ? 7 : christmas.getDay(); // the Sunday before Christmas Day
  return at(year, 11, 25 - back - 21);
}

/** Easter Sunday (Gregorian calendar; the anonymous algorithm). */
export function easterSunday(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1, day = ((h + l - 7 * m + 114) % 31) + 1;
  return at(year, month, day);
}

export type Season = 'christmas' | 'easter';

const fmt = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

/** If `season` is in season on `now`: a short label for it ("Advent starts Sunday", "Advent", "Lent"); else null.
 * Christmas: from a week before Advent to Epiphany (6 January). Easter: from Ash Wednesday to a week after Easter. */
export function seasonLabel(season: Season, now: Date): string | null {
  const today = at(now.getFullYear(), now.getMonth(), now.getDate());
  if (season === 'christmas') {
    for (const y of [today.getFullYear() - 1, today.getFullYear()]) {
      const advent = adventSunday(y), from = new Date(advent.getTime() - 7 * DAY), to = at(y + 1, 0, 6);
      if (today < from || today > to) continue;
      if (today < advent) return (advent.getTime() - today.getTime()) / DAY <= 7 ? 'Advent starts Sunday' : `Advent starts ${fmt(advent)}`;
      return today < at(y, 11, 25) ? 'Advent' : 'Christmas';
    }
    return null;
  }
  const easter = easterSunday(today.getFullYear());
  const ash = new Date(easter.getTime() - 46 * DAY), to = new Date(easter.getTime() + 7 * DAY);
  if (today < ash || today > to) return null;
  if (today < new Date(easter.getTime() - 7 * DAY)) return 'Lent';
  return today < easter ? 'Holy Week' : 'Easter';
}

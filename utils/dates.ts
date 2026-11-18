/**
 * Dates of a stay, as the website's calendar handles them: a day is a night, written Y-m-d and built at local noon
 * (never toISOString(), which gives the day before in Morocco in the morning).
 */

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** "2026-11-18" → that day at noon (local time) */
export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function atNoon(d: Date): Date {
  const n = new Date(d);
  n.setHours(12, 0, 0, 0);
  return n;
}

export function addDays(d: Date, days: number): Date {
  const n = atNoon(d);
  n.setDate(n.getDate() + days);
  return n;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Nights between two days (the return day is not charged) */
export function nightsBetween(start: Date, end: Date): number {
  return Math.round((atNoon(end).getTime() - atNoon(start).getTime()) / 86_400_000);
}

/** The days of a month in weeks starting on Monday (null: before the 1st / after the last day) */
export function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1, 12, 0, 0, 0);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: offset }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d, 12, 0, 0, 0));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * The last day that can end a stay starting on `start`: the first taken day after it (the car is handed back that
 * morning, before the next customer takes it), or null when nothing is taken later.
 */
export function returnLimit(start: Date, taken: ReadonlySet<string>, horizonDays = 400): Date | null {
  for (let i = 1; i <= horizonDays; i++) {
    const day = addDays(start, i);
    if (taken.has(toIsoDate(day))) return day;
  }
  return null;
}

/** No night of the stay [start, end) is taken */
export function stayIsFree(start: Date, end: Date, taken: ReadonlySet<string>): boolean {
  for (let day = atNoon(start); day < atNoon(end); day = addDays(day, 1)) {
    if (taken.has(toIsoDate(day))) return false;
  }
  return true;
}

/** The first free stay of `nights` nights from `from` on (within a year), for a calendar opened on a busy car */
export function firstFreeStay(from: Date, nights: number, taken: ReadonlySet<string>): { start: Date; end: Date } {
  for (let i = 0; i < 366; i++) {
    const start = addDays(from, i);
    const end = addDays(start, nights);
    if (stayIsFree(start, end, taken)) return { start, end };
  }
  return { start: atNoon(from), end: addDays(from, nights) };
}

/** Short names of the days of the week, Monday first, in the given language (Intl) */
export function weekdayNames(locale: string): string[] {
  // 2024-01-01 was a Monday
  return Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i, 12).toLocaleDateString(locale, { weekday: 'short' }).replace('.', ''),
  );
}

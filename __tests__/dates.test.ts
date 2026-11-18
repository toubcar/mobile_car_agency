import { addDays, firstFreeStay, fromIsoDate, monthGrid, nightsBetween, returnLimit, stayIsFree, toIsoDate } from '@/utils/dates';

const taken = new Set(['2026-12-10', '2026-12-11', '2026-12-12']);

describe('dates of a stay (same rules as the website calendar)', () => {
  it('writes and reads Y-m-d days at local noon, never the day before', () => {
    const day = fromIsoDate('2026-12-01');
    expect(day.getHours()).toBe(12);
    expect(toIsoDate(day)).toBe('2026-12-01');
    expect(toIsoDate(addDays(day, 31))).toBe('2027-01-01');
  });

  it('counts nights: the return day is not charged', () => {
    expect(nightsBetween(fromIsoDate('2026-12-01'), fromIsoDate('2026-12-04'))).toBe(3);
  });

  it('lets the first taken day after the start be the return day, not later ones', () => {
    expect(toIsoDate(returnLimit(fromIsoDate('2026-12-05'), taken)!)).toBe('2026-12-10');
    expect(returnLimit(fromIsoDate('2026-12-13'), taken)).toBeNull();
  });

  it('accepts a stay ending on a taken day, refuses one crossing it', () => {
    expect(stayIsFree(fromIsoDate('2026-12-05'), fromIsoDate('2026-12-10'), taken)).toBe(true);
    expect(stayIsFree(fromIsoDate('2026-12-05'), fromIsoDate('2026-12-11'), taken)).toBe(false);
    expect(stayIsFree(fromIsoDate('2026-12-12'), fromIsoDate('2026-12-14'), taken)).toBe(false);
  });

  it('finds the first free stay of the same length', () => {
    const free = firstFreeStay(fromIsoDate('2026-12-09'), 2, taken);
    expect(toIsoDate(free.start)).toBe('2026-12-13');
    expect(toIsoDate(free.end)).toBe('2026-12-15');
  });

  it('lays a month out in weeks starting on Monday', () => {
    const grid = monthGrid(2026, 11); // December 2026 starts on a Tuesday
    expect(grid[0]).toBeNull();
    expect(toIsoDate(grid[1]!)).toBe('2026-12-01');
    expect(grid.length % 7).toBe(0);
  });
});

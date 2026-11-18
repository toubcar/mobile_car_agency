import { estimateRentalTotal, rentalDays } from '@/utils/rental';

describe('rentalDays', () => {
  it('matches Laravel diffInDays for multi-day range', () => {
    expect(rentalDays('2026-05-01', '2026-05-04')).toBe(3);
  });

  it('returns 0 when end is before or equal to start', () => {
    expect(rentalDays('2026-05-10', '2026-05-10')).toBe(0);
    expect(rentalDays('2026-05-10', '2026-05-08')).toBe(0);
  });
});

describe('estimateRentalTotal', () => {
  it('computes price_per_day × days like BookingController', () => {
    expect(estimateRentalTotal(5000, '2026-05-01', '2026-05-04')).toBe(15000);
  });
});

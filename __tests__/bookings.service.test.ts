import { bookingsService } from '@/services/bookings.service';
import apiClient from '@/services/api';

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('bookingsService.getQuote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parse la réponse API du devis', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        data: {
          car_id: 5,
          start_date: '2026-06-01',
          end_date: '2026-06-04',
          days: 3,
          price_per_day: 5000,
          total_price: 15000,
        },
      },
    });

    const quote = await bookingsService.getQuote({
      car_id: 5,
      start_date: '2026-06-01',
      end_date: '2026-06-04',
    });

    expect(apiClient.get).toHaveBeenCalledWith('/bookings/quote', {
      params: { car_id: 5, start_date: '2026-06-01', end_date: '2026-06-04' },
    });
    expect(quote).toEqual({
      car_id: 5,
      start_date: '2026-06-01',
      end_date: '2026-06-04',
      days: 3,
      price_per_day: 5000,
      total_price: 15000,
    });
  });
});

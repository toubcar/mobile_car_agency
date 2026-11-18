import apiClient from './api';

export const pricingService = {
  async updateCarPrice(payload: {
    car_id: number;
    price_per_day: number;
    reason: string;
    seasonal_multiplier?: number;
  }): Promise<{ id: number; brand: string; model: string; old_price: number; price_per_day: number }> {
    const { data } = await apiClient.patch<{ data: { id: number; brand: string; model: string; old_price: number; price_per_day: number } }>(
      '/agence/pricing/car-price',
      payload,
    );
    return data.data;
  },
};

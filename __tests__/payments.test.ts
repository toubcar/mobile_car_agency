jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn() }));
jest.mock('expo-linking', () => ({ createURL: jest.fn(() => 'toubcar://payment-return') }));
jest.mock('@/services/bookings.service', () => ({
  bookingsService: { startPayment: jest.fn(), capturePayment: jest.fn() },
}));

import * as WebBrowser from 'expo-web-browser';
import { bookingsService } from '@/services/bookings.service';
import { minutesLeftToPay, outcomeFromUrl, payBooking } from '@/utils/payments';

describe('PayPal in the app', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (bookingsService.startPayment as jest.Mock).mockResolvedValue({ approve_url: 'https://paypal.test/approve', order_id: 'X', amount: 90, currency: 'EUR', amount_mad: 990 });
  });

  it('reads the result the server writes in the return address', () => {
    expect(outcomeFromUrl('toubcar://payment-return?status=paid&booking=12')).toBe('paid');
    expect(outcomeFromUrl('exp://192.168.1.2:8081/--/payment-return?booking=12&status=cancelled')).toBe('cancelled');
    expect(outcomeFromUrl('toubcar://payment-return?status=other')).toBeNull();
    expect(outcomeFromUrl(undefined)).toBeNull();
  });

  it('opens PayPal with the app as return address and trusts a paid return', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({ type: 'success', url: 'toubcar://payment-return?status=paid&booking=7' });

    await expect(payBooking(7)).resolves.toBe('paid');
    expect(bookingsService.startPayment).toHaveBeenCalledWith(7, 'toubcar://payment-return');
    expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith('https://paypal.test/approve', 'toubcar://payment-return');
    expect(bookingsService.capturePayment).not.toHaveBeenCalled();
  });

  it('asks the server when the browser was closed before coming back', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({ type: 'dismiss' });
    (bookingsService.capturePayment as jest.Mock).mockResolvedValueOnce({ status: 'paid', booking_status: 'active' });
    await expect(payBooking(7)).resolves.toBe('paid');

    (bookingsService.capturePayment as jest.Mock).mockRejectedValueOnce(new Error('not approved'));
    await expect(payBooking(7)).resolves.toBe('cancelled');
  });

  it('counts the minutes left to pay', () => {
    const now = Date.parse('2026-12-01T10:00:00Z');
    expect(minutesLeftToPay('2026-12-01T10:14:10Z', now)).toBe(15);
    expect(minutesLeftToPay('2026-12-01T09:59:00Z', now)).toBe(0);
    expect(minutesLeftToPay(null, now)).toBe(0);
  });
});

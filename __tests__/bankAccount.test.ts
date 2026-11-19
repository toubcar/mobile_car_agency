import { isValidAccountNumber, normalizeAccountNumber } from '@/utils/bankAccount';

// The IBAN registry's Moroccan example: MA64 0115 1900 0001 2050 0053 4921
const RIB = '011519000001205000534921';

describe('isValidAccountNumber (same check as the website)', () => {
  it('accepts a RIB whose key is right, with or without spaces', () => {
    expect(isValidAccountNumber(RIB)).toBe(true);
    expect(isValidAccountNumber('011 519 0000012050005349 21')).toBe(true);
  });

  it('accepts the IBAN of the same account and other IBANs', () => {
    expect(isValidAccountNumber('MA64 0115 1900 0001 2050 0053 4921')).toBe(true);
    expect(isValidAccountNumber('FR14 2004 1010 0505 0001 3M02 606')).toBe(true);
  });

  it('refuses a mistyped digit, a wrong check number or a short number', () => {
    expect(isValidAccountNumber('011519000001205000534922')).toBe(false);
    expect(isValidAccountNumber('MA65011519000001205000534921')).toBe(false);
    expect(isValidAccountNumber('12345')).toBe(false);
  });

  it('normalizes what was typed', () => {
    expect(normalizeAccountNumber('ma64 0115-1900.0001')).toBe('MA6401151900' + '0001');
  });
});

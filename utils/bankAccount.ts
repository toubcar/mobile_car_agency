/**
 * The number of the bank account an agency is paid on, checked as on the website (App\Support\BankAccountNumber):
 * a Moroccan RIB (24 digits whose key makes the number a multiple of 97) or an IBAN (modulo 97 equal to 1).
 */

/** Without spaces, dots or dashes, letters in capitals */
export function normalizeAccountNumber(value: string): string {
  return value.replace(/[\s.\-]+/g, '').toUpperCase();
}

function mod97(digits: string): number {
  let rest = 0;
  for (let i = 0; i < digits.length; i += 7) {
    rest = Number(String(rest) + digits.slice(i, i + 7)) % 97;
  }
  return rest;
}

export function isValidAccountNumber(value: string): boolean {
  const number = normalizeAccountNumber(value);
  if (/^\d{24}$/.test(number)) return mod97(number) === 0;
  if (/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(number)) {
    if (number.startsWith('MA') && number.length !== 28) return false;
    const moved = number.slice(4) + number.slice(0, 4);
    const digits = moved.replace(/[A-Z]/g, (letter) => String(letter.charCodeAt(0) - 55));
    return mod97(digits) === 1;
  }
  return false;
}

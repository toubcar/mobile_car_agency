import { jsLocale } from '@/i18n';
/** Devise affichée dans l'app — dirham marocain (DH). */
export const CURRENCY_CODE = 'DH';

/** Suffixe tarif journalier véhicule */
export const CURRENCY_PER_DAY = 'DH/j';

/**
 * Montant numérique sûr (null, undefined, chaîne vide → 0).
 * Les montants financiers viennent toujours du backend ; ce helper ne calcule pas de prix.
 */
export function toAmount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Affichage complet : 12 345,67 DH */
export function formatMoney(value: unknown, options?: { decimals?: number; suffix?: boolean }): string {
  const { decimals = 0, suffix = true } = options ?? {};
  const amount = toAmount(value);
  const formatted = amount.toLocaleString(jsLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return suffix ? `${formatted} ${CURRENCY_CODE}` : formatted;
}

/**
 * Abrégé pour les KPI compacts (≥ 1 M → 1,2M ; ≥ 1 k → 12,3k).
 * À utiliser uniquement en complément d'un libellé ; la carte détail doit utiliser formatMoney.
 */
export function formatMoneyCompact(value: unknown): string {
  const amount = toAmount(value);
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toLocaleString(jsLocale(), { maximumFractionDigits: 1 })}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toLocaleString(jsLocale(), { maximumFractionDigits: 1 })}k`;
  }
  return amount.toLocaleString(jsLocale(), { maximumFractionDigits: 0 });
}

/** Pourcentage 0–100 (arrondi entier, plafonné). */
export function percentOf(part: unknown, total: unknown, cap = 100): number {
  const t = toAmount(total);
  if (t <= 0) return 0;
  return Math.min(cap, Math.round((toAmount(part) / t) * 100));
}

/** Prix par jour : 12 345 DH/j */
export function formatMoneyPerDay(value: unknown): string {
  return `${formatMoney(value, { suffix: false })} ${CURRENCY_PER_DAY}`;
}

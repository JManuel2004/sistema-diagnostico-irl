/** Dates and numbers as the product shows them (Colombian Spanish). */
const LOCALE = 'es-CO';

/** «22 de septiembre de 2026, 7:30 p. m.»: a saved result or an accepted consent. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(LOCALE, { dateStyle: 'long', timeStyle: 'short' });
}

/** «3,5»: one decimal with a comma; an exact integer goes without decimals. */
export function formatOneDecimal(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

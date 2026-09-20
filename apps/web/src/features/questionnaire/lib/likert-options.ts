import type { LikertValue } from '@innlab/contracts';

/** La escala Likert 1..5 con el texto de cada nivel; la usan la escala y el resumen. */
export const LIKERT_OPTIONS: readonly { value: LikertValue; label: string }[] = [
  { value: 1, label: 'Totalmente en desacuerdo' },
  { value: 2, label: 'En desacuerdo' },
  { value: 3, label: 'Ni de acuerdo ni en desacuerdo' },
  { value: 4, label: 'De acuerdo' },
  { value: 5, label: 'Totalmente de acuerdo' },
];

/** «4 — De acuerdo». */
export function likertText(value: LikertValue): string {
  const option = LIKERT_OPTIONS.find((o) => o.value === value);
  return `${String(value)} — ${option?.label ?? ''}`;
}

/**
 * KTH IRL conversion table — Annex A.
 *
 * Maps the average Likert value of a dimension (1.00–5.00) to its IRL level
 * (1–9). Authoritative source: "Cuestionario KTH Innovation Readiness Level™
 * — Herramienta de Diagnóstico Multidimensional para Productos y Servicios
 * Digitales", InnLab · Universidad Icesi, v1.0 (2025), Section 5 / Annex A.
 *
 * The KTH IRL framework itself is licensed under CC BY-NC-SA 4.0 by KTH
 * Innovation.
 *
 * Domain invariants enforced by the migration (SA-06):
 *   - `nivel_irl` is an integer in [1, 9].
 *   - `avg_min`, `avg_max` are numeric(3,2) in [1, 5].
 *   - `avg_min <= avg_max`.
 *
 * Coverage invariants enforced by these data (not by the DB):
 *   - The nine ranges are contiguous: each `avg_max` and the next `avg_min`
 *     differ by exactly 0.01.
 *   - The union of all ranges covers `[1.00, 5.00]` with no gaps.
 *   - Likert averages obtained from 8 integer answers are always multiples
 *     of 0.125 and therefore always fall strictly inside one range — never
 *     on a boundary that two ranges share.
 *
 * NOTE: `nivel_irl` is the natural primary key — do NOT introduce a
 * surrogate. INSERTs include `nivel_irl` explicitly.
 */
export interface ConversionRangeSeed {
  readonly nivelIrl: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  readonly avgMin: number;
  readonly avgMax: number;
}

export const CONVERSION_RANGES: readonly ConversionRangeSeed[] = [
  { nivelIrl: 1, avgMin: 1.0, avgMax: 1.39 },
  { nivelIrl: 2, avgMin: 1.4, avgMax: 1.79 },
  { nivelIrl: 3, avgMin: 1.8, avgMax: 2.19 },
  { nivelIrl: 4, avgMin: 2.2, avgMax: 2.59 },
  { nivelIrl: 5, avgMin: 2.6, avgMax: 2.99 },
  { nivelIrl: 6, avgMin: 3.0, avgMax: 3.39 },
  { nivelIrl: 7, avgMin: 3.4, avgMax: 3.79 },
  { nivelIrl: 8, avgMin: 3.8, avgMax: 4.39 },
  { nivelIrl: 9, avgMin: 4.4, avgMax: 5.0 },
];

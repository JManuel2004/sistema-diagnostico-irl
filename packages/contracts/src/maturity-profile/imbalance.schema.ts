import { z } from 'zod';
import { dimensionCodeSchema } from '../catalog/dimension.schema.js';

/**
 * Clasificación del desequilibrio entre dos dimensiones (RF-10):
 *
 *   - `critical`    — diferencia > 3 niveles IRL
 *   - `moderate`    — diferencia de 2 o 3 niveles IRL
 *   - `acceptable`  — diferencia < 2 niveles IRL
 *
 * Los thresholds son del marco KTH y no son negociables. El frontend
 * usa la clasificación para decidir color/ícono/texto en la lista de
 * desequilibrios (HU-15).
 */
export const imbalanceClassificationSchema = z
  .enum(['critical', 'moderate', 'acceptable'])
  .describe('Clasificación del desequilibrio entre un par de dimensiones');

export type ImbalanceClassification = z.infer<typeof imbalanceClassificationSchema>;

/**
 * Las seis duplas evaluadas para desequilibrio según el marco KTH —
 * el sistema **siempre** evalúa estas y solo estas (CLAUDE.md §
 * "Non-negotiable domain facts").
 */
export const IMBALANCE_PAIRS = [
  ['TRL', 'CRL'],
  ['TRL', 'BRL'],
  ['CRL', 'BRL'],
  ['TmRL', 'FRL'],
  ['BRL', 'IPRL'],
  ['TRL', 'IPRL'],
] as const;

/**
 * Resultado de evaluar una dupla de dimensiones para desequilibrio.
 *
 * Convención de orden: `(left, right)` siguen el orden listado en
 * `IMBALANCE_PAIRS`. La función `diff(leftLevel, rightLevel)` del
 * marco es order-insensitive (`abs(a - b)`), pero estabilizar el orden
 * en el contrato facilita el match en pruebas y en la UI.
 */
export const imbalancePairResultSchema = z
  .object({
    left: dimensionCodeSchema,
    right: dimensionCodeSchema,
    difference: z
      .number()
      .int()
      .min(0)
      .max(8)
      .describe('Diferencia absoluta entre niveles IRL del par'),
    classification: imbalanceClassificationSchema,
  })
  .describe('Resultado del análisis de desequilibrio para un par de dimensiones');

export type ImbalancePairResult = z.infer<typeof imbalancePairResultSchema>;

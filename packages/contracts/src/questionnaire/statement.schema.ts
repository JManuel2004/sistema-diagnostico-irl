import { z } from 'zod';
import { dimensionCodeSchema } from '../catalog/dimension.schema.js';

/**
 * Una afirmación del cuestionario IRL.
 *
 * Invariantes del marco KTH:
 *   - Cada dimensión contiene exactamente 8 afirmaciones (RF-05).
 *   - El total a lo largo de las 6 dimensiones es 48.
 *   - `sequence` es la posición dentro de la dimensión (1–8), no
 *     un índice global.
 *
 * El texto viene en español (campo `texto_es` en la tabla `afirmacion`).
 *
 * `id` es el bigint de la PK (`id_afirmacion`) serializado como string.
 * No es un UUID — la tabla usa GENERATED ALWAYS AS IDENTITY.
 */
export const statementSchema = z
  .object({
    id: z.string().min(1).describe('Identificador único de la afirmación (bigint como string)'),
    dimensionCode: dimensionCodeSchema,
    sequence: z.number().int().min(1).max(8).describe('Posición dentro de la dimensión: 1–8'),
    text: z.string().min(1).describe('Texto de la afirmación en español'),
  })
  .describe('Una afirmación del cuestionario (irl_catalog.afirmacion)');

export type Statement = z.infer<typeof statementSchema>;

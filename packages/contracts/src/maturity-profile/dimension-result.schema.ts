import { z } from 'zod';
import { dimensionCodeSchema } from '../catalog/dimension.schema.js';

/**
 * Resultado por dimensión dentro del perfil de madurez (RF-07).
 *
 * Pipeline de cálculo (`IrlCalculatorService` en el backend):
 *   1. Promediar los 8 valores Likert de la dimensión.
 *   2. Buscar el `irlLevel` en `rango_conversion` (tabla SA-06) que
 *      contenga ese promedio.
 *   3. Empaquetar promedio + nivel en este resultado.
 *
 * El `name` se incluye para que el frontend pueda renderizar el
 * resultado sin hacer una segunda llamada al catálogo (HU-13/14).
 */
export const dimensionResultSchema = z
  .object({
    dimensionCode: dimensionCodeSchema,
    name: z.string().min(1).describe('Nombre completo de la dimensión en español'),
    averageLikert: z
      .number()
      .min(1)
      .max(5)
      .describe('Promedio de las 8 respuestas Likert de la dimensión (1.00–5.00)'),
    irlLevel: z
      .number()
      .int()
      .min(1)
      .max(9)
      .describe('Nivel IRL resultante (1–9) según tabla SA-06'),
  })
  .describe('Resultado de una dimensión IRL en un perfil de madurez');

export type DimensionResult = z.infer<typeof dimensionResultSchema>;

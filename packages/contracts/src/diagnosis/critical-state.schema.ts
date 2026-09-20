import { z } from 'zod';
import { dimensionCodeSchema } from '../irl-taxonomy/dimension.schema.js';

/**
 * Estado crítico del perfil (RF-13).
 *
 * Solo CRL, BRL y TmRL pueden estar en estado crítico, y lo están cuando su
 * nivel IRL está en brecha. Se calcula en el backend
 * (`MaturityProfile.criticalState()`); el cliente solo lo muestra.
 */
export const criticalStateSchema = z
  .object({
    dimensions: z
      .array(dimensionCodeSchema)
      .describe('Dimensiones en estado crítico (una brecha en CRL, BRL o TmRL)'),
  })
  .describe('Dimensiones en estado crítico del perfil de madurez');

export type CriticalState = z.infer<typeof criticalStateSchema>;

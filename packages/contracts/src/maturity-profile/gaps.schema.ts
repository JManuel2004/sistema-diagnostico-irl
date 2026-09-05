import { z } from 'zod';
import { dimensionCodeSchema } from '../catalog/dimension.schema.js';

/**
 * Umbral IRL de brecha (RF-14 / estado crítico por dimensión).
 *
 * Una dimensión está en brecha cuando su nivel IRL es menor o igual
 * a este valor. La constante vive en el contrato para que API y SPA
 * no inventen el número; la evaluación la hace el backend.
 */
export const CRITICAL_IRL_THRESHOLD = 3;

/**
 * Dimensiones en brecha del perfil — aquellas con `irlLevel` ≤ umbral.
 *
 * A diferencia del cuello de botella, el array **puede ir vacío**: un
 * perfil con todos los niveles por encima del umbral no tiene brecha.
 * El frontend no debe recalcular este conjunto a partir de `irlLevel`.
 */
export const gapsSchema = z
  .object({
    dimensions: z
      .array(dimensionCodeSchema)
      .describe('Dimensiones cuyo nivel IRL está en o por debajo del umbral de brecha'),
    threshold: z
      .number()
      .int()
      .min(1)
      .max(9)
      .describe('Umbral IRL de brecha aplicado al calcular este snapshot'),
  })
  .describe('Brechas dimensionales del perfil de madurez (IRL ≤ umbral)');

export type Gaps = z.infer<typeof gapsSchema>;

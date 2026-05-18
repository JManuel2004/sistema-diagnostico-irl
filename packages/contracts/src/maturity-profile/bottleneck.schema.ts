import { z } from 'zod';
import { dimensionCodeSchema } from '../catalog/dimension.schema.js';

/**
 * Cuello de botella del perfil — la(s) dimensión(es) con el nivel IRL
 * más bajo (RF-08).
 *
 * El backlog (HU-12) demanda **manejar empates**: si varias dimensiones
 * comparten el mínimo, todas se reportan. Por eso `dimensions` es un
 * array — el frontend nunca debe asumir tamaño 1.
 *
 * `level` es el nivel compartido por las dimensiones empatadas.
 */
export const bottleneckSchema = z
  .object({
    dimensions: z
      .array(dimensionCodeSchema)
      .min(1)
      .describe('Dimensión(es) con el nivel IRL mínimo del perfil'),
    level: z
      .number()
      .int()
      .min(1)
      .max(9)
      .describe('Nivel IRL común a todas las dimensiones del cuello de botella'),
  })
  .describe('Cuello de botella del perfil de madurez (RF-08)');

export type Bottleneck = z.infer<typeof bottleneckSchema>;

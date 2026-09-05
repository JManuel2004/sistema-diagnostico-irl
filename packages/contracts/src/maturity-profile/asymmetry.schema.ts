import { z } from 'zod';
import { imbalanceClassificationSchema } from './imbalance.schema.js';

/**
 * Asimetría del perfil: diferencia entre el nivel IRL más alto y el más
 * bajo, clasificada con los umbrales KTH de desequilibrio.
 *
 * Lo calcula el backend a partir de los niveles persistidos. El cliente
 * no debe derivar esta diferencia ni su clasificación.
 */
export const asymmetrySchema = z
  .object({
    difference: z
      .number()
      .int()
      .min(0)
      .max(8)
      .describe('Diferencia absoluta entre el IRL máximo y el mínimo del perfil'),
    classification: imbalanceClassificationSchema,
  })
  .describe('Asimetría del perfil de madurez');

export type Asymmetry = z.infer<typeof asymmetrySchema>;

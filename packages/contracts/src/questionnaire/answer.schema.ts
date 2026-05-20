import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';
import { likertValueSchema } from './likert.schema.js';

/**
 * Una respuesta individual del cuestionario.
 *
 * `statementId` es el bigint PK de `irl_catalog.afirmacion` serializado
 * como string (TypeORM retorna columnas bigint como string). NO es un UUID.
 */
export const answerItemSchema = z
  .object({
    id: uuidSchema.optional().describe('ID del registro persistido (solo al leer)'),
    statementId: z.string().min(1).describe('ID de la afirmación (bigint como string)'),
    value: likertValueSchema,
  })
  .describe('Una respuesta a una afirmación del cuestionario');

export type AnswerItem = z.infer<typeof answerItemSchema>;

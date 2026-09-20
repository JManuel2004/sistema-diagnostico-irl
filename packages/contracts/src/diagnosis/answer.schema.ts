import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';
import { likertValueSchema } from './likert.schema.js';

/** Máximo de caracteres de la justificación de una respuesta. */
export const ANSWER_JUSTIFICATION_MAX = 1000;

/**
 * Una respuesta individual del cuestionario.
 *
 * `statementId` es el bigint PK de `irl_catalog.statement` serializado
 * como string (TypeORM retorna columnas bigint como string). NO es un UUID.
 *
 * `justification` es obligatoria: cada una de las 48 respuestas se guarda
 * con el porqué del nivel elegido.
 */
export const answerItemSchema = z
  .object({
    id: uuidSchema.optional().describe('ID del registro persistido (solo al leer)'),
    statementId: z.string().min(1).describe('ID de la afirmación (bigint como string)'),
    value: likertValueSchema,
    justification: z
      .string()
      .trim()
      .min(1, 'La justificación es obligatoria')
      .max(ANSWER_JUSTIFICATION_MAX, `La justificación no puede exceder ${String(ANSWER_JUSTIFICATION_MAX)} caracteres`)
      .describe('Por qué el usuario eligió ese nivel de conformidad'),
  })
  .describe('Una respuesta a una afirmación del cuestionario');

export type AnswerItem = z.infer<typeof answerItemSchema>;

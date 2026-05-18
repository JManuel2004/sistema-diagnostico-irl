import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';
import { likertValueSchema } from './likert.schema.js';

/**
 * Una respuesta individual del cuestionario.
 *
 * El shape se usa tanto al cargar un draft del backend (cada respuesta
 * trae su `id`) como al enviarlo (el cliente sólo aporta `statementId`
 * + `value`; el servidor asigna o reutiliza el `id`).
 *
 * El `id` es opcional porque el frontend nunca necesita conocerlo —
 * la unicidad útil es `(diagnosticId, statementId)` y eso está
 * garantizado por el constraint UNIQUE de la tabla `respuesta`.
 */
export const answerItemSchema = z
  .object({
    id: uuidSchema.optional().describe('ID del registro persistido (solo al leer)'),
    statementId: uuidSchema.describe('ID de la afirmación que se responde'),
    value: likertValueSchema,
  })
  .describe('Una respuesta a una afirmación del cuestionario');

export type AnswerItem = z.infer<typeof answerItemSchema>;

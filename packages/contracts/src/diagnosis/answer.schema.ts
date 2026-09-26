import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';
import { likertValueSchema } from './likert.schema.js';

/** Maximum number of characters of an answer's justification. */
export const ANSWER_JUSTIFICATION_MAX = 1000;

/**
 * A single answer of the questionnaire.
 *
 * `statementId` is the bigint PK of `irl_catalog.statement` serialized as a
 * string (TypeORM returns bigint columns as strings). It is NOT a UUID.
 *
 * `justification` is mandatory: each of the 48 answers is saved with the
 * reason for the chosen level.
 */
export const answerItemSchema = z
  .object({
    id: uuidSchema.optional().describe('ID of the persisted record (read only)'),
    statementId: z.string().min(1).describe('Statement ID (bigint as string)'),
    value: likertValueSchema,
    justification: z
      .string()
      .trim()
      .min(1, 'La justificación es obligatoria')
      .max(ANSWER_JUSTIFICATION_MAX, `La justificación no puede exceder ${String(ANSWER_JUSTIFICATION_MAX)} caracteres`)
      .describe('Why the user chose that level of agreement'),
  })
  .describe('An answer to a questionnaire statement');

export type AnswerItem = z.infer<typeof answerItemSchema>;

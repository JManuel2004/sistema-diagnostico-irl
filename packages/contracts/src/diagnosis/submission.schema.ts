import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';
import { answerItemSchema } from './answer.schema.js';

/**
 * Command that submits the whole questionnaire (HU-10 / RF-06).
 *
 * Exactly 48 answers — the domain rejects an incomplete submission; the
 * schema also fixes the size at the HTTP boundary.
 */
export const submitQuestionnaireSchema = z
  .object({
    diagnosticId: uuidSchema.describe('ID of the diagnostic being submitted'),
    answers: z.array(answerItemSchema).length(48).describe('Exactly 48 answers, one per statement'),
  })
  .describe('Command that submits the whole questionnaire (HU-10)');

export type SubmitQuestionnaireCommand = z.infer<typeof submitQuestionnaireSchema>;

/**
 * Successful submission response. The backend moves the diagnostic to
 * `QUESTIONNAIRE_COMPLETE` and returns a summary.
 */
export const submitQuestionnaireResponseSchema = z
  .object({
    diagnosticId: uuidSchema,
    answersRecorded: z.number().int().min(0).max(48),
    state: z.literal('QUESTIONNAIRE_COMPLETE').describe('New state of the diagnostic'),
  })
  .describe('Response to a successful questionnaire submission');

export type SubmitQuestionnaireResponse = z.infer<typeof submitQuestionnaireResponseSchema>;

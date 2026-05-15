import { z } from 'zod';
import { likertValueSchema } from './likert.schema.js';

/**
 * A single answer to a statement in the questionnaire.
 * Used both when saving drafts and when submitting final answers.
 */
export const answerItemSchema = z
  .object({
    statementId: z.string().uuid().describe('ID of the statement being answered'),
    value: likertValueSchema,
  })
  .describe('A single answer to a questionnaire statement');

export type AnswerItem = z.infer<typeof answerItemSchema>;

/**
 * Request payload for submitting the complete 48-answer questionnaire.
 * RF-06 enforces that exactly 48 answers with each value 1–5 must be present.
 */
export const submitQuestionnaireRequestSchema = z
  .object({
    diagnosticId: z.string().uuid().describe('The diagnostic being completed'),
    answers: z.array(answerItemSchema).length(48).describe('Exactly 48 answers, one per statement'),
  })
  .describe('Questionnaire submission request (HU-10)');

export type SubmitQuestionnaireRequest = z.infer<typeof submitQuestionnaireRequestSchema>;

/**
 * Response after questionnaire submission.
 * The backend triggers the maturity profile calculation synchronously.
 * This response confirms the submission and provides a summary.
 */
export const submitQuestionnaireResponseSchema = z
  .object({
    diagnosticId: z.string().uuid(),
    answersRecorded: z.number().int().min(48).max(48),
    state: z.enum(['CUESTIONARIO_COMPLETO']).describe('New state of the diagnostic'),
  })
  .describe('Questionnaire submission response');

export type SubmitQuestionnaireResponse = z.infer<typeof submitQuestionnaireResponseSchema>;

import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';
import { ANSWER_JUSTIFICATION_MAX } from './answer.schema.js';
import { likertValueSchema } from './likert.schema.js';

/**
 * One statement of the questionnaire draft: the level chosen, the
 * justification written, or both. Unlike a submitted answer, either may
 * be missing — the user may write why before choosing the level.
 */
export const draftEntrySchema = z
  .object({
    statementId: z.string().min(1).describe('Statement ID (bigint as string)'),
    value: likertValueSchema.nullable().describe('Level chosen; null while not chosen'),
    justification: z
      .string()
      .max(ANSWER_JUSTIFICATION_MAX)
      .nullable()
      .describe('Justification written so far; null when none'),
  })
  .describe('One statement of the questionnaire draft');

export type DraftEntry = z.infer<typeof draftEntrySchema>;

/**
 * Body of `PUT /diagnostics/:id/questionnaire/draft`: the whole draft,
 * which replaces the saved one. At most one entry per statement (48).
 */
export const saveQuestionnaireDraftRequestSchema = z
  .object({
    entries: z.array(draftEntrySchema).max(48),
  })
  .describe('The whole questionnaire draft');

export type SaveQuestionnaireDraftRequest = z.infer<typeof saveQuestionnaireDraftRequestSchema>;

/**
 * The questionnaire draft saved on the server for a diagnostic still being
 * answered. It survives closing the session: answering resumes from it on
 * any device. Only its owner can read it.
 *
 * Endpoint: `GET /api/v1/diagnostics/:id/questionnaire/draft`.
 */
export const questionnaireDraftSchema = z
  .object({
    diagnosticId: uuidSchema,
    entries: z.array(draftEntrySchema).max(48),
    updatedAt: z
      .string()
      .datetime()
      .nullable()
      .describe('When the draft was last saved; null while nothing was saved'),
  })
  .describe('Questionnaire draft saved on the server');

export type QuestionnaireDraft = z.infer<typeof questionnaireDraftSchema>;

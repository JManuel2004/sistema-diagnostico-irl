import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';
import { answerItemSchema } from './answer.schema.js';

/**
 * Comando de envío del cuestionario completo (HU-10 / RF-06).
 *
 * Exactamente 48 respuestas — el dominio rechaza un envío incompleto;
 * el esquema también fija el tamaño en el límite HTTP.
 */
export const submitQuestionnaireSchema = z
  .object({
    diagnosticId: uuidSchema.describe('ID del diagnóstico que se está enviando'),
    answers: z
      .array(answerItemSchema)
      .length(48)
      .describe('Exactamente 48 respuestas, una por afirmación'),
  })
  .describe('Comando para enviar el cuestionario completo (HU-10)');

export type SubmitQuestionnaireCommand = z.infer<typeof submitQuestionnaireSchema>;

/**
 * Respuesta exitosa del envío. El backend transiciona el diagnóstico
 * a `QUESTIONNAIRE_COMPLETE` y devuelve un resumen.
 */
export const submitQuestionnaireResponseSchema = z
  .object({
    diagnosticId: uuidSchema,
    answersRecorded: z.number().int().min(0).max(48),
    state: z.literal('QUESTIONNAIRE_COMPLETE').describe('Nuevo estado del diagnóstico'),
  })
  .describe('Respuesta al envío exitoso del cuestionario');

export type SubmitQuestionnaireResponse = z.infer<typeof submitQuestionnaireResponseSchema>;

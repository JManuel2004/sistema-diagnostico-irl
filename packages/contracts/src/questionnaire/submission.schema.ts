import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';
import { dimensionCodeSchema } from '../catalog/dimension.schema.js';
import { answerItemSchema } from './answer.schema.js';

/**
 * Comando de envío del cuestionario completo (HU-10 / RF-06).
 *
 * Exactamente 48 respuestas — el chequeo de completitud lo hace el
 * dominio del lado del servidor (`CompletenessChecker`), pero el
 * esquema rechaza tamaños diferentes en el límite HTTP para fallar
 * temprano y devolver un 400 antes de invocar el caso de uso.
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
 * Una afirmación pendiente, devuelta cuando el envío es rechazado por
 * incompletitud (RF-06). Refleja `CompletenessReport.missing` del
 * dominio. El cliente usa `dimensionCode` + `sequence` para navegar
 * al gap correspondiente en `IncompleteSubmitDialog`.
 */
export const missingStatementSchema = z
  .object({
    statementId: uuidSchema,
    dimensionCode: dimensionCodeSchema,
    sequence: z.number().int().min(1).max(8),
  })
  .describe('Una afirmación que aún no tiene respuesta');

export type MissingStatement = z.infer<typeof missingStatementSchema>;

/**
 * Respuesta exitosa del envío. El backend transiciona el diagnóstico
 * a `CUESTIONARIO_COMPLETO` y devuelve un resumen.
 */
export const submitQuestionnaireResponseSchema = z
  .object({
    diagnosticId: uuidSchema,
    answersRecorded: z.number().int().min(0).max(48),
    state: z.literal('CUESTIONARIO_COMPLETO').describe('Nuevo estado del diagnóstico'),
  })
  .describe('Respuesta al envío exitoso del cuestionario');

export type SubmitQuestionnaireResponse = z.infer<typeof submitQuestionnaireResponseSchema>;

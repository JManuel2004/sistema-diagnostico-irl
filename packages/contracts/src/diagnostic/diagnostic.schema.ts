import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';
import { answerItemSchema } from '../questionnaire/answer.schema.js';

/**
 * Estados del proceso de diagnóstico — máquina de estados que rige las
 * transiciones del agregado `Diagnostico`.
 *
 * Fuente autoritativa: el CHECK constraint `ck_diagnostico_estado` de
 * la tabla `irl_diagnostic.diagnostico` (migración inicial). La lista
 * de aquí debe coincidir exactamente con la de la BD — si se agrega
 * un nuevo estado, se hace primero la migración y luego este schema.
 *
 * Transiciones (lineales, no se saltan pasos):
 *   INICIADO
 *     → CON_CONSENTIMIENTO         (HU-05 / RF-03)
 *     → CON_INICIATIVA             (HU-06 / RF-04)
 *     → CUESTIONARIO_EN_CURSO      (HU-07)
 *     → CUESTIONARIO_COMPLETO      (HU-10 / RF-06)
 *     → PERFIL_GENERADO            (HU-11 / RF-07)
 *     → ANALISIS_PROFUNDO_DECLINADO | ANALISIS_PROFUNDO_EN_CURSO
 *          → ANALISIS_PROFUNDO_COMPLETO
 */
export const DIAGNOSTIC_STATES = [
  'INICIADO',
  'CON_CONSENTIMIENTO',
  'CON_INICIATIVA',
  'CUESTIONARIO_EN_CURSO',
  'CUESTIONARIO_COMPLETO',
  'PERFIL_GENERADO',
  'ANALISIS_PROFUNDO_DECLINADO',
  'ANALISIS_PROFUNDO_EN_CURSO',
  'ANALISIS_PROFUNDO_COMPLETO',
] as const;

export const diagnosticStateSchema = z
  .enum(DIAGNOSTIC_STATES)
  .describe('Estado actual de un diagnóstico');

export type DiagnosticState = z.infer<typeof diagnosticStateSchema>;

/**
 * Diagnóstico tal como lo expone la API.
 *
 * Endpoint principal: `GET /api/v1/diagnosticos/:id`.
 *
 * `userId` es opaco (lo emite Keycloak); el frontend lo usa solo para
 * comparar con el usuario actual y decidir si mostrar el diagnóstico.
 */
export const diagnosticSchema = z
  .object({
    id: uuidSchema,
    userId: z.string().min(1).describe('Identificador del usuario propietario'),
    state: diagnosticStateSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .describe('Diagnóstico (DTO de lectura)');

export type Diagnostic = z.infer<typeof diagnosticSchema>;

/**
 * Resumen liviano para listar diagnósticos del usuario (HU-03).
 * Misma forma que `diagnosticSchema` pero documentada como lista —
 * mantenerla aparte facilita evolucionar el resumen sin tocar el
 * detalle.
 */
export const diagnosticSummarySchema = diagnosticSchema.describe(
  'Resumen de un diagnóstico para la lista de "mis diagnósticos"',
);

export type DiagnosticSummary = z.infer<typeof diagnosticSummarySchema>;

/**
 * Respuesta del endpoint que inicia un nuevo diagnóstico (HU-04).
 *
 * `POST /api/v1/diagnosticos` no requiere body (la identidad sale del
 * JWT). Devuelve el diagnóstico recién creado en estado `INICIADO`.
 */
export const startDiagnosticResponseSchema = diagnosticSchema.describe(
  'Respuesta al iniciar un nuevo diagnóstico (HU-04)',
);

export type StartDiagnosticResponse = z.infer<typeof startDiagnosticResponseSchema>;

export const finalizeInitialDiagnosticRequestSchema = z
  .object({
    answers: z
      .array(answerItemSchema)
      .length(48)
      .describe('Exactamente 48 respuestas, una por afirmación'),
  })
  .describe('Comando para finalizar el diagnóstico inicial (envío + cálculo)');

export type FinalizeInitialDiagnosticRequest = z.infer<
  typeof finalizeInitialDiagnosticRequestSchema
>;

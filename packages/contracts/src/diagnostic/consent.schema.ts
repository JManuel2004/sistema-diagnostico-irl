import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';

/**
 * Versión vigente del texto de consentimiento (Ley 1581 de 2012).
 *
 * Cambia cuando legal aprueba un nuevo texto. El frontend lo lee del
 * endpoint público para mostrar el contenido exacto y para incluirlo
 * en la confirmación que se persiste — así la trazabilidad muestra
 * exactamente qué texto aceptó el usuario.
 */
export const consentVersionSchema = z
  .string()
  .regex(/^v\d+(\.\d+)*$/)
  .describe('Versión del texto de consentimiento (e.g. "v1", "v2.1")');

export type ConsentVersion = z.infer<typeof consentVersionSchema>;

/**
 * Comando para registrar el consentimiento del usuario (HU-05 / RF-03).
 *
 * `POST /api/v1/diagnosticos/:id/consentimiento`.
 *
 * Reglas:
 *   - `accepted` debe ser `true` — la API rechaza `false`. El usuario
 *     que no acepta simplemente no envía la petición.
 *   - `version` es la versión del texto mostrado al usuario, no la
 *     "actual del servidor"; el backend verifica que coincida con la
 *     vigente y rechaza con `CONSENT_VERSION_MISMATCH` si no.
 */
export const registerConsentSchema = z
  .object({
    accepted: z.literal(true).describe('Indicador explícito de aceptación — solo se acepta `true`'),
    version: consentVersionSchema,
  })
  .describe('Registro del consentimiento (HU-05)');

export type RegisterConsentCommand = z.infer<typeof registerConsentSchema>;

/**
 * Estado del consentimiento asociado a un diagnóstico.
 *
 * Endpoint: `GET /api/v1/diagnosticos/:id/consentimiento`.
 *
 * Cuando todavía no hay consentimiento registrado, el endpoint devuelve
 * 404 — el frontend lo interpreta como "necesitamos mostrar la pantalla
 * de términos". Si existe, se devuelve este shape con `acceptedAt`.
 */
export const consentRecordSchema = z
  .object({
    diagnosticId: uuidSchema,
    version: consentVersionSchema,
    acceptedAt: z.string().datetime(),
  })
  .describe('Consentimiento registrado para un diagnóstico');

export type ConsentRecord = z.infer<typeof consentRecordSchema>;

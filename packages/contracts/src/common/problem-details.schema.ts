import { z } from 'zod';

/**
 * RFC 7807 Problem Details for HTTP APIs.
 *
 * Cada respuesta de error del backend usa este shape (Content-Type
 * `application/problem+json`) — los filtros globales del backend
 * (`DomainExceptionFilter`, `ValidationExceptionFilter`,
 * `GlobalExceptionFilter`) lo producen, y el cliente lo parsea para
 * decidir cómo mostrar el error al usuario.
 *
 * El campo `code` es la extensión específica del proyecto: una clave
 * estable como `INVARIANT_VIOLATION`, `NOT_FOUND`,
 * `QUESTIONNAIRE_INCOMPLETE` (ver `apps/api/docs/error-codes.md`). El
 * frontend matchea sobre `code`, **nunca** sobre `title` o `detail` —
 * esos son texto libre traducible.
 */

/**
 * Un error de validación individual — usado en el array `errors` cuando
 * la falla es a nivel de campo (class-validator / Zod).
 */
export const problemValidationErrorSchema = z
  .object({
    field: z.string().optional().describe('Ruta del campo, e.g. "answers.42.value"'),
    message: z.string().describe('Mensaje legible del error de validación'),
    code: z.string().optional().describe('Código específico del error, si aplica'),
  })
  .describe('Error de validación a nivel de campo');

export type ProblemValidationError = z.infer<typeof problemValidationErrorSchema>;

export const problemDetailsSchema = z
  .object({
    type: z.string().url().describe('URI que identifica el tipo de problema (RFC 7807 §3.1)'),
    title: z.string().describe('Resumen corto del tipo de problema'),
    status: z.number().int().min(400).max(599).describe('Código HTTP'),
    detail: z.string().optional().describe('Explicación específica de esta ocurrencia'),
    instance: z.string().optional().describe('Ruta o ID que identifica la ocurrencia'),
    code: z
      .string()
      .describe('Código de error estable específico del proyecto, e.g. INVARIANT_VIOLATION'),
    correlationId: z.string().optional().describe('Correlation ID para trazar logs y soporte'),
    errors: z
      .array(problemValidationErrorSchema)
      .optional()
      .describe('Errores estructurados (típicamente de validación de campos)'),
  })
  .describe('Documento RFC 7807 con la extensión `code` del proyecto');

export type ProblemDetails = z.infer<typeof problemDetailsSchema>;

import { z } from 'zod';

/**
 * RFC 7807 Problem Details for HTTP APIs.
 *
 * Every error response of the backend uses this shape (Content-Type
 * `application/problem+json`) — the backend's global filters
 * (`DomainExceptionFilter`, `ValidationExceptionFilter`,
 * `GlobalExceptionFilter`) produce it, and the client parses it to decide
 * how to show the error to the user.
 *
 * The `code` field is the project-specific extension: a stable key such as
 * `INVARIANT_VIOLATION`, `NOT_FOUND` or `QUESTIONNAIRE_INCOMPLETE`. The
 * frontend matches on `code`, **never** on `title` or `detail` — those are
 * free, translatable text.
 */

/**
 * A single validation error — used in the `errors` array when the failure
 * is at field level (class-validator / Zod).
 */
export const problemValidationErrorSchema = z
  .object({
    field: z.string().optional().describe('Path of the field, e.g. "answers.42.value"'),
    message: z.string().describe('Readable message of the validation error'),
    code: z.string().optional().describe('Specific error code, if any'),
  })
  .describe('Field-level validation error');

export type ProblemValidationError = z.infer<typeof problemValidationErrorSchema>;

export const problemDetailsSchema = z
  .object({
    type: z.string().url().describe('URI that identifies the problem type (RFC 7807 §3.1)'),
    title: z.string().describe('Short summary of the problem type'),
    status: z.number().int().min(400).max(599).describe('HTTP status code'),
    detail: z.string().optional().describe('Explanation specific to this occurrence'),
    instance: z.string().optional().describe('Path or ID that identifies the occurrence'),
    code: z.string().describe('Stable project-specific error code, e.g. INVARIANT_VIOLATION'),
    correlationId: z.string().optional().describe('Correlation ID to trace logs and support'),
    errors: z
      .array(problemValidationErrorSchema)
      .optional()
      .describe('Structured errors (typically field validation)'),
  })
  .describe('RFC 7807 document with the project `code` extension');

export type ProblemDetails = z.infer<typeof problemDetailsSchema>;

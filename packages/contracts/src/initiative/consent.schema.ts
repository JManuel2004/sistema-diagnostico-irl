import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';

/**
 * Current version of the consent text (Law 1581 of 2012).
 *
 * It changes when legal approves a new text. The frontend sends the version
 * it showed together with the acceptance that is persisted — so the trace
 * shows exactly which text the user accepted.
 */
export const consentVersionSchema = z
  .string()
  .regex(/^v\d+(\.\d+)*$/)
  .describe('Version of the consent text (e.g. "v1", "v2.1")');

export type ConsentVersion = z.infer<typeof consentVersionSchema>;

/**
 * Command that records the user's consent (HU-05 / RF-03).
 *
 * `POST /api/v1/diagnostics/:id/consent`.
 *
 * Rules:
 *   - A user who does not accept simply does not send the request — there
 *     is no `accepted: false` to send or to reject.
 *   - `version` is the version of the text shown to the user, not "the
 *     server's current one"; the backend checks it matches the current one
 *     and rejects with 409 if not.
 */
export const registerConsentSchema = z
  .object({
    version: consentVersionSchema,
  })
  .describe('Consent record (HU-05)');

export type RegisterConsentCommand = z.infer<typeof registerConsentSchema>;

/**
 * State of the consent of a diagnostic.
 *
 * Endpoint: `GET /api/v1/diagnostics/:id/consent`.
 *
 * While no consent is recorded, the endpoint answers 404 — the frontend
 * reads it as "the terms step is still pending". If it exists, this shape
 * is returned with `acceptedAt`.
 */
export const consentRecordSchema = z
  .object({
    diagnosticId: uuidSchema,
    version: consentVersionSchema,
    acceptedAt: z.string().datetime(),
  })
  .describe('Consent recorded for a diagnostic');

export type ConsentRecord = z.infer<typeof consentRecordSchema>;

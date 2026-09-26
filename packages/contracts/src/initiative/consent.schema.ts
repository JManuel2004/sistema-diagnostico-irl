import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';

/**
 * Version of the consent text (Law 1581 of 2012).
 *
 * It changes when legal approves a new text. The frontend sends the version
 * it showed together with the acceptance, and each acceptance points to the
 * stored text of that version — so it is always possible to show exactly
 * which text the user accepted.
 */
export const consentVersionSchema = z
  .string()
  .regex(/^v\d+(\.\d+)*$/)
  .describe('Version of the consent text (e.g. "v1", "v2.1")');

export type ConsentVersion = z.infer<typeof consentVersionSchema>;

/** A section of the consent text: a heading and its paragraph. */
export const consentTermsSectionSchema = z.object({
  heading: z.string().min(1),
  body: z.string().min(1),
});

export type ConsentTermsSection = z.infer<typeof consentTermsSectionSchema>;

/**
 * A published consent text (`irl_catalog.consent_terms`).
 *
 * Endpoint: `GET /api/v1/consent-terms/current` — the latest published text,
 * the one the user must accept.
 */
export const consentTermsSchema = z
  .object({
    version: consentVersionSchema,
    title: z.string().min(1),
    sections: z.array(consentTermsSectionSchema).min(1),
    checkboxLabel: z.string().min(1),
    publishedAt: z.string().datetime(),
  })
  .describe('Consent text of a version');

export type ConsentTerms = z.infer<typeof consentTermsSchema>;

/**
 * Command that records the acceptance of the consent (HU-05 / RF-03).
 *
 * The consent belongs to the **initiative**, not to one diagnostic: it is
 * accepted when the initiative is created (`POST /api/v1/initiatives`) and
 * again only when the text changes version
 * (`POST /api/v1/initiatives/:id/consent`).
 *
 * Rules:
 *   - A user who does not accept simply does not send the request — there
 *     is no `accepted: false` to send or to reject.
 *   - `version` is the version of the text shown to the user; the backend
 *     checks it is the current one and rejects with 409 if not.
 */
export const registerConsentSchema = z
  .object({
    version: consentVersionSchema,
  })
  .describe('Consent acceptance (HU-05)');

export type RegisterConsentCommand = z.infer<typeof registerConsentSchema>;

/**
 * One acceptance of the consent of an initiative. Acceptances are a
 * history: a new one never replaces an earlier one.
 */
export const consentRecordSchema = z
  .object({
    initiativeId: uuidSchema,
    version: consentVersionSchema,
    acceptedAt: z.string().datetime(),
  })
  .describe('An acceptance of the consent of an initiative');

export type ConsentRecord = z.infer<typeof consentRecordSchema>;

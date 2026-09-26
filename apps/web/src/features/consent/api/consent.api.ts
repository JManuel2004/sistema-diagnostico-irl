import {
  consentRecordSchema,
  consentTermsSchema,
  type ConsentRecord,
  type ConsentTerms,
} from '@innlab/contracts';
import { getParsed, postParsed } from '@/shared/api/http';

/** The current consent text: the one a new acceptance must be of. */
export function getCurrentConsentTerms(): Promise<ConsentTerms> {
  return getParsed('/consent-terms/current', consentTermsSchema);
}

/** Records a new acceptance of an initiative's consent; earlier ones are kept. */
export function recordConsent(initiativeId: string, version: string): Promise<ConsentRecord> {
  return postParsed(`/initiatives/${initiativeId}/consent`, { version }, consentRecordSchema);
}

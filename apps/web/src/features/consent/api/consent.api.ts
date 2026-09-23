import { consentRecordSchema, type ConsentRecord } from '@innlab/contracts';
import { getParsedOrNull, postParsed } from '@/shared/api/http';

/** The diagnostic's consent, or `null` if it has not been accepted yet (404). */
export function getConsent(diagnosticId: string): Promise<ConsentRecord | null> {
  return getParsedOrNull(`/diagnostics/${diagnosticId}/consent`, consentRecordSchema);
}

/** RF-03 — records the acceptance of the version of the text the user saw. */
export function recordConsent(diagnosticId: string, version: string): Promise<ConsentRecord> {
  return postParsed(`/diagnostics/${diagnosticId}/consent`, { version }, consentRecordSchema);
}

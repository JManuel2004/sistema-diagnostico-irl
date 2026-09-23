import { consentRecordSchema, type ConsentRecord } from '@innlab/contracts';
import { ApiError, http } from '@/shared/api/http';

/** The diagnostic's consent, or `null` if it has not been accepted yet (404). */
export async function getConsent(diagnosticId: string): Promise<ConsentRecord | null> {
  try {
    const { data } = await http.get<unknown>(`/diagnostics/${diagnosticId}/consent`);
    return consentRecordSchema.parse(data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** RF-03 — records the acceptance of the version of the text the user saw. */
export async function recordConsent(
  diagnosticId: string,
  version: string,
): Promise<ConsentRecord> {
  const { data } = await http.post<unknown>(`/diagnostics/${diagnosticId}/consent`, { version });
  return consentRecordSchema.parse(data);
}

import { consentRecordSchema, type ConsentRecord } from '@innlab/contracts';
import { ApiError, http } from '@/shared/api/http';

/** El consentimiento del diagnóstico, o `null` si todavía no se aceptó (404). */
export async function getConsent(diagnosticId: string): Promise<ConsentRecord | null> {
  try {
    const { data } = await http.get<unknown>(`/diagnostics/${diagnosticId}/consent`);
    return consentRecordSchema.parse(data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** RF-03 — registra la aceptación de la versión del texto que el usuario vio. */
export async function recordConsent(
  diagnosticId: string,
  version: string,
): Promise<ConsentRecord> {
  const { data } = await http.post<unknown>(`/diagnostics/${diagnosticId}/consent`, { version });
  return consentRecordSchema.parse(data);
}

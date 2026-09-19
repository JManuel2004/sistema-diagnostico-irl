import { http } from '@/shared/api/http';
import {
  acceptDeepAnalysisResponseSchema,
  maturityProfileResponseSchema,
  type AcceptDeepAnalysisResponse,
  type MaturityProfileResponse,
} from '@innlab/contracts';

export async function finalizeInitialDiagnostic(
  diagnosticId: string,
  answers: { statementId: string; value: number }[],
): Promise<MaturityProfileResponse> {
  const { data } = await http.post<unknown>(
    `/diagnostics/${diagnosticId}/finalize-initial`,
    { answers },
  );
  return maturityProfileResponseSchema.parse(data);
}

/**
 * RF-11 — el usuario acepta el análisis profundo. El backend publica
 * `DeepAnalysisRequestedEvent`; `routing/` y `roadmap/` calculan cada uno
 * su parte antes de que esta petición responda. Idempotente en el estado:
 * repetirla no rompe nada y reintenta un cálculo que hubiera fallado.
 */
export async function acceptDeepAnalysis(
  diagnosticId: string,
): Promise<AcceptDeepAnalysisResponse> {
  const { data } = await http.post<unknown>(
    `/diagnostics/${diagnosticId}/deep-analysis`,
  );
  return acceptDeepAnalysisResponseSchema.parse(data);
}

import { http } from '@/shared/api/http';
import {
  acceptDeepAnalysisResponseSchema,
  diagnosticSchema,
  diagnosticSummarySchema,
  maturityProfileResponseSchema,
  type AcceptDeepAnalysisResponse,
  type Diagnostic,
  type DiagnosticSummary,
  type MaturityProfileResponse,
} from '@innlab/contracts';

/**
 * HU-04 — el usuario inicia un diagnóstico propio. El backend lo crea a
 * nombre del usuario autenticado y lo deja listo para el cuestionario.
 */
export async function startDiagnostic(): Promise<Diagnostic> {
  const { data } = await http.post<unknown>('/diagnostics');
  return diagnosticSchema.parse(data);
}

/** Un diagnóstico del usuario, con su estado y si aceptó el análisis profundo. */
export async function getDiagnostic(diagnosticId: string): Promise<Diagnostic> {
  const { data } = await http.get<unknown>(`/diagnostics/${diagnosticId}`);
  return diagnosticSchema.parse(data);
}

/** Los diagnósticos del usuario, del más reciente al más antiguo. */
export async function listMyDiagnostics(): Promise<DiagnosticSummary[]> {
  const { data } = await http.get<unknown>('/diagnostics');
  return diagnosticSummarySchema.array().parse(data);
}

export async function finalizeInitialDiagnostic(
  diagnosticId: string,
  answers: { statementId: string; value: number; justification: string }[],
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

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
 * HU-04 — the user starts a diagnostic of their own. The backend returns
 * the user's unfinished one if there is one, or creates a new one.
 */
export async function startDiagnostic(): Promise<Diagnostic> {
  const { data } = await http.post<unknown>('/diagnostics');
  return diagnosticSchema.parse(data);
}

/** One diagnostic of the user, with its state and whether the deep analysis was accepted. */
export async function getDiagnostic(diagnosticId: string): Promise<Diagnostic> {
  const { data } = await http.get<unknown>(`/diagnostics/${diagnosticId}`);
  return diagnosticSchema.parse(data);
}

/** The user's diagnostics, most recent first. */
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
 * RF-11 — the user accepts the deep analysis. The backend publishes
 * `DeepAnalysisRequestedEvent`; `routing/` and `roadmap/` each calculate
 * their part before this request answers. Idempotent in the state:
 * repeating it breaks nothing and retries a calculation that failed.
 */
export async function acceptDeepAnalysis(
  diagnosticId: string,
): Promise<AcceptDeepAnalysisResponse> {
  const { data } = await http.post<unknown>(
    `/diagnostics/${diagnosticId}/deep-analysis`,
  );
  return acceptDeepAnalysisResponseSchema.parse(data);
}

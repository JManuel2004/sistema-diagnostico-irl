import { getParsed, getParsedOrNull, postParsed } from '@/shared/api/http';
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
 * Starts a new diagnostic. While the user has one in progress the server
 * answers 409 `DIAGNOSIS_IN_PROGRESS`; `discardInProgress` is the user's
 * choice to delete it (with its saved answers) and start over.
 */
export function startDiagnostic(discardInProgress = false): Promise<Diagnostic> {
  const query = discardInProgress ? '?discardInProgress=true' : '';
  return postParsed(`/diagnostics${query}`, undefined, diagnosticSchema);
}

/** The user's diagnostic still being filled in, or `null` when there is none. */
export function getInProgressDiagnostic(): Promise<Diagnostic | null> {
  return getParsedOrNull('/diagnostics/in-progress', diagnosticSchema);
}

/** One diagnostic of the user, with its state and whether the deep analysis was accepted. */
export function getDiagnostic(diagnosticId: string): Promise<Diagnostic> {
  return getParsed(`/diagnostics/${diagnosticId}`, diagnosticSchema);
}

/** The user's diagnostics, most recent first. */
export function listMyDiagnostics(): Promise<DiagnosticSummary[]> {
  return getParsed('/diagnostics', diagnosticSummarySchema.array());
}

export function finalizeInitialDiagnostic(
  diagnosticId: string,
  answers: { statementId: string; value: number; justification: string | null }[],
): Promise<MaturityProfileResponse> {
  return postParsed(
    `/diagnostics/${diagnosticId}/finalize-initial`,
    { answers },
    maturityProfileResponseSchema,
  );
}

/**
 * RF-11 — the user accepts the deep analysis. The backend publishes
 * `DeepAnalysisRequestedEvent`; `routing/` and `roadmap/` each calculate
 * their part before this request answers. Idempotent in the state:
 * repeating it breaks nothing and retries a calculation that failed.
 */
export function acceptDeepAnalysis(diagnosticId: string): Promise<AcceptDeepAnalysisResponse> {
  return postParsed(
    `/diagnostics/${diagnosticId}/deep-analysis`,
    undefined,
    acceptDeepAnalysisResponseSchema,
  );
}

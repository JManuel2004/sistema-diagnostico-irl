import type { Diagnostic } from '@innlab/contracts';
import type { Diagnosis } from '../../domain/entities/diagnosis.aggregate.js';

/**
 * The diagnostic as the API serves it. `frameworkVersionCode` is the code
 * of its framework version, which the taxonomy resolves from the id.
 */
export function toDiagnosticResponse(
  diagnosis: Diagnosis,
  frameworkVersionCode: string,
): Diagnostic {
  return {
    id: diagnosis.id.value,
    userId: diagnosis.userId,
    state: diagnosis.state.value,
    completed: diagnosis.completed,
    deepAnalysisAccepted: diagnosis.deepAnalysisAccepted,
    deepAnalysisCompleted: diagnosis.deepAnalysisCompleted,
    frameworkVersion: frameworkVersionCode,
    createdAt: diagnosis.createdAt.toISOString(),
  };
}

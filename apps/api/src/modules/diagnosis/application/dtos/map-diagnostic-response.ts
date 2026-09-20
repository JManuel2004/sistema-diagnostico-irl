import type { Diagnostic } from '@innlab/contracts';
import type { Diagnosis } from '../../domain/entities/diagnosis.aggregate.js';

export function toDiagnosticResponse(diagnosis: Diagnosis): Diagnostic {
  return {
    id: diagnosis.id.value,
    userId: diagnosis.userId,
    state: diagnosis.state.value,
    completed: diagnosis.completed,
    deepAnalysisAccepted: diagnosis.deepAnalysisAccepted,
    createdAt: diagnosis.createdAt.toISOString(),
    updatedAt: diagnosis.updatedAt.toISOString(),
  };
}

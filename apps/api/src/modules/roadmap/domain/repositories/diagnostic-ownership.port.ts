import type { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import type { Result } from '../../../../shared/kernel/domain/result.js';

export const DIAGNOSTIC_OWNERSHIP = Symbol('DIAGNOSTIC_OWNERSHIP');

/**
 * Whether a diagnostic belongs to the caller (RNF-04), before a result of
 * it is served. A diagnostic of someone else is answered as missing.
 */
export interface DiagnosticOwnershipPort {
  verify(diagnosticId: string, userId: string): Promise<Result<void, NotFoundError>>;
}

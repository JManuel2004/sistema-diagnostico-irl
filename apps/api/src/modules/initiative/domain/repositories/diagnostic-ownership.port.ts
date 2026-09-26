import type { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import type { ForbiddenError } from '../../../../shared/kernel/domain/errors/forbidden.error.js';
import type { Result } from '../../../../shared/kernel/domain/result.js';

export const DIAGNOSTIC_OWNERSHIP = Symbol('DIAGNOSTIC_OWNERSHIP');

/**
 * What `initiative/` needs to know about a diagnostic before it writes
 * anything against it: that it exists and that it belongs to the caller.
 *
 * `initiative/` does not own diagnostics, so it asks through this port
 * instead of reading `diagnosis/`'s entity — only ids cross the module
 * boundary.
 */
export interface DiagnosticOwnershipPort {
  /**
   * Success when `diagnosticId` exists and is owned by `userId`.
   * `NotFoundError` when no such diagnostic exists; `ForbiddenError` when
   * it exists but belongs to someone else.
   */
  verify(
    diagnosticId: string,
    userId: string,
  ): Promise<Result<void, NotFoundError | ForbiddenError>>;

  /**
   * Whether the diagnostic's deep analysis was accepted: its initiative
   * profile is then frozen, because the recommendation was computed from it.
   */
  deepAnalysisAccepted(diagnosticId: string): Promise<boolean>;
}

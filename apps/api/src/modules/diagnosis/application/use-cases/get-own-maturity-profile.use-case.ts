import type { MaturityProfileResponse } from '@innlab/contracts';
import { type DiagnosisRepositoryPort } from '../../domain/repositories/diagnosis.repository.port.js';
import type { GetMaturityProfileUseCase } from './get-maturity-profile.use-case.js';
import type { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import type { ConflictError } from '../../../../shared/kernel/domain/errors/conflict.error.js';
import type { Result } from '../../../../shared/kernel/domain/result.js';
import { findOwnDiagnosis } from './find-own-diagnosis.js';

export interface GetOwnMaturityProfileQuery {
  diagnosticId: string;
  userId: string;
}

/**
 * The maturity profile as the HTTP endpoint serves it: only to the owner of
 * the diagnostic. `GetMaturityProfileUseCase` stays without that check
 * because `routing/` and `roadmap/` read it from an event, with no user.
 */
export class GetOwnMaturityProfileUseCase {
  constructor(
    private readonly diagnoses: DiagnosisRepositoryPort,
    private readonly getProfile: GetMaturityProfileUseCase,
  ) {}

  async execute(
    query: GetOwnMaturityProfileQuery,
  ): Promise<Result<MaturityProfileResponse, NotFoundError | ConflictError>> {
    const own = await findOwnDiagnosis(this.diagnoses, query.diagnosticId, query.userId);
    if (!own.ok) return own;
    return this.getProfile.execute({ diagnosticId: query.diagnosticId });
  }
}

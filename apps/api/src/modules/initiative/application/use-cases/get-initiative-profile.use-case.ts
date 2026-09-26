import type { Initiative as InitiativeProfileResponse } from '@innlab/contracts';
import { type InitiativeProfileRepositoryPort } from '../../domain/repositories/initiative-profile.repository.port.js';
import { type InitiativeCatalogPort } from '../../domain/repositories/initiative-catalog.port.js';
import { type DiagnosticOwnershipPort } from '../../domain/repositories/diagnostic-ownership.port.js';
import { describeInitiativeProfile } from './describe-initiative-profile.js';
import { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import type { ForbiddenError } from '../../../../shared/kernel/domain/errors/forbidden.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';

/** The initiative profile of a diagnostic of the caller; 404 while it has none. */
export class GetInitiativeProfileUseCase {
  constructor(
    private readonly profiles: InitiativeProfileRepositoryPort,
    private readonly catalog: InitiativeCatalogPort,
    private readonly ownership: DiagnosticOwnershipPort,
  ) {}

  async execute(
    diagnosticId: string,
    userId: string,
  ): Promise<Result<InitiativeProfileResponse, NotFoundError | ForbiddenError>> {
    const owned = await this.ownership.verify(diagnosticId, userId);
    if (!owned.ok) return owned;

    const profile = await this.profiles.findByDiagnosticId(diagnosticId);
    if (!profile) {
      return Result.err(new NotFoundError('Initiative', diagnosticId));
    }

    const response = await describeInitiativeProfile(this.catalog, profile);
    if (!response) {
      return Result.err(new NotFoundError('Initiative catalog entry', diagnosticId));
    }
    return Result.ok(response);
  }
}

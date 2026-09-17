import { Inject, Injectable } from '@nestjs/common';
import type { MaturityProfileResponse } from '@innlab/contracts';
import {
  MATURITY_PROFILE_REPOSITORY,
  type MaturityProfileRepositoryPort,
} from '../domain/ports/maturity-profile.repository.port.js';
import {
  IMBALANCE_REPOSITORY,
  type ImbalanceRepositoryPort,
} from '../domain/ports/imbalance.repository.port.js';
import { ConflictError } from '../../../shared-kernel/domain/errors/conflict.error.js';
import { toMaturityProfileResponse } from './map-maturity-profile-response.js';

export interface GetMaturityProfileQuery {
  diagnosticId: string;
}

@Injectable()
export class GetMaturityProfileUseCase {
  constructor(
    @Inject(MATURITY_PROFILE_REPOSITORY)
    private readonly profiles: MaturityProfileRepositoryPort,
    @Inject(IMBALANCE_REPOSITORY)
    private readonly imbalances: ImbalanceRepositoryPort,
  ) {}

  async execute(query: GetMaturityProfileQuery): Promise<MaturityProfileResponse> {
    const profile = await this.profiles.findByDiagnosticId(query.diagnosticId);
    if (!profile) {
      throw new ConflictError('PROFILE_NOT_YET_COMPUTED', {
        diagnosticId: query.diagnosticId,
      });
    }

    const storedImbalances = await this.imbalances.findByDiagnosticId(query.diagnosticId);
    return toMaturityProfileResponse(profile, storedImbalances);
  }
}

import { Inject, Injectable } from '@nestjs/common';
import type { MaturityProfileResponse } from '@innlab/contracts';
import {
  MATURITY_PROFILE_REPOSITORY,
  type MaturityProfileRepositoryPort,
} from '../domain/ports/maturity-profile.repository.port.js';
import {
  IRL_CATALOG_REPOSITORY,
  type IrlCatalogRepositoryPort,
} from '../../irl-catalog/domain/ports/irl-catalog.repository.port.js';
import { ImbalanceEvaluatorService } from '../domain/services/imbalance-evaluator.service.js';
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
    @Inject(IRL_CATALOG_REPOSITORY)
    private readonly catalog: IrlCatalogRepositoryPort,
    private readonly imbalanceEvaluator: ImbalanceEvaluatorService,
  ) {}

  async execute(query: GetMaturityProfileQuery): Promise<MaturityProfileResponse> {
    const profile = await this.profiles.findByDiagnosticId(query.diagnosticId);
    if (!profile) {
      throw new ConflictError('PROFILE_NOT_YET_COMPUTED', {
        diagnosticId: query.diagnosticId,
      });
    }

    const pairs = await this.catalog.findAllDimensionPairs();
    const levelByCode = new Map<string, number>(
      profile.dimensionResults().map((r) => [r.dimensionCode.value, r.irlLevel.value]),
    );
    const imbalances = this.imbalanceEvaluator.evaluate(levelByCode, pairs);

    return toMaturityProfileResponse(profile, imbalances);
  }
}

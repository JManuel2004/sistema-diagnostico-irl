import type { MaturityProfileResponse } from '@innlab/contracts';
import { type MaturityProfileRepositoryPort } from '../../domain/repositories/maturity-profile.repository.port.js';
import { type ImbalanceRepositoryPort } from '../../domain/repositories/imbalance.repository.port.js';
import { type TaxonomyRepositoryPort } from '../../../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';
import { ConflictError } from '../../../../shared/kernel/domain/errors/conflict.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import { toMaturityProfileResponse } from '../dtos/map-maturity-profile-response.js';

export interface GetMaturityProfileQuery {
  diagnosticId: string;
}

/**
 * "No profile yet" is a normal, expected outcome — the diagnostic simply
 * hasn't reached that point of its lifecycle yet — not an exceptional
 * condition, so it comes back as `Result.err`. `routing/`'s and `roadmap/`'s
 * generation use cases, both of which call this one internally, propagate
 * that same `Result.err` as their own instead of catching an exception.
 */
export class GetMaturityProfileUseCase {
  constructor(
    private readonly profiles: MaturityProfileRepositoryPort,
    private readonly imbalances: ImbalanceRepositoryPort,
    private readonly taxonomy: TaxonomyRepositoryPort,
  ) {}

  async execute(
    query: GetMaturityProfileQuery,
  ): Promise<Result<MaturityProfileResponse, ConflictError>> {
    const profile = await this.profiles.findByDiagnosticId(query.diagnosticId);
    if (!profile) {
      return Result.err(
        new ConflictError('PROFILE_NOT_YET_COMPUTED', {
          diagnosticId: query.diagnosticId,
        }),
      );
    }

    const storedImbalances = await this.imbalances.findByDiagnosticId(
      query.diagnosticId,
    );
    const dimensions = await this.taxonomy.findAllDimensions();
    return Result.ok(
      toMaturityProfileResponse(profile, storedImbalances, dimensions),
    );
  }
}

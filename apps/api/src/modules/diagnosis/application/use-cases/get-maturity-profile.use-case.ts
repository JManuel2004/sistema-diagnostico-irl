import type { MaturityProfileResponse } from '@innlab/contracts';
import { type MaturityProfileRepositoryPort } from '../../domain/repositories/maturity-profile.repository.port.js';
import { type ImbalanceRepositoryPort } from '../../domain/repositories/imbalance.repository.port.js';
import { type TaxonomyRepositoryPort } from '../../../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';
import { type DiagnosisRepositoryPort } from '../../domain/repositories/diagnosis.repository.port.js';
import { LevelDescriptions } from '../../../../shared/irl-taxonomy/domain/entities/level-descriptions.js';
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
    private readonly diagnostics: DiagnosisRepositoryPort,
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
    // The texts are those of the version the diagnostic was answered with.
    const [dimensions, diagnosis] = await Promise.all([
      this.taxonomy.findAllDimensions(),
      this.diagnostics.findById(query.diagnosticId),
    ]);
    const levels = diagnosis
      ? await this.taxonomy.findLevelDescriptions(diagnosis.frameworkVersionId)
      : LevelDescriptions.empty();
    return Result.ok(
      toMaturityProfileResponse(profile, storedImbalances, dimensions, levels),
    );
  }
}

import { Inject, Injectable } from '@nestjs/common';
import type { MaturityProfileResponse } from '@innlab/contracts';
import {
  MATURITY_PROFILE_REPOSITORY,
  type MaturityProfileRepositoryPort,
} from '../../domain/repositories/maturity-profile.repository.port.js';
import {
  IMBALANCE_REPOSITORY,
  type ImbalanceRepositoryPort,
} from '../../domain/repositories/imbalance.repository.port.js';
import { ConflictError } from '../../../../shared/kernel/domain/errors/conflict.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import { toMaturityProfileResponse } from '../dtos/map-maturity-profile-response.js';

export interface GetMaturityProfileQuery {
  diagnosticId: string;
}

/**
 * "No profile yet" is a normal, expected outcome — the diagnostic simply
 * hasn't reached that point of its lifecycle yet — not an exceptional
 * condition, so it comes back as `Result.err` (`convenciones-objetivo.md`
 * §2, "Adopción de Result<T, E>"). `routing/`'s and `roadmap/`'s
 * generation use cases, both of which call this one internally, propagate
 * that same `Result.err` as their own instead of catching an exception.
 */
@Injectable()
export class GetMaturityProfileUseCase {
  constructor(
    @Inject(MATURITY_PROFILE_REPOSITORY)
    private readonly profiles: MaturityProfileRepositoryPort,
    @Inject(IMBALANCE_REPOSITORY)
    private readonly imbalances: ImbalanceRepositoryPort,
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

    const storedImbalances = await this.imbalances.findByDiagnosticId(query.diagnosticId);
    return Result.ok(toMaturityProfileResponse(profile, storedImbalances));
  }
}

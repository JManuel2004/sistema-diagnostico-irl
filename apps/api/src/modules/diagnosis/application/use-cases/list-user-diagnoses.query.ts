import type { DiagnosticSummary } from '@innlab/contracts';
import { type DiagnosisRepositoryPort } from '../../domain/repositories/diagnosis.repository.port.js';
import { type MaturityProfileRepositoryPort } from '../../domain/repositories/maturity-profile.repository.port.js';
import { toDiagnosticResponse } from '../dtos/map-diagnostic-response.js';
import { type TaxonomyRepositoryPort } from '../../../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';
import { frameworkVersionCodes } from './framework-version-codes.js';

/**
 * A completed diagnostic as `diagnosis/` knows it: everything in the
 * summary but the initiative's name, which `initiative/` adds.
 */
export type UserDiagnosisSummary = Omit<DiagnosticSummary, 'initiativeName'>;

/**
 * The **completed** diagnostics of one user (with a maturity profile), most
 * recent first, each with when its profile was computed and its global
 * level. Exported read query: other modules get the summaries, never the
 * `Diagnosis` aggregate.
 *
 * A diagnostic still being filled in is left out: from a later session it
 * is not offered (DIAGIRL-26). It reads what is stored and recalculates
 * nothing.
 */
export class ListUserDiagnosesQuery {
  constructor(
    private readonly diagnoses: DiagnosisRepositoryPort,
    private readonly profiles: MaturityProfileRepositoryPort,
    private readonly taxonomy: TaxonomyRepositoryPort,
  ) {}

  async execute(userId: string): Promise<UserDiagnosisSummary[]> {
    const completed = (await this.diagnoses.findAllByUserId(userId)).filter(
      (d) => d.completed,
    );
    const [codes, profiles] = await Promise.all([
      frameworkVersionCodes(
        this.taxonomy,
        completed.map((d) => d.frameworkVersionId),
      ),
      Promise.all(
        completed.map((d) => this.profiles.findByDiagnosticId(d.id.value)),
      ),
    ]);
    return completed.map((d, i) => {
      const profile = profiles[i];
      return {
        ...toDiagnosticResponse(d, codes.get(d.frameworkVersionId) ?? ''),
        profileComputedAt: profile ? profile.computedAt.toISOString() : null,
        globalAverage: profile ? profile.globalAverage() : null,
      };
    });
  }
}

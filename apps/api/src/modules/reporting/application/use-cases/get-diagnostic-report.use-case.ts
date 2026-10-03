import { IRL_ATTRIBUTION, type DiagnosticReport } from '@innlab/contracts';
import type { DomainError } from '../../../../shared/kernel/domain/errors/domain-error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import { ReportNotAvailableError } from '../../domain/exceptions/report.errors.js';
import type { ReportSourcesPort } from '../ports/report-sources.port.js';

export interface GetDiagnosticReportQuery {
  diagnosticId: string;
  /** The caller: someone else's diagnostic is answered as missing. */
  userId: string;
}

/**
 * The full report of a diagnostic (RF-16 / HU-23): its initiative, its
 * maturity profile with gaps, imbalances and critical state, the INNLAB
 * recommendation and the roadmap, with the attribution of the KTH framework.
 *
 * It exists only once the deep analysis is complete (`deepAnalysisCompleted`,
 * both results saved, ADR 0008); before that it is a `Result.err`
 * (`ReportNotAvailableError`), the expected state of a diagnostic that has
 * not reached it, not a failure.
 *
 * It reads saved results and recalculates nothing, so the report says
 * exactly what the results page says.
 */
export class GetDiagnosticReportUseCase {
  constructor(private readonly sources: ReportSourcesPort) {}

  async execute(
    query: GetDiagnosticReportQuery,
  ): Promise<Result<DiagnosticReport, DomainError>> {
    const { diagnosticId, userId } = query;

    const diagnostic = await this.sources.diagnostic(diagnosticId, userId);
    if (!diagnostic.ok) return diagnostic;
    if (!diagnostic.value.deepAnalysisCompleted) {
      return Result.err(new ReportNotAvailableError(diagnosticId));
    }

    const [initiative, profile, recommendation, roadmap] = await Promise.all([
      this.sources.initiative(diagnosticId, userId),
      this.sources.profile(diagnosticId),
      this.sources.recommendation(diagnosticId, userId),
      this.sources.roadmap(diagnosticId, userId),
    ]);
    if (!initiative.ok) return initiative;
    if (!profile.ok) return profile;
    if (!recommendation.ok) return recommendation;
    if (!roadmap.ok) return roadmap;

    return Result.ok({
      diagnosticId,
      frameworkVersion: diagnostic.value.frameworkVersion,
      completedAt: latest(
        recommendation.value.generatedAt,
        roadmap.value.generatedAt,
      ),
      initiative: initiative.value,
      profile: profile.value,
      recommendation: recommendation.value,
      roadmap: roadmap.value,
      attribution: { ...IRL_ATTRIBUTION },
    });
  }
}

/** The later of two ISO-8601 instants. */
function latest(a: string, b: string): string {
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

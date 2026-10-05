import type {
  Diagnostic,
  Initiative,
  MaturityProfileResponse,
  RecommendationResponse,
  RoadmapResponse,
} from '@innlab/contracts';
import type { DomainError } from '../../../../shared/kernel/domain/errors/domain-error.js';
import type { Result } from '../../../../shared/kernel/domain/result.js';

export const REPORT_SOURCES = Symbol('REPORT_SOURCES');

/**
 * The saved results of a diagnostic, read from the modules that own them.
 * `reporting/` owns none of them: it gathers what `diagnosis/`,
 * `initiative/`, `routing/` and `roadmap/` already saved, through the read
 * queries they export, and never recalculates.
 *
 * The reads that take the caller verify the diagnostic is theirs; someone
 * else's is answered as missing.
 */
export interface ReportSourcesPort {
  diagnostic(
    diagnosticId: string,
    userId: string,
  ): Promise<Result<Diagnostic, DomainError>>;
  initiative(
    diagnosticId: string,
    userId: string,
  ): Promise<Result<Initiative, DomainError>>;
  profile(
    diagnosticId: string,
  ): Promise<Result<MaturityProfileResponse, DomainError>>;
  recommendation(
    diagnosticId: string,
    userId: string,
  ): Promise<Result<RecommendationResponse, DomainError>>;
  roadmap(
    diagnosticId: string,
    userId: string,
  ): Promise<Result<RoadmapResponse, DomainError>>;
}

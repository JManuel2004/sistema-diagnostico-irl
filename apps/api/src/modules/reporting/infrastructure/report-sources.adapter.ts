import { Injectable } from '@nestjs/common';
import type {
  Diagnostic,
  DiagnosticAnswers,
  Initiative,
  MaturityProfileResponse,
  RecommendationResponse,
  RoadmapResponse,
} from '@innlab/contracts';
import { GetDiagnosisUseCase } from '../../diagnosis/application/use-cases/get-diagnosis.use-case.js';
import { GetDiagnosisAnswersQuery } from '../../diagnosis/application/use-cases/get-diagnosis-answers.query.js';
import { GetMaturityProfileUseCase } from '../../diagnosis/application/use-cases/get-maturity-profile.use-case.js';
import { GetInitiativeProfileUseCase } from '../../initiative/application/use-cases/get-initiative-profile.use-case.js';
import { GetRecommendationUseCase } from '../../routing/application/use-cases/get-recommendation.use-case.js';
import { GetScalingRoadmapUseCase } from '../../roadmap/application/use-cases/get-scaling-roadmap.use-case.js';
import type { DomainError } from '../../../shared/kernel/domain/errors/domain-error.js';
import type { Result } from '../../../shared/kernel/domain/result.js';
import type { ReportSourcesPort } from '../application/ports/report-sources.port.js';

/**
 * `ReportSourcesPort` over the read queries the owning modules export. Each
 * of them already answers someone else's diagnostic as missing; this adapter
 * only forwards, it neither reads a table nor recalculates.
 */
@Injectable()
export class ReportSourcesAdapter implements ReportSourcesPort {
  constructor(
    private readonly getDiagnosis: GetDiagnosisUseCase,
    private readonly getInitiativeProfile: GetInitiativeProfileUseCase,
    private readonly getAnswers: GetDiagnosisAnswersQuery,
    private readonly getMaturityProfile: GetMaturityProfileUseCase,
    private readonly getRecommendation: GetRecommendationUseCase,
    private readonly getRoadmap: GetScalingRoadmapUseCase,
  ) {}

  diagnostic(
    diagnosticId: string,
    userId: string,
  ): Promise<Result<Diagnostic, DomainError>> {
    return this.getDiagnosis.execute({ diagnosticId, userId });
  }

  initiative(
    diagnosticId: string,
    userId: string,
  ): Promise<Result<Initiative, DomainError>> {
    return this.getInitiativeProfile.execute(diagnosticId, userId);
  }

  answers(
    diagnosticId: string,
    userId: string,
  ): Promise<Result<DiagnosticAnswers, DomainError>> {
    return this.getAnswers.execute({ diagnosticId, userId });
  }

  profile(
    diagnosticId: string,
  ): Promise<Result<MaturityProfileResponse, DomainError>> {
    return this.getMaturityProfile.execute({ diagnosticId });
  }

  recommendation(
    diagnosticId: string,
    userId: string,
  ): Promise<Result<RecommendationResponse, DomainError>> {
    return this.getRecommendation.execute({ diagnosticId, userId });
  }

  roadmap(
    diagnosticId: string,
    userId: string,
  ): Promise<Result<RoadmapResponse, DomainError>> {
    return this.getRoadmap.execute({ diagnosticId, userId });
  }
}

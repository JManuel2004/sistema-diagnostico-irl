import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { RecommendationRepositoryPort } from '../../../domain/repositories/recommendation.repository.port.js';
import {
  Recommendation,
  type EvaluationTrace,
  type ResultType,
} from '../../../domain/entities/recommendation.aggregate.js';
import type { ScoredCandidate } from '../../../domain/value-objects/scored-candidate.vo.js';
import { PortfolioRecommendationOrm } from '../orm-entities/portfolio-recommendation.orm-entity.js';
import { RecommendationRankOrm } from '../orm-entities/recommendation-rank.orm-entity.js';

/**
 * A recommendation is its row (result, justification, trace) plus its
 * ranking (`recommendation_rank`, position 1 = the recommended service).
 * Saving replaces the diagnostic's previous recommendation in one
 * transaction; the ranking goes with it by cascade.
 */
@Injectable()
export class TypeOrmRecommendationRepository implements RecommendationRepositoryPort {
  constructor(
    @InjectRepository(PortfolioRecommendationOrm)
    private readonly orm: Repository<PortfolioRecommendationOrm>,
  ) {}

  async save(recommendation: Recommendation): Promise<void> {
    await this.orm.manager.transaction(async (manager) => {
      await manager.delete(PortfolioRecommendationOrm, {
        idDiagnostic: recommendation.diagnosticId.value,
      });

      const t = recommendation.trace;
      const saved = await manager.save(
        PortfolioRecommendationOrm,
        manager.create(PortfolioRecommendationOrm, {
          idDiagnostic: recommendation.diagnosticId.value,
          resultType: recommendation.resultType,
          criterionJustification:
            recommendation.justification ?? recommendation.noRecommendationReason ?? '',
          generatedAt: recommendation.generatedAt,
          layer1Excluded: [...t.layer1Excluded],
          rankingBeforeExceptions: [...t.rankingBeforeExceptions],
          appliedExceptions: [...t.appliedExceptions],
          discardedExceptions: [...t.discardedExceptions],
          rankingAfterExceptions: [...t.rankingAfterExceptions],
          incompleteCharacterization: [...t.incompleteCharacterization],
          factsHash: t.factsHash,
        }),
      );

      const ranking = recommendation.primary
        ? [recommendation.primary, ...recommendation.alternatives]
        : [];
      if (ranking.length > 0) {
        await manager.insert(
          RecommendationRankOrm,
          ranking.map((candidate, i) => ({
            idRecommendation: saved.idRecommendation,
            idService: candidate.idService,
            serviceSnapshot: candidate.serviceName,
            position: i + 1,
            score: candidate.total,
          })),
        );
      }
    });
  }

  async findByDiagnosticId(diagnosticId: string): Promise<Recommendation | null> {
    const row = await this.orm.findOne({ where: { idDiagnostic: diagnosticId } });
    if (!row) return null;

    const ranks = await this.orm.manager.find(RecommendationRankOrm, {
      where: { idRecommendation: row.idRecommendation },
      order: { position: 'ASC' },
    });

    const trace: EvaluationTrace = {
      layer1Excluded: row.layer1Excluded,
      rankingBeforeExceptions: row.rankingBeforeExceptions,
      appliedExceptions: row.appliedExceptions,
      discardedExceptions: row.discardedExceptions,
      rankingAfterExceptions: row.rankingAfterExceptions,
      incompleteCharacterization: row.incompleteCharacterization,
      factsHash: row.factsHash,
    };

    // The ranking table says which services and in which order; their
    // contributions (what the explanation needs) are in the trace.
    const candidates: ScoredCandidate[] = ranks.map((rank) => {
      const traced = row.rankingAfterExceptions.find((c) => c.idService === rank.idService);
      return (
        traced ?? {
          idService: rank.idService,
          serviceName: rank.serviceSnapshot,
          total: rank.score,
          contributions: emptyContributions(),
        }
      );
    });

    const resultType = row.resultType as ResultType;
    return Recommendation.fromPersistence({
      diagnosticId: row.idDiagnostic,
      resultType,
      primary: candidates[0] ?? null,
      alternatives: candidates.slice(1),
      justification: resultType === 'RECOMMENDATION' ? row.criterionJustification : null,
      noRecommendationReason:
        resultType === 'NO_RECOMMENDATION' ? row.criterionJustification : null,
      trace,
      generatedAt: row.generatedAt,
    });
  }
}

function emptyContributions(): ScoredCandidate['contributions'] {
  return {
    bottleneck: { value: 0, details: [] },
    gaps: { value: 0, details: [] },
    imbalances: { value: 0, details: [] },
    stageAffinity: { value: 0, matches: false },
    rangePenalty: { value: 0, applied: false },
  };
}

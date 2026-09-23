import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { RecommendationRepositoryPort } from '../../../domain/repositories/recommendation.repository.port.js';
import {
  Recommendation,
  type ResultType,
  type EvaluationTrace,
} from '../../../domain/entities/recommendation.aggregate.js';
import type { ScoredCandidate } from '../../../domain/value-objects/scored-candidate.vo.js';
import { PortfolioRecommendationOrm } from '../orm-entities/portfolio-recommendation.orm-entity.js';
import { RecommendationAlternativeOrm } from '../orm-entities/recommendation-alternative.orm-entity.js';
import { LayerTraceOrm } from '../orm-entities/layer-trace.orm-entity.js';

/**
 * Adapter of the `Recommendation` aggregate.
 *
 * `save` writes three tables — recommendation, alternatives and trace —
 * within **a single transaction**. It is not an optional precaution: they
 * are three writes of one fact, and a recommendation without a trace is a
 * black box while orphan alternatives are garbage.
 *
 * It follows `TypeOrmAnswerSheetRepository.save`, which wraps the writes in
 * `manager.transaction()`. An integration test cuts the write halfway and
 * checks nothing is left.
 *
 * Rewrite policy: delete and insert. Regenerating the recommendation of a
 * diagnostic replaces the previous one entirely, trace included, instead of
 * accumulating versions — `UNIQUE (id_diagnostic)` allows nothing else.
 */
@Injectable()
export class TypeOrmRecommendationRepository
  implements RecommendationRepositoryPort
{
  constructor(
    @InjectRepository(PortfolioRecommendationOrm)
    private readonly orm: Repository<PortfolioRecommendationOrm>,
  ) {}

  async save(recommendation: Recommendation): Promise<void> {
    await this.orm.manager.transaction(async (manager) => {
      // The cascading delete takes the alternatives and the trace with it.
      await manager.delete(PortfolioRecommendationOrm, {
        idDiagnostic: recommendation.diagnosticId.value,
      });

      const primary = recommendation.primary;
      const row = manager.create(PortfolioRecommendationOrm, {
        idDiagnostic: recommendation.diagnosticId.value,
        resultType: recommendation.resultType,
        idPrimaryService: primary?.idService ?? null,
        primaryScore: primary?.total ?? null,
        serviceSnapshot: primary?.serviceName ?? null,
        criterionJustification:
          recommendation.justification ?? recommendation.noRecommendationReason,
        generatedAt: recommendation.generatedAt,
      });
      const saved = await manager.save(PortfolioRecommendationOrm, row);

      if (recommendation.alternatives.length > 0) {
        await manager.insert(
          RecommendationAlternativeOrm,
          recommendation.alternatives.map((alt, i) => ({
            idRecommendation: saved.idRecommendation,
            idService: alt.idService,
            serviceSnapshot: alt.serviceName,
            // The recommended service takes position 1; the alternatives start
            // at 2, which is what `ck_recommendation_alternative_position` requires.
            position: i + 2,
            score: alt.total,
          })),
        );
      }

      const t = recommendation.trace;
      await manager.insert(LayerTraceOrm, {
        idRecommendation: saved.idRecommendation,
        layer1Excluded: t.layer1Excluded,
        rankingBeforeExceptions: t.rankingBeforeExceptions,
        appliedExceptions: t.appliedExceptions,
        discardedExceptions: t.discardedExceptions,
        rankingAfterExceptions: t.rankingAfterExceptions,
        factsHash: t.factsHash,
        evaluatedAt: recommendation.generatedAt,
      });
    });
  }

  async findByDiagnosticId(
    diagnosticId: string,
  ): Promise<Recommendation | null> {
    const row = await this.orm.findOne({ where: { idDiagnostic: diagnosticId } });
    if (!row) return null;

    const manager = this.orm.manager;
    const [alternatives, trace] = await Promise.all([
      manager.find(RecommendationAlternativeOrm, {
        where: { idRecommendation: row.idRecommendation },
        order: { position: 'ASC' },
      }),
      manager.findOne(LayerTraceOrm, {
        where: { idRecommendation: row.idRecommendation },
      }),
    ]);

    if (!trace) {
      // Should not happen: the trace is written in the same transaction.
      // If it is missing, the row comes from a non-atomic write and cannot be
      // explained — better to treat it as missing than to return half of it.
      return null;
    }

    const domainTrace: EvaluationTrace = {
      layer1Excluded: trace.layer1Excluded as EvaluationTrace['layer1Excluded'],
      rankingBeforeExceptions:
        trace.rankingBeforeExceptions as readonly ScoredCandidate[],
      appliedExceptions:
        trace.appliedExceptions as EvaluationTrace['appliedExceptions'],
      discardedExceptions:
        trace.discardedExceptions as EvaluationTrace['discardedExceptions'],
      rankingAfterExceptions:
        trace.rankingAfterExceptions as readonly ScoredCandidate[],
      incompleteCharacterization: [],
      factsHash: trace.factsHash,
    };

    const finalRanking = domainTrace.rankingAfterExceptions;
    const primary =
      row.idPrimaryService === null
        ? null
        : (finalRanking.find((c) => c.idService === row.idPrimaryService) ??
          null);

    return Recommendation.fromPersistence({
      diagnosticId: row.idDiagnostic,
      resultType: row.resultType as ResultType,
      primary,
      alternatives: alternatives
        .map((a) =>
          finalRanking.find((c) => c.idService === a.idService),
        )
        .filter((c): c is ScoredCandidate => c !== undefined),
      justification:
        row.resultType === 'RECOMMENDATION'
          ? row.criterionJustification
          : null,
      noRecommendationReason:
        row.resultType === 'NO_RECOMMENDATION'
          ? row.criterionJustification
          : null,
      trace: domainTrace,
      generatedAt: row.generatedAt,
    });
  }
}

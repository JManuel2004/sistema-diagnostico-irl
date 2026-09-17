import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { RecommendationRepositoryPort } from '../../domain/ports/recommendation.repository.port.js';
import {
  Recommendation,
  type ResultType,
  type EvaluationTrace,
} from '../../domain/entities/recommendation.aggregate.js';
import type { ScoredCandidate } from '../../domain/value-objects/scored-candidate.vo.js';
import { PortfolioRecommendationOrm } from './portfolio-recommendation.orm-entity.js';
import { RecommendationAlternativeOrm } from './recommendation-alternative.orm-entity.js';
import { LayerTraceOrm } from './layer-trace.orm-entity.js';

/**
 * Adaptador del agregado `Recommendation`.
 *
 * `save` escribe tres tablas —recomendación, alternatives y traza— dentro
 * de **una sola transacción**. No es una precaución opcional: son tres
 * escrituras de un mismo hecho, y una recomendación sin traza es una caja
 * negra mientras que unas alternatives huérfanas son basura.
 *
 * Se sigue el único precedente correcto del repositorio,
 * `TypeOrmAnswerSheetRepository.save`, que envuelve en
 * `manager.transaction()`. Hay una prueba de integración que corta la
 * escritura a la mitad y verifica que no queda nada.
 *
 * Política de reescritura: borrar e insertar. Regenerar la recomendación
 * de un diagnóstico reemplaza la anterior por completo, incluida su
 * traza, en lugar de acumular versiones — `UNIQUE (id_diagnostico)` no
 * admite otra cosa.
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
      // El borrado en cascada se lleva alternatives y traza.
      await manager.delete(PortfolioRecommendationOrm, {
        idDiagnostic: recommendation.diagnosticId.value,
      });

      const primary = recommendation.primary;
      const row = manager.create(PortfolioRecommendationOrm, {
        idDiagnostic: recommendation.diagnosticId.value,
        idConfigurationVersion: recommendation.idConfigurationVersion,
        resultType: recommendation.resultType,
        idPrimaryService: primary?.idService ?? null,
        primaryScore: primary?.total ?? null,
        serviceSnapshot: primary?.serviceName ?? null,
        criterionJustification:
          recommendation.justification ?? recommendation.noRecommendationReason,
        generatedAt: recommendation.generatedAt,
      });
      const guardada = await manager.save(PortfolioRecommendationOrm, row);

      if (recommendation.alternatives.length > 0) {
        await manager.insert(
          RecommendationAlternativeOrm,
          recommendation.alternatives.map((alt, i) => ({
            idRecommendation: guardada.idRecommendation,
            idService: alt.idService,
            serviceSnapshot: alt.serviceName,
            // La principal ocupa la posición 1; las alternatives empiezan
            // en la 2, que es lo que exige `ck_alternativa_posicion`.
            position: i + 2,
            score: alt.total,
          })),
        );
      }

      const t = recommendation.trace;
      await manager.insert(LayerTraceOrm, {
        idRecommendation: guardada.idRecommendation,
        layer1Excluded: t.layer1Excluded,
        rankingBeforeExceptions: t.rankingBeforeExceptions,
        appliedExceptions: t.appliedExceptions,
        discardedExceptions: t.discardedExceptions,
        rankingAfterExceptions: t.rankingAfterExceptions,
        idConfigurationVersion: recommendation.idConfigurationVersion,
        idCalibrationSnapshot: recommendation.idCalibrationSnapshot,
        idParametersSnapshot: recommendation.idParametersSnapshot,
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
      // No debería ocurrir: la traza se escribe en la misma transacción.
      // Si falta, la fila es de una escritura no atómica y no se puede
      // explicar — mejor tratarla como inexistente que devolver media.
      return null;
    }

    const trazaDominio: EvaluationTrace = {
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

    const rankingPost = trazaDominio.rankingAfterExceptions;
    const primary =
      row.idPrimaryService === null
        ? null
        : (rankingPost.find((c) => c.idService === row.idPrimaryService) ??
          null);

    return Recommendation.fromPersistence({
      diagnosticId: row.idDiagnostic,
      idConfigurationVersion: row.idConfigurationVersion,
      idCalibrationSnapshot: trace.idCalibrationSnapshot,
      idParametersSnapshot: trace.idParametersSnapshot,
      resultType: row.resultType as ResultType,
      primary,
      alternatives: alternatives
        .map((a) =>
          rankingPost.find((c) => c.idService === a.idService),
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
      trace: trazaDominio,
      generatedAt: row.generatedAt,
    });
  }
}

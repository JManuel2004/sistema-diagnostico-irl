import type {
  RecommendationResponse,
  LayerTraceResponse,
} from '@innlab/contracts';
import type { Recommendation } from '../../domain/entities/recommendation.aggregate.js';
import type { ScoredCandidate } from '../../domain/value-objects/scored-candidate.vo.js';

/**
 * Mapea el agregado a la respuesta pública.
 *
 * La respuesta al líder de iniciativa NO incluye la traza. Son dos
 * audiencias distintas: quien recibe la recomendación necesita saber qué
 * se le sugiere y por qué en lenguaje llano; quien la audita necesita el
 * desglose por capas. Mezclarlas convertiría la pantalla de resultado en
 * un volcado de cálculo.
 */
export function toRecomendacionResponse(
  recommendation: Recommendation,
): RecommendationResponse {
  return {
    diagnosticId: recommendation.diagnosticId.value,
    resultType: recommendation.resultType,
    primary: recommendation.primary
      ? toRecommendedService(recommendation.primary, 1)
      : null,
    justification: recommendation.justification,
    noRecommendationReason: recommendation.noRecommendationReason,
    alternatives: recommendation.alternatives.map((c, i) =>
      toRecommendedService(c, i + 2),
    ),
    generatedAt: recommendation.generatedAt.toISOString(),
  };
}

/**
 * Mapea la traza. Audiencia: el equipo de INNLAB.
 *
 * `ajustadoPorExcepcion` se deriva del agregado y no se recalcula aquí:
 * es la afirmación de que el servicio recomendado no es el que ganó el
 * cálculo, y tiene que salir de un solo sitio.
 */
export function toTrazaCapasResponse(
  recommendation: Recommendation,
): LayerTraceResponse {
  const t = recommendation.trace;
  return {
    diagnosticId: recommendation.diagnosticId.value,
    layer1Excluded: t.layer1Excluded.map((e) => ({
      idService: e.idService,
      name: e.name,
      exclusionMessage: e.exclusionMessage,
    })),
    rankingBeforeExceptions: t.rankingBeforeExceptions.map(toRankingEntry),
    appliedExceptions: t.appliedExceptions.map((e) => ({
      code: e.code,
      order: e.order,
      action: e.action,
      targetService: e.targetService,
      declaredReason: e.declaredReason,
      rankingBefore: e.rankingBefore.map(toRankingEntry),
      rankingAfter: e.rankingAfter.map(toRankingEntry),
      effect: e.effect,
    })),
    discardedExceptions: t.discardedExceptions.map((e) => ({
      code: e.code,
      order: e.order,
      reason: e.reason,
    })),
    rankingAfterExceptions: t.rankingAfterExceptions.map(toRankingEntry),
    adjustedByException: recommendation.adjustedByException(),
    incompleteCharacterization: [...t.incompleteCharacterization],
    factsHash: t.factsHash,
    evaluatedAt: recommendation.generatedAt.toISOString(),
  };
}

function toRecommendedService(c: ScoredCandidate, position: number) {
  return {
    idService: c.idService,
    name: c.serviceName,
    position,
    score: c.total,
  };
}

function toRankingEntry(c: ScoredCandidate, i: number) {
  return {
    position: i + 1,
    idService: c.idService,
    name: c.serviceName,
    score: c.total,
    contributions: {
      bottleneck: {
        value: c.contributions.bottleneck.value,
        details: c.contributions.bottleneck.details.map((d) => ({ ...d })),
      },
      gaps: {
        value: c.contributions.gaps.value,
        details: c.contributions.gaps.details.map((d) => ({ ...d })),
      },
      imbalances: {
        value: c.contributions.imbalances.value,
        details: c.contributions.imbalances.details.map((d) => ({ ...d })),
      },
      stageAffinity: { ...c.contributions.stageAffinity },
      rangePenalty: { ...c.contributions.rangePenalty },
    },
  };
}

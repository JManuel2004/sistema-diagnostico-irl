import type {
  RecommendationResponse,
  LayerTraceResponse,
} from '@innlab/contracts';
import type { Recommendation } from '../../domain/entities/recommendation.aggregate.js';
import type { ScoredCandidate } from '../../domain/value-objects/scored-candidate.vo.js';

/**
 * Maps the aggregate to the public response.
 *
 * The response to the initiative leader does NOT include the trace. They
 * are two different audiences: whoever receives the recommendation needs to
 * know what is suggested and why in plain words; whoever audits it needs
 * the breakdown by layers. Mixing them would turn the result screen into a
 * calculation dump.
 */
export function toRecommendationResponse(
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
 * Maps the trace. Audience: the INNLAB team.
 *
 * `adjustedByException` is derived from the aggregate and not recalculated
 * here: it is the statement that the recommended service is not the one
 * that won the calculation, and it has to come from a single place.
 */
export function toLayerTraceResponse(
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

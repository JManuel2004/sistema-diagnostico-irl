import {
  DIMENSION_CODES,
  type DimensionCode,
  type PhaseServiceTrace,
} from '@innlab/contracts';
import { type RoutingConfigurationRepositoryPort } from '../../domain/repositories/routing-configuration.repository.port.js';
import { type InitiativeCharacterizationPort } from '../../domain/repositories/initiative-characterization.port.js';
import type { OrdinalTranslatorService } from '../../domain/services/ordinal-translator.service.js';
import type { EligibilityFilterService } from '../../domain/services/eligibility-filter.service.js';
import type { AffinityScorerService } from '../../domain/services/affinity-scorer.service.js';
import type { ExceptionEngineService } from '../../domain/services/exception-engine.service.js';
import type {
  PhaseAffinityScorerService,
  PhaseCandidate,
  PhaseDimensionWork,
} from '../../domain/services/phase-affinity-scorer.service.js';
import { factsFromLevels } from '../../domain/services/projected-facts.js';
import { Recommendation } from '../../domain/entities/recommendation.aggregate.js';
import {
  isIncluded,
  type RankedCandidate,
  type ScoredCandidate,
} from '../../domain/value-objects/scored-candidate.vo.js';
import { RoutingConfigurationMissingError } from '../../domain/exceptions/routing.errors.js';
import { Result } from '../../../../shared/kernel/domain/result.js';

export interface EvaluatePhaseServiceQueryInput {
  /** Whose initiative: its characterization feeds the exclusions and the stage. */
  readonly diagnosticId: string;
  /** The profile projected to the start of the phase. */
  readonly levels: Readonly<Record<DimensionCode, number>>;
  /** The dimensions the phase raises, and how much. */
  readonly work: readonly PhaseDimensionWork[];
  /** The tier of the previous phase's service: the route never goes lighter. */
  readonly minimumTierOrder: number;
  /** Services already proposed by earlier phases: the route does not repeat them. */
  readonly excludedServiceIds: readonly number[];
  /**
   * `RECOMMENDATION` opens the route with the portfolio recommendation
   * itself; `PHASE` chooses by the dimensions of the phase.
   */
  readonly mode: 'RECOMMENDATION' | 'PHASE';
}

export interface PhaseServiceEvaluation {
  readonly service: {
    readonly idService: number;
    readonly name: string;
    readonly tierOrder: number;
    /** No service reached the phase's minimum: this is the best available. */
    readonly approximate: boolean;
  } | null;
  readonly trace: PhaseServiceTrace;
}

/**
 * The service a phase of the roadmap could contract — a read-only query
 * `routing/` exports to `roadmap/`, which reaches it behind its own port.
 *
 * It evaluates the live configuration on a projected profile and writes
 * nothing. Exclusions and adjustments are the configuration's own: they
 * apply to the projected facts exactly as to measured ones.
 *
 *  - `RECOMMENDATION` mode runs the recommendation's three layers on the
 *    profile and returns its first recommendable place, so the route opens
 *    with the same service the recommendation shows. If none is
 *    recommendable, it falls back to the phase mode.
 *  - `PHASE` mode scores the services by how they work the dimensions of
 *    the phase (`PhaseAffinityScorerService`). Services of a lighter tier
 *    than the previous phase's, and those already proposed, are left out
 *    before the adjustments, and an included one is dropped after them for
 *    the same reasons. The first place that reaches the phase's threshold
 *    (an included one is exempt) is the service; if none does, the best one
 *    is shown marked as approximate.
 */
export class EvaluatePhaseServiceQuery {
  constructor(
    private readonly configuration: RoutingConfigurationRepositoryPort,
    private readonly characterizations: InitiativeCharacterizationPort,
    private readonly translator: OrdinalTranslatorService,
    private readonly eligibility: EligibilityFilterService,
    private readonly scorer: AffinityScorerService,
    private readonly phaseScorer: PhaseAffinityScorerService,
    private readonly exceptions: ExceptionEngineService,
  ) {}

  async execute(
    input: EvaluatePhaseServiceQueryInput,
  ): Promise<Result<PhaseServiceEvaluation, RoutingConfigurationMissingError>> {
    const config = await this.configuration.load();
    if (!config) {
      return Result.err(
        new RoutingConfigurationMissingError({
          diagnosticId: input.diagnosticId,
        }),
      );
    }
    const characterization = await this.characterizations.findByDiagnosticId(
      input.diagnosticId,
    );
    const facts = factsFromLevels(
      input.diagnosticId,
      input.levels,
      characterization,
    );
    const tierOf = (idService: number): number =>
      config.tierOrderByService.get(idService) ?? 1;

    const numeric = this.translator.translate(config.profiles, config.scale);
    const { eligible, excluded } = this.eligibility.filter(
      numeric,
      config.eligibilityRules,
      facts,
    );
    const baseTrace = {
      projectedLevels: Object.fromEntries(
        DIMENSION_CODES.map((c) => [c, input.levels[c]]),
      ),
      averageLevel: round3(facts.averageLevel),
      excluded: excluded.map((e) => ({
        name: e.name,
        message: e.exclusionMessage,
      })),
    };

    if (input.mode === 'RECOMMENDATION') {
      const ranking = this.scorer
        .score(eligible, facts, config.parameters)
        .sort(compareCandidates);
      const result = this.exceptions.apply(
        ranking,
        config.exceptionRules,
        facts,
        config.adjustmentOnlyServices,
      );
      const [primary] = Recommendation.aboveThreshold(
        result.finalRanking,
        config.parameters.minimumThreshold,
      );
      if (primary) {
        return Result.ok({
          service: {
            idService: primary.idService,
            name: primary.serviceName,
            tierOrder: tierOf(primary.idService),
            approximate: false,
          },
          trace: {
            mode: 'RECOMMENDATION',
            ...baseTrace,
            skipped: [],
            ranking: result.finalRanking.map((c, i) =>
              toEntry(c, i, tierOf, new Map()),
            ),
            appliedAdjustments: result.applied.map(toAdjustment),
          },
        });
      }
    }

    const used = new Set(input.excludedServiceIds);
    const skipReason = (
      idService: number,
    ): 'LIGHTER_TIER' | 'ALREADY_IN_ROUTE' | null =>
      used.has(idService)
        ? 'ALREADY_IN_ROUTE'
        : tierOf(idService) < input.minimumTierOrder
          ? 'LIGHTER_TIER'
          : null;

    const skipped: {
      name: string;
      reason: 'LIGHTER_TIER' | 'ALREADY_IN_ROUTE';
    }[] = [];
    const allowed = eligible.filter((p) => {
      const reason = skipReason(p.idService);
      if (reason) skipped.push({ name: p.serviceName, reason });
      return reason === null;
    });

    const scored = this.phaseScorer
      .score(
        allowed,
        input.work,
        facts,
        config.parameters,
        config.phaseParameters,
      )
      .sort(compareCandidates);
    const coverage = new Map(scored.map((c) => [c.idService, c] as const));
    const result = this.exceptions.apply(
      scored,
      config.exceptionRules,
      facts,
      config.adjustmentOnlyServices,
    );
    const ranking = result.finalRanking.filter((c) => {
      if (!isIncluded(c)) return true;
      const reason = skipReason(c.idService);
      if (reason) skipped.push({ name: c.serviceName, reason });
      return reason === null;
    });

    const fitting = ranking.find(
      (c) =>
        isIncluded(c) || c.total >= config.phaseParameters.minimumThreshold,
    );
    const chosen = fitting ?? ranking[0];

    return Result.ok({
      service: chosen
        ? {
            idService: chosen.idService,
            name: chosen.serviceName,
            tierOrder: tierOf(chosen.idService),
            approximate: fitting === undefined,
          }
        : null,
      trace: {
        mode: 'PHASE',
        ...baseTrace,
        skipped,
        ranking: ranking.map((c, i) => toEntry(c, i, tierOf, coverage)),
        appliedAdjustments: result.applied.map(toAdjustment),
      },
    });
  }
}

/** Score descending and, on an exact tie, `idService` ascending — as the recommendation. */
function compareCandidates(a: ScoredCandidate, b: ScoredCandidate): number {
  if (b.total !== a.total) return b.total - a.total;
  return a.idService - b.idService;
}

function toEntry(
  c: RankedCandidate,
  i: number,
  tierOf: (idService: number) => number,
  coverage: ReadonlyMap<number, PhaseCandidate>,
): PhaseServiceTrace['ranking'][number] {
  const covered = coverage.get(c.idService)?.coverage.details ?? [];
  return {
    position: i + 1,
    idService: c.idService,
    name: c.serviceName,
    score: isIncluded(c) ? null : c.total,
    tierOrder: tierOf(c.idService),
    includedBy: isIncluded(c) ? { ...c.includedBy } : null,
    coverage: covered.map((d) => ({
      dimension: d.dimension,
      sourceLabel: d.sourceLabel,
      levels: d.levels,
    })),
  };
}

function toAdjustment(
  a: ReturnType<ExceptionEngineService['apply']>['applied'][number],
): PhaseServiceTrace['appliedAdjustments'][number] {
  return {
    code: a.code,
    action: a.action,
    targetService: a.targetService,
    declaredReason: a.declaredReason,
    effect: a.effect,
  };
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

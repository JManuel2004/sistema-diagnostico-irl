import type { EventPublisher } from '../../../../shared/kernel/application/ports/event-publisher.port.js';
import { createHash } from 'node:crypto';
import type {
  DimensionCode,
  DiagnosticFacts,
  RecommendationResponse,
} from '@innlab/contracts';
import { type RoutingConfigurationRepositoryPort } from '../../domain/repositories/routing-configuration.repository.port.js';
import { type RecommendationRepositoryPort } from '../../domain/repositories/recommendation.repository.port.js';
import { type InitiativeCharacterizationPort } from '../../domain/repositories/initiative-characterization.port.js';
import type { OrdinalTranslatorService } from '../../domain/services/ordinal-translator.service.js';
import type { EligibilityFilterService } from '../../domain/services/eligibility-filter.service.js';
import type { AffinityScorerService } from '../../domain/services/affinity-scorer.service.js';
import type { ExceptionEngineService } from '../../domain/services/exception-engine.service.js';
import { Recommendation } from '../../domain/entities/recommendation.aggregate.js';
import { PortfolioRecommendationCalculatedEvent } from '../../../../shared/kernel/events/portfolio-recommendation-calculated.event.js';
import {
  RoutingConfigurationMissingError,
  ProfileNotComputedError,
} from '../../domain/exceptions/routing.errors.js';
import type { GetMaturityProfileUseCase } from '../../../diagnosis/application/use-cases/get-maturity-profile.use-case.js';
import { irlLevelsByDimension } from '../../../../shared/irl-taxonomy/domain/services/irl-levels-by-dimension.js';
import { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import { toRecommendationResponse } from '../dtos/map-recommendation-response.js';

export interface GenerateRecommendationCommand {
  diagnosticId: string;
}

/**
 * Orchestrates the three layers of the engine and persists the result.
 *
 * The use case resolves the IO — profile, characterization, live
 * configuration — and then chains four pure domain services. None of them
 * touches the database, so the engine can be exercised whole without
 * booting the application.
 */
export class GenerateRecommendationUseCase {
  constructor(
    private readonly configuration: RoutingConfigurationRepositoryPort,
    private readonly recommendations: RecommendationRepositoryPort,
    private readonly characterizations: InitiativeCharacterizationPort,
    private readonly maturityProfiles: GetMaturityProfileUseCase,
    private readonly translator: OrdinalTranslatorService,
    private readonly eligibility: EligibilityFilterService,
    private readonly scorer: AffinityScorerService,
    private readonly exceptions: ExceptionEngineService,
    private readonly events: EventPublisher,
  ) {}

  async execute(
    cmd: GenerateRecommendationCommand,
  ): Promise<
    Result<
      RecommendationResponse,
      RoutingConfigurationMissingError | ProfileNotComputedError
    >
  > {
    const diagnosticId = Uuid.create(cmd.diagnosticId);

    const config = await this.configuration.load();
    if (!config) {
      return Result.err(
        new RoutingConfigurationMissingError({
          diagnosticId: diagnosticId.value,
        }),
      );
    }

    const builtFacts = await this.buildFacts(diagnosticId.value);
    if (!builtFacts.ok) {
      return Result.err(builtFacts.error);
    }
    const { facts, dimensionNames } = builtFacts.value;

    // ── Layer 0: translate the ordinal vocabulary into numbers ─────────
    const numericProfiles = this.translator.translate(
      config.profiles,
      config.scale,
    );

    // ── Layer 1: hard filter ────────────────────────────────────────────
    const { eligible, excluded } = this.eligibility.filter(
      numericProfiles,
      config.eligibilityRules,
      facts,
    );

    // ── Layer 2: affinity calculation ────────────────────────────────────
    const scored = this.scorer.score(eligible, facts, config.parameters);
    const initialRanking = [...scored].sort(compareCandidates);

    // ── Layer 3: manual adjustments ──────────────────────────────────────
    // Adjustment-only services never reached layers 1 and 2: the
    // configuration keeps them apart, and only an INCLUDE here puts them
    // into the ranking.
    const { finalRanking, applied, discarded } = this.exceptions.apply(
      initialRanking,
      config.exceptionRules,
      facts,
      config.adjustmentOnlyServices,
    );

    const recommendation = Recommendation.create({
      diagnosticId,
      finalRanking: finalRanking,
      minimumThreshold: config.parameters.minimumThreshold,
      alternativesCount: config.parameters.alternativesCount,
      justification: buildJustification(finalRanking, applied, dimensionNames),
      noRecommendationReason: null,
      trace: {
        layer1Excluded: excluded,
        rankingBeforeExceptions: initialRanking,
        appliedExceptions: applied,
        discardedExceptions: discarded,
        rankingAfterExceptions: finalRanking,
        incompleteCharacterization: missingCharacterizationFields(facts),
        factsHash: hashOf(facts),
      },
      generatedAt: new Date(),
    });

    await this.recommendations.save(recommendation);

    // Published once the recommendation is persisted; `diagnosis/` hears it
    // to complete the deep analysis.
    await this.events.publish(
      new PortfolioRecommendationCalculatedEvent({
        diagnosticId: diagnosticId.value,
      }),
    );

    const catalog = await this.configuration.findServiceCatalog();
    return Result.ok(toRecommendationResponse(recommendation, catalog));
  }

  /**
   * Builds the facts of the diagnostic.
   *
   * The levels, the bottleneck and the gaps are taken from the computed
   * profile, not from the persisted `dimension_result` columns; the reason
   * is in `irlLevelsByDimension`.
   */
  private async buildFacts(
    diagnosticId: string,
  ): Promise<
    Result<
      { facts: DiagnosticFacts; dimensionNames: ReadonlyMap<string, string> },
      ProfileNotComputedError
    >
  > {
    const result = await this.maturityProfiles.execute({ diagnosticId });
    if (!result.ok) {
      return Result.err(new ProfileNotComputedError(diagnosticId));
    }
    const profile = result.value;

    const characterization =
      await this.characterizations.findByDiagnosticId(diagnosticId);

    const levelByDimension = Object.fromEntries(
      irlLevelsByDimension(profile.dimensionResults),
    ) as Record<DimensionCode, number>;

    const levels = profile.dimensionResults.map((r) => r.irlLevel);
    const averageLevel = levels.reduce((a, b) => a + b, 0) / levels.length;

    // Names for the justification, which the initiative leader reads: it must
    // say «Negocio», not `BRL`.
    const dimensionNames = new Map(
      profile.dimensionResults.map((r) => [r.dimensionCode, r.shortName]),
    );

    const facts: DiagnosticFacts = {
      diagnosticId,
      levelByDimension,
      bottlenecks: profile.bottleneck.dimensions,
      gaps: profile.gaps.dimensions,
      // The HTTP contract exposes the classifications in lowercase;
      // the engine's domain works with the framework's uppercase codes.
      imbalances: (profile.imbalances ?? []).map((i) => ({
        left: i.left,
        right: i.right,
        difference: i.difference,
        classification:
          i.classification === 'critical'
            ? ('CRITICAL' as const)
            : i.classification === 'moderate'
              ? ('MODERATE' as const)
              : ('ACCEPTABLE' as const),
      })),
      averageLevel,
      characterization,
    };
    return Result.ok({ facts, dimensionNames });
  }
}

/**
 * Ranking order: score descending and, on an exact tie, `idService`
 * ascending.
 *
 * Breaking the tie by id is not "fair" in any business sense, but it is
 * deterministic and reproducible, which is what the trace requires. A tie
 * for first place is also a sign that the calibration does not
 * discriminate.
 */
function compareCandidates(
  a: { total: number; idService: number },
  b: { total: number; idService: number },
): number {
  if (b.total !== a.total) return b.total - a.total;
  return a.idService - b.idService;
}

function missingCharacterizationFields(facts: DiagnosticFacts): string[] {
  const c = facts.characterization;
  const missing: string[] = [];
  if (c.stage === null) missing.push('stage');
  if (c.sector === null) missing.push('sector');
  if (c.teamSize === null) missing.push('teamSize');
  return missing;
}

/**
 * Fingerprint of the input facts. When re-reading an old recommendation,
 * it allows checking that the same profile is being evaluated and not one
 * that changed underneath.
 */
function hashOf(facts: DiagnosticFacts): string {
  return createHash('sha256').update(JSON.stringify(facts)).digest('hex');
}

/**
 * Justification in the framework's vocabulary, not in numbers or codes.
 *
 * When a manual adjustment decides first place, it says so explicitly and
 * quotes its declared reason: a recommendation that comes from a decision
 * of the center and not from the calculation has to be presented as such.
 *
 * Dimensions are named by their short catalog name: the text is read by
 * the initiative leader, who does not know the framework's acronyms.
 */
/** What the justification reads of a place: a calculated one or an included one. */
type JustifiedPlace = { readonly serviceName: string } & (
  | { readonly includedBy: { readonly declaredReason: string } }
  | {
      readonly contributions: {
        readonly bottleneck: {
          readonly details: readonly {
            dimension: string;
            sourceLabel: string;
          }[];
        };
      };
    }
);

export function buildJustification(
  ranking: readonly JustifiedPlace[],
  applied: readonly { targetService: string; declaredReason: string }[],
  dimensionNames: ReadonlyMap<string, string>,
): string | null {
  const winner = ranking[0];
  if (!winner) return null;

  const decisive = applied.find((e) => e.targetService === winner.serviceName);
  if (decisive) {
    return `${winner.serviceName} — ${decisive.declaredReason}`;
  }
  // An included service always has a decisive adjustment (the INCLUDE);
  // this only narrows the type.
  if ('includedBy' in winner) {
    return `${winner.serviceName} — ${winner.includedBy.declaredReason}`;
  }

  const focus = winner.contributions.bottleneck.details
    .filter((d) => d.sourceLabel !== 'not_applicable')
    .map((d) => dimensionNames.get(d.dimension) ?? d.dimension);
  const enumerated =
    focus.length > 1
      ? `${focus.slice(0, -1).join(', ')} y ${focus[focus.length - 1]}`
      : focus.join('');

  return focus.length > 0
    ? `${winner.serviceName} atiende de forma directa la dimensión más rezagada de tu iniciativa: ${enumerated}.`
    : `${winner.serviceName} es el servicio con mayor afinidad global con el perfil de la iniciativa.`;
}

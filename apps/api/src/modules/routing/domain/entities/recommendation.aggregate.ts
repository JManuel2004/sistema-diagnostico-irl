import { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import type { ScoredCandidate } from '../value-objects/scored-candidate.vo.js';
import type {
  AppliedException,
  DiscardedException,
} from '../services/exception-engine.service.js';
import type { ExcludedService } from '../services/eligibility-filter.service.js';

/**
 * `Recommendation` — root of the routing result aggregate.
 *
 * One per diagnostic, guaranteed by the table's `UNIQUE (id_diagnostic)`:
 * RF-15 asks for exactly one recommendation, not a ranked list. The
 * alternatives are subordinate, not parallel recommendations.
 *
 * `NO_RECOMMENDATION` is a legitimate outcome, not a failure. RF-15 requires
 * the system never to return an empty or ambiguous recommendation; it does
 * not require it to always find one. If every candidate was excluded or none
 * cleared the threshold, that is said explicitly.
 */
export type ResultType = 'RECOMMENDATION' | 'NO_RECOMMENDATION';

export interface EvaluationTrace {
  readonly layer1Excluded: readonly ExcludedService[];
  readonly rankingBeforeExceptions: readonly ScoredCandidate[];
  readonly appliedExceptions: readonly AppliedException[];
  readonly discardedExceptions: readonly DiscardedException[];
  readonly rankingAfterExceptions: readonly ScoredCandidate[];
  readonly incompleteCharacterization: readonly string[];
  readonly factsHash: string;
}

export class Recommendation {
  private constructor(
    public readonly diagnosticId: Uuid,
    public readonly resultType: ResultType,
    public readonly primary: ScoredCandidate | null,
    public readonly alternatives: readonly ScoredCandidate[],
    public readonly justification: string | null,
    public readonly noRecommendationReason: string | null,
    public readonly trace: EvaluationTrace,
    public readonly generatedAt: Date,
  ) {}

  static create(input: {
    diagnosticId: Uuid;
    finalRanking: readonly ScoredCandidate[];
    minimumThreshold: number;
    alternativesCount: number;
    justification: string | null;
    noRecommendationReason: string | null;
    trace: EvaluationTrace;
    generatedAt: Date;
  }): Recommendation {
    const aboveThreshold = input.finalRanking.filter(
      (c) => c.total >= input.minimumThreshold,
    );

    if (aboveThreshold.length === 0) {
      return new Recommendation(
        input.diagnosticId,
        'NO_RECOMMENDATION',
        null,
        [],
        null,
        input.noRecommendationReason ??
          'Ningún service del portafolio alcanzó la pertinencia mínima para este perfil.',
        input.trace,
        input.generatedAt,
      );
    }

    return new Recommendation(
      input.diagnosticId,
      'RECOMMENDATION',
      aboveThreshold[0],
      aboveThreshold.slice(1, 1 + input.alternativesCount),
      input.justification,
      null,
      input.trace,
      input.generatedAt,
    );
  }

  /**
   * Rehydrates from persistence. The trace is kept whole because it is what
   * makes an old recommendation explainable.
   */
  static fromPersistence(row: {
    diagnosticId: string;
    resultType: ResultType;
    primary: ScoredCandidate | null;
    alternatives: readonly ScoredCandidate[];
    justification: string | null;
    noRecommendationReason: string | null;
    trace: EvaluationTrace;
    generatedAt: Date;
  }): Recommendation {
    return new Recommendation(
      Uuid.create(row.diagnosticId),
      row.resultType,
      row.primary,
      row.alternatives,
      row.justification,
      row.noRecommendationReason,
      row.trace,
      row.generatedAt,
    );
  }

  /**
   * True when the recommended service is NOT the one that won the
   * calculation, but one that a manual adjustment put there.
   *
   * This is the distinction that separates an auditable system from one that
   * looks objective without being so, which is why the aggregate derives it
   * instead of leaving it to whoever draws the screen.
   */
  adjustedByException(): boolean {
    const calculatedWinner = this.trace.rankingBeforeExceptions[0];
    const finalWinner = this.trace.rankingAfterExceptions[0];
    if (!calculatedWinner || !finalWinner) return false;
    return calculatedWinner.idService !== finalWinner.idService;
  }
}

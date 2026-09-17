import { Uuid } from '../../../../shared-kernel/domain/value-objects/uuid.vo.js';
import type { ScoredCandidate } from '../value-objects/scored-candidate.vo.js';
import type {
  AppliedException,
  DiscardedException,
} from '../services/exception-engine.service.js';
import type { ExcludedService } from '../services/eligibility-filter.service.js';

/**
 * `Recommendation` — raíz del agregado del resultado de enrutamiento.
 *
 * Una por diagnóstico, garantizado por el `UNIQUE (id_diagnostico)` de la
 * tabla: RF-15 pide exactamente una recomendación, no una lista ordenada.
 * Las alternatives son subordinadas, no recomendaciones paralelas.
 *
 * `SIN_RECOMENDACION` es un desenlace legítimo, no un fallo. RF-15 exige
 * que el sistema no devuelva una recomendación vacía ni ambigua; no exige
 * que siempre encuentre una. Si todos los candidatos quedaron excluidos o
 * ninguno superó el umbral, eso se dice explícitamente.
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
    public readonly idConfigurationVersion: string,
    public readonly idCalibrationSnapshot: string,
    public readonly idParametersSnapshot: string,
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
    idConfigurationVersion: string;
    idCalibrationSnapshot: string;
    idParametersSnapshot: string;
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
        input.idConfigurationVersion,
        input.idCalibrationSnapshot,
        input.idParametersSnapshot,
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
      input.idConfigurationVersion,
      input.idCalibrationSnapshot,
      input.idParametersSnapshot,
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
   * Rehidrata desde persistencia. La traza se conserva completa porque es
   * lo que hace explicable una recomendación antigua.
   */
  static fromPersistence(row: {
    diagnosticId: string;
    idConfigurationVersion: string;
    idCalibrationSnapshot: string;
    idParametersSnapshot: string;
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
      row.idConfigurationVersion,
      row.idCalibrationSnapshot,
      row.idParametersSnapshot,
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
   * Verdadero cuando el servicio recomendado NO es el que ganó el
   * cálculo, sino uno que un ajuste puntual colocó ahí.
   *
   * Es la distinción que separa un sistema auditable de uno que parece
   * objetivo sin serlo, y por eso se deriva del agregado en vez de
   * dejarla a criterio de quien pinte la pantalla.
   */
  adjustedByException(): boolean {
    const ganadorCalculo = this.trace.rankingBeforeExceptions[0];
    const ganadorFinal = this.trace.rankingAfterExceptions[0];
    if (!ganadorCalculo || !ganadorFinal) return false;
    return ganadorCalculo.idService !== ganadorFinal.idService;
  }
}

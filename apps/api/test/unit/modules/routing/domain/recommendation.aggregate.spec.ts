import { describe, expect, it } from '@jest/globals';
import {
  Recommendation,
  type EvaluationTrace,
} from '../../../../../src/modules/routing/domain/entities/recommendation.aggregate.js';
import type { ScoredCandidate } from '../../../../../src/modules/routing/domain/value-objects/scored-candidate.vo.js';
import { Uuid } from '../../../../../src/shared/kernel/domain/value-objects/uuid.vo.js';
import {
  CalibrationNotMonotonicError,
  RoutingConfigurationMissingError,
  PredicateCompilationError,
  ProfileNotComputedError,
  RecommendationNotGeneratedError,
} from '../../../../../src/modules/routing/domain/exceptions/routing.errors.js';
import { ROUTING_CONFIGURATION_REPOSITORY } from '../../../../../src/modules/routing/domain/repositories/routing-configuration.repository.port.js';
import { RECOMMENDATION_REPOSITORY } from '../../../../../src/modules/routing/domain/repositories/recommendation.repository.port.js';
import { INITIATIVE_CHARACTERIZATION_READER } from '../../../../../src/modules/routing/domain/repositories/initiative-characterization.port.js';

const DIAG = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const noContributions: ScoredCandidate['contributions'] = {
  bottleneck: { value: 0, details: [] },
  gaps: { value: 0, details: [] },
  imbalances: { value: 0, details: [] },
  stageAffinity: { value: 0, matches: false },
  rangePenalty: { value: 0, applied: false },
};

const cand = (id: number, name: string, total: number): ScoredCandidate => ({
  idService: id,
  serviceName: name,
  contributions: noContributions,
  total,
});

function trace(over: Partial<EvaluationTrace> = {}): EvaluationTrace {
  return {
    layer1Excluded: [],
    rankingBeforeExceptions: [],
    appliedExceptions: [],
    discardedExceptions: [],
    rankingAfterExceptions: [],
    incompleteCharacterization: [],
    factsHash: 'a'.repeat(64),
    ...over,
  };
}

function buildRecommendation(
  ranking: ScoredCandidate[],
  over: { minimumThreshold?: number; alternativesCount?: number; trace?: EvaluationTrace } = {},
) {
  return Recommendation.create({
    diagnosticId: Uuid.create(DIAG),
    finalRanking: ranking,
    minimumThreshold: over.minimumThreshold ?? 2.5,
    alternativesCount: over.alternativesCount ?? 2,
    justification: 'porque sí',
    noRecommendationReason: null,
    trace: over.trace ?? trace(),
    generatedAt: new Date('2026-09-07T14:30:00.000Z'),
  });
}

describe('Recommendation (agregado)', () => {
  it('toma como primary el primero por encima del threshold', () => {
    const r = buildRecommendation([
      cand(3, 'Consultoría', 5.55),
      cand(2, 'Mentoría', 3.8),
      cand(5, 'Proyectos Integradores', 3.05),
    ]);

    expect(r.resultType).toBe('RECOMMENDATION');
    expect(r.primary?.serviceName).toBe('Consultoría');
  });

  it('limita las alternatives a `alternativesCount` y nunca incluye la primary', () => {
    const r = buildRecommendation(
      [
        cand(3, 'Consultoría', 5.55),
        cand(2, 'Mentoría', 3.8),
        cand(5, 'Proyectos Integradores', 3.05),
        cand(1, 'Formación', 3.0),
      ],
      { alternativesCount: 2 },
    );

    expect(r.alternatives.map((a) => a.serviceName)).toEqual([
      'Mentoría',
      'Proyectos Integradores',
    ]);
  });

  it('descarta del ranking a los que no llegan al threshold', () => {
    const r = buildRecommendation(
      [cand(3, 'Consultoría', 5.55), cand(2, 'Mentoría', 1.2)],
      { minimumThreshold: 2.5 },
    );

    expect(r.alternatives).toHaveLength(0);
  });

  it('devuelve SIN_RECOMENDACION cuando nadie supera el threshold', () => {
    // It is a legitimate outcome, not a failure: RF-15 asks the system not
    // to return an empty or ambiguous recommendation, not to always find
    // one.
    const r = buildRecommendation([cand(3, 'Consultoría', 1.0)], { minimumThreshold: 2.5 });

    expect(r.resultType).toBe('NO_RECOMMENDATION');
    expect(r.primary).toBeNull();
    expect(r.alternatives).toEqual([]);
    expect(r.justification).toBeNull();
    expect(r.noRecommendationReason).toContain('pertinencia mínima');
  });

  it('devuelve SIN_RECOMENDACION cuando no queda ningún candidate', () => {
    const r = buildRecommendation([]);
    expect(r.resultType).toBe('NO_RECOMMENDATION');
  });

  describe('adjustedByException', () => {
    it('es falso cuando el ganador del cálculo también gana al final', () => {
      const r = buildRecommendation([cand(3, 'Consultoría', 5.55)], {
        trace: trace({
          rankingBeforeExceptions: [cand(3, 'Consultoría', 5.55)],
          rankingAfterExceptions: [cand(3, 'Consultoría', 5.55)],
        }),
      });
      expect(r.adjustedByException()).toBe(false);
    });

    it('es verdadero cuando un ajuste desplazó al ganador del cálculo', () => {
      // The distinction that separates an auditable system from one that
      // looks objective without being so, which is why it is derived from the
      // aggregate and not from the UI.
      const r = buildRecommendation([cand(4, 'Retos en el Aula', 3.4)], {
        trace: trace({
          rankingBeforeExceptions: [cand(3, 'Consultoría', 5.55)],
          rankingAfterExceptions: [cand(4, 'Retos en el Aula', 3.4)],
        }),
      });
      expect(r.adjustedByException()).toBe(true);
    });

    it('es falso si la trace está vacía, en vez de reventar', () => {
      expect(buildRecommendation([cand(3, 'C', 5)]).adjustedByException()).toBe(false);
    });
  });

  it('se rehidrata desde persistencia conservando la trace', () => {
    const t = trace({ incompleteCharacterization: ['stage'] });
    const r = Recommendation.fromPersistence({
      diagnosticId: DIAG,
      resultType: 'RECOMMENDATION',
      primary: cand(3, 'Consultoría', 5.55),
      alternatives: [cand(2, 'Mentoría', 3.8)],
      justification: 'porque sí',
      noRecommendationReason: null,
      trace: t,
      generatedAt: new Date('2026-09-07T14:30:00.000Z'),
    });

    expect(r.primary?.serviceName).toBe('Consultoría');
    expect(r.trace.incompleteCharacterization).toEqual(['stage']);
    expect(r.diagnosticId.value).toBe(DIAG);
  });
});

describe('errores del módulo de enrutamiento', () => {
  it('cada error expone un código estable, que es el contrato del cliente', () => {
    expect(new RoutingConfigurationMissingError().code).toBe(
      'ROUTING_CONFIGURATION_MISSING',
    );
    expect(new ProfileNotComputedError(DIAG).code).toBe(
      'ROUTING_PROFILE_NOT_COMPUTED',
    );
    expect(new RecommendationNotGeneratedError(DIAG).code).toBe(
      'ROUTING_RECOMMENDATION_NOT_GENERATED',
    );
    expect(new PredicateCompilationError('x').code).toBe(
      'ROUTING_PREDICATE_COMPILATION_FAILED',
    );
    expect(new CalibrationNotMonotonicError('x').code).toBe(
      'ROUTING_CALIBRATION_NOT_MONOTONIC',
    );
  });

  it('los mensajes nombran el diagnóstico afectado', () => {
    expect(new ProfileNotComputedError(DIAG).message).toContain(DIAG);
    expect(new RecommendationNotGeneratedError(DIAG).message).toContain(DIAG);
  });

  it('los puertos se identifican por símbolo, no por name de clase', () => {
    // It is what lets the application depend on the port and never on
    // the concrete adapter.
    expect(typeof ROUTING_CONFIGURATION_REPOSITORY).toBe('symbol');
    expect(typeof RECOMMENDATION_REPOSITORY).toBe('symbol');
    expect(typeof INITIATIVE_CHARACTERIZATION_READER).toBe('symbol');
  });
});

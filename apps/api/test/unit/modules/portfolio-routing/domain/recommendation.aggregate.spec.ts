import { describe, expect, it } from '@jest/globals';
import {
  Recommendation,
  type EvaluationTrace,
} from '../../../../../src/modules/portfolio-routing/domain/entities/recommendation.aggregate.js';
import type { ScoredCandidate } from '../../../../../src/modules/portfolio-routing/domain/value-objects/scored-candidate.vo.js';
import { Uuid } from '../../../../../src/shared/kernel/domain/value-objects/uuid.vo.js';
import {
  CalibrationNotMonotonicError,
  NoActiveConfigurationError,
  PredicateCompilationError,
  ProfileNotComputedError,
  RecommendationNotGeneratedError,
  RoutingConfigurationError,
} from '../../../../../src/modules/portfolio-routing/domain/errors/portfolio-routing.errors.js';
import { ACTIVE_CONFIGURATION_REPOSITORY } from '../../../../../src/modules/portfolio-routing/domain/ports/active-configuration.repository.port.js';
import { RECOMMENDATION_REPOSITORY } from '../../../../../src/modules/portfolio-routing/domain/ports/recommendation.repository.port.js';
import { INITIATIVE_CHARACTERIZATION_READER } from '../../../../../src/modules/portfolio-routing/domain/ports/initiative-characterization.port.js';

const DIAG = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const sinAportes: ScoredCandidate['contributions'] = {
  bottleneck: { value: 0, details: [] },
  gaps: { value: 0, details: [] },
  imbalances: { value: 0, details: [] },
  stageAffinity: { value: 0, matches: false },
  rangePenalty: { value: 0, applied: false },
};

const cand = (id: number, name: string, total: number): ScoredCandidate => ({
  idService: id,
  serviceName: name,
  contributions: sinAportes,
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

function crear(
  ranking: ScoredCandidate[],
  over: { minimumThreshold?: number; alternativesCount?: number; trace?: EvaluationTrace } = {},
) {
  return Recommendation.create({
    diagnosticId: Uuid.create(DIAG),
    idConfigurationVersion: '1',
    idCalibrationSnapshot: '1',
    idParametersSnapshot: '1',
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
    const r = crear([
      cand(3, 'Consultoría', 5.55),
      cand(2, 'Mentoría', 3.8),
      cand(5, 'Proyectos Integradores', 3.05),
    ]);

    expect(r.resultType).toBe('RECOMMENDATION');
    expect(r.primary?.serviceName).toBe('Consultoría');
  });

  it('limita las alternatives a `alternativesCount` y nunca incluye la primary', () => {
    const r = crear(
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
    const r = crear(
      [cand(3, 'Consultoría', 5.55), cand(2, 'Mentoría', 1.2)],
      { minimumThreshold: 2.5 },
    );

    expect(r.alternatives).toHaveLength(0);
  });

  it('devuelve SIN_RECOMENDACION cuando nadie supera el threshold', () => {
    // Es un desenlace legítimo, no un fallo: RF-15 pide que el sistema no
    // devuelva una recomendación vacía ni ambigua, no que siempre
    // encuentre una.
    const r = crear([cand(3, 'Consultoría', 1.0)], { minimumThreshold: 2.5 });

    expect(r.resultType).toBe('NO_RECOMMENDATION');
    expect(r.primary).toBeNull();
    expect(r.alternatives).toEqual([]);
    expect(r.justification).toBeNull();
    expect(r.noRecommendationReason).toContain('pertinencia mínima');
  });

  it('devuelve SIN_RECOMENDACION cuando no queda ningún candidate', () => {
    const r = crear([]);
    expect(r.resultType).toBe('NO_RECOMMENDATION');
  });

  describe('adjustedByException', () => {
    it('es falso cuando el ganador del cálculo también gana al final', () => {
      const r = crear([cand(3, 'Consultoría', 5.55)], {
        trace: trace({
          rankingBeforeExceptions: [cand(3, 'Consultoría', 5.55)],
          rankingAfterExceptions: [cand(3, 'Consultoría', 5.55)],
        }),
      });
      expect(r.adjustedByException()).toBe(false);
    });

    it('es verdadero cuando un ajuste desplazó al ganador del cálculo', () => {
      // La distinción que separa un sistema auditable de uno que parece
      // objetivo sin serlo, por eso se deriva del agregado y no de la UI.
      const r = crear([cand(4, 'Retos en el Aula', 3.4)], {
        trace: trace({
          rankingBeforeExceptions: [cand(3, 'Consultoría', 5.55)],
          rankingAfterExceptions: [cand(4, 'Retos en el Aula', 3.4)],
        }),
      });
      expect(r.adjustedByException()).toBe(true);
    });

    it('es falso si la trace está vacía, en vez de reventar', () => {
      expect(crear([cand(3, 'C', 5)]).adjustedByException()).toBe(false);
    });
  });

  it('se rehidrata desde persistencia conservando la trace', () => {
    const t = trace({ incompleteCharacterization: ['stage'] });
    const r = Recommendation.fromPersistence({
      diagnosticId: DIAG,
      idConfigurationVersion: '1',
      idCalibrationSnapshot: '1',
      idParametersSnapshot: '1',
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
    expect(new NoActiveConfigurationError().code).toBe(
      'ROUTING_NO_ACTIVE_CONFIGURATION',
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
    expect(new RoutingConfigurationError('x').code).toBe(
      'ROUTING_CONFIGURATION_INVALID',
    );
  });

  it('los mensajes nombran el diagnóstico afectado', () => {
    expect(new ProfileNotComputedError(DIAG).message).toContain(DIAG);
    expect(new RecommendationNotGeneratedError(DIAG).message).toContain(DIAG);
  });

  it('los puertos se identifican por símbolo, no por name de clase', () => {
    // Es lo que permite que la aplicación dependa del puerto y nunca del
    // adaptador concreto.
    expect(typeof ACTIVE_CONFIGURATION_REPOSITORY).toBe('symbol');
    expect(typeof RECOMMENDATION_REPOSITORY).toBe('symbol');
    expect(typeof INITIATIVE_CHARACTERIZATION_READER).toBe('symbol');
  });
});

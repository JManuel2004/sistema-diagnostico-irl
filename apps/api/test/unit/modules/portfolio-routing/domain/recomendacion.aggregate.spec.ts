import { describe, expect, it } from '@jest/globals';
import {
  Recomendacion,
  type TrazaEvaluacion,
} from '../../../../../src/modules/portfolio-routing/domain/entities/recomendacion.aggregate.js';
import type { CandidatoPuntuado } from '../../../../../src/modules/portfolio-routing/domain/value-objects/candidato-puntuado.vo.js';
import { Uuid } from '../../../../../src/shared-kernel/domain/value-objects/uuid.vo.js';
import {
  CalibrationNotMonotonicError,
  NoActiveConfigurationError,
  PredicateCompilationError,
  ProfileNotComputedError,
  RecommendationNotGeneratedError,
  RoutingConfigurationError,
} from '../../../../../src/modules/portfolio-routing/domain/errors/portfolio-routing.errors.js';
import { ACTIVE_CONFIGURATION_REPOSITORY } from '../../../../../src/modules/portfolio-routing/domain/ports/active-configuration.repository.port.js';
import { RECOMENDACION_REPOSITORY } from '../../../../../src/modules/portfolio-routing/domain/ports/recomendacion.repository.port.js';
import { INITIATIVE_CHARACTERIZATION_READER } from '../../../../../src/modules/portfolio-routing/domain/ports/initiative-characterization.port.js';

const DIAG = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const sinAportes: CandidatoPuntuado['aportes'] = {
  cuelloBotella: { valor: 0, detalle: [] },
  brechas: { valor: 0, detalle: [] },
  desequilibrios: { valor: 0, detalle: [] },
  afinidadEtapa: { valor: 0, coincide: false },
  penalizacionRango: { valor: 0, aplicada: false },
};

const cand = (id: number, nombre: string, total: number): CandidatoPuntuado => ({
  idServicio: id,
  nombreServicio: nombre,
  aportes: sinAportes,
  total,
});

function traza(over: Partial<TrazaEvaluacion> = {}): TrazaEvaluacion {
  return {
    excluidosCapa1: [],
    rankingPreExcepcion: [],
    excepcionesActivadas: [],
    excepcionesDescartadas: [],
    rankingPostExcepcion: [],
    caracterizacionIncompleta: [],
    hashHechos: 'a'.repeat(64),
    ...over,
  };
}

function crear(
  ranking: CandidatoPuntuado[],
  over: { umbralMinimo?: number; nAlternativas?: number; traza?: TrazaEvaluacion } = {},
) {
  return Recomendacion.create({
    diagnosticId: Uuid.create(DIAG),
    idVersionConfiguracion: '1',
    idSnapshotCalibracion: '1',
    idSnapshotParametros: '1',
    rankingFinal: ranking,
    umbralMinimo: over.umbralMinimo ?? 2.5,
    nAlternativas: over.nAlternativas ?? 2,
    justificacion: 'porque sí',
    motivoSinRecomendacion: null,
    traza: over.traza ?? traza(),
    generadaEn: new Date('2026-09-07T14:30:00.000Z'),
  });
}

describe('Recomendacion (agregado)', () => {
  it('toma como principal el primero por encima del umbral', () => {
    const r = crear([
      cand(3, 'Consultoría', 5.55),
      cand(2, 'Mentoría', 3.8),
      cand(5, 'Proyectos Integradores', 3.05),
    ]);

    expect(r.resultadoTipo).toBe('RECOMENDACION');
    expect(r.principal?.nombreServicio).toBe('Consultoría');
  });

  it('limita las alternativas a `nAlternativas` y nunca incluye la principal', () => {
    const r = crear(
      [
        cand(3, 'Consultoría', 5.55),
        cand(2, 'Mentoría', 3.8),
        cand(5, 'Proyectos Integradores', 3.05),
        cand(1, 'Formación', 3.0),
      ],
      { nAlternativas: 2 },
    );

    expect(r.alternativas.map((a) => a.nombreServicio)).toEqual([
      'Mentoría',
      'Proyectos Integradores',
    ]);
  });

  it('descarta del ranking a los que no llegan al umbral', () => {
    const r = crear(
      [cand(3, 'Consultoría', 5.55), cand(2, 'Mentoría', 1.2)],
      { umbralMinimo: 2.5 },
    );

    expect(r.alternativas).toHaveLength(0);
  });

  it('devuelve SIN_RECOMENDACION cuando nadie supera el umbral', () => {
    // Es un desenlace legítimo, no un fallo: RF-15 pide que el sistema no
    // devuelva una recomendación vacía ni ambigua, no que siempre
    // encuentre una.
    const r = crear([cand(3, 'Consultoría', 1.0)], { umbralMinimo: 2.5 });

    expect(r.resultadoTipo).toBe('SIN_RECOMENDACION');
    expect(r.principal).toBeNull();
    expect(r.alternativas).toEqual([]);
    expect(r.justificacion).toBeNull();
    expect(r.motivoSinRecomendacion).toContain('pertinencia mínima');
  });

  it('devuelve SIN_RECOMENDACION cuando no queda ningún candidato', () => {
    const r = crear([]);
    expect(r.resultadoTipo).toBe('SIN_RECOMENDACION');
  });

  describe('ajustadoPorExcepcion', () => {
    it('es falso cuando el ganador del cálculo también gana al final', () => {
      const r = crear([cand(3, 'Consultoría', 5.55)], {
        traza: traza({
          rankingPreExcepcion: [cand(3, 'Consultoría', 5.55)],
          rankingPostExcepcion: [cand(3, 'Consultoría', 5.55)],
        }),
      });
      expect(r.ajustadoPorExcepcion()).toBe(false);
    });

    it('es verdadero cuando un ajuste desplazó al ganador del cálculo', () => {
      // La distinción que separa un sistema auditable de uno que parece
      // objetivo sin serlo, por eso se deriva del agregado y no de la UI.
      const r = crear([cand(4, 'Retos en el Aula', 3.4)], {
        traza: traza({
          rankingPreExcepcion: [cand(3, 'Consultoría', 5.55)],
          rankingPostExcepcion: [cand(4, 'Retos en el Aula', 3.4)],
        }),
      });
      expect(r.ajustadoPorExcepcion()).toBe(true);
    });

    it('es falso si la traza está vacía, en vez de reventar', () => {
      expect(crear([cand(3, 'C', 5)]).ajustadoPorExcepcion()).toBe(false);
    });
  });

  it('se rehidrata desde persistencia conservando la traza', () => {
    const t = traza({ caracterizacionIncompleta: ['etapa'] });
    const r = Recomendacion.fromPersistence({
      diagnosticId: DIAG,
      idVersionConfiguracion: '1',
      idSnapshotCalibracion: '1',
      idSnapshotParametros: '1',
      resultadoTipo: 'RECOMENDACION',
      principal: cand(3, 'Consultoría', 5.55),
      alternativas: [cand(2, 'Mentoría', 3.8)],
      justificacion: 'porque sí',
      motivoSinRecomendacion: null,
      traza: t,
      generadaEn: new Date('2026-09-07T14:30:00.000Z'),
    });

    expect(r.principal?.nombreServicio).toBe('Consultoría');
    expect(r.traza.caracterizacionIncompleta).toEqual(['etapa']);
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

  it('los puertos se identifican por símbolo, no por nombre de clase', () => {
    // Es lo que permite que la aplicación dependa del puerto y nunca del
    // adaptador concreto.
    expect(typeof ACTIVE_CONFIGURATION_REPOSITORY).toBe('symbol');
    expect(typeof RECOMENDACION_REPOSITORY).toBe('symbol');
    expect(typeof INITIATIVE_CHARACTERIZATION_READER).toBe('symbol');
  });
});

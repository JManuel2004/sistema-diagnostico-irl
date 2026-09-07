import { describe, expect, it } from '@jest/globals';
import type { HechosDiagnostico } from '@innlab/contracts';
import {
  ExceptionEngineService,
  type ReglaExcepcionCompilada,
} from '../../../../../src/modules/portfolio-routing/domain/services/exception-engine.service.js';
import type { CandidatoPuntuado } from '../../../../../src/modules/portfolio-routing/domain/value-objects/candidato-puntuado.vo.js';
import { PredicateCompilerService } from '../../../../../src/modules/portfolio-routing/domain/services/predicate-compiler.service.js';

const compiler = new PredicateCompilerService();
const engine = new ExceptionEngineService();

const HECHOS: HechosDiagnostico = {
  diagnosticId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  nivelPorDimension: { TRL: 6, CRL: 4, BRL: 3, IPRL: 1, TmRL: 5, FRL: 2 },
  cuellosBotella: ['IPRL'],
  brechas: ['BRL', 'IPRL', 'FRL'],
  desequilibrios: [
    { izquierda: 'TRL', derecha: 'IPRL', diferencia: 5, clasificacion: 'CRITICO' },
    { izquierda: 'TRL', derecha: 'CRL', diferencia: 2, clasificacion: 'MODERADO' },
    { izquierda: 'TRL', derecha: 'BRL', diferencia: 3, clasificacion: 'MODERADO' },
    { izquierda: 'CRL', derecha: 'BRL', diferencia: 1, clasificacion: 'ACEPTABLE' },
    { izquierda: 'TmRL', derecha: 'FRL', diferencia: 3, clasificacion: 'MODERADO' },
    { izquierda: 'BRL', derecha: 'IPRL', diferencia: 2, clasificacion: 'MODERADO' },
  ],
  nivelPromedio: 3.5,
  caracterizacion: {
    etapa: 'validacion',
    sector: null,
    tamanoEquipo: 3,
    vinculacionAcademica: false,
  },
};

const SIN_APORTES: CandidatoPuntuado['aportes'] = {
  cuelloBotella: { valor: 0, detalle: [] },
  brechas: { valor: 0, detalle: [] },
  desequilibrios: { valor: 0, detalle: [] },
  afinidadEtapa: { valor: 0, coincide: false },
  penalizacionRango: { valor: 0, aplicada: false },
};

/** Ranking de cinco servicios, ids 1..5, puntajes descendentes. */
const RANKING: CandidatoPuntuado[] = [1, 2, 3, 4, 5].map((id) => ({
  idServicio: id,
  nombreServicio: `S${id}`,
  aportes: SIN_APORTES,
  total: 10 - id,
}));

function regla(
  over: Partial<ReglaExcepcionCompilada> & { codigo: string },
): ReglaExcepcionCompilada {
  return {
    prioridadOrden: 1,
    // Predicado que siempre se cumple con estos hechos.
    expresion: compiler.compile(
      { campo: 'cuelloBotella', op: 'contiene', valor: 'IPRL' },
      'CON_GRADO',
    ),
    accion: 'FORZAR',
    idServicioObjetivo: 3,
    posiciones: null,
    motivoDeclarado: 'motivo',
    ...over,
  };
}

const nombres = (r: readonly CandidatoPuntuado[]) =>
  r.map((c) => c.nombreServicio);

describe('ExceptionEngineService', () => {
  describe('acciones', () => {
    it('FORZAR lleva el objetivo al primer puesto', () => {
      const { rankingPost } = engine.apply(
        RANKING,
        [regla({ codigo: 'E-A', accion: 'FORZAR', idServicioObjetivo: 4 })],
        HECHOS,
      );
      expect(nombres(rankingPost)).toEqual(['S4', 'S1', 'S2', 'S3', 'S5']);
    });

    it('VETAR retira el objetivo del ranking', () => {
      const { rankingPost } = engine.apply(
        RANKING,
        [
          regla({
            codigo: 'E-A',
            accion: 'VETAR',
            idServicioObjetivo: 2,
            posiciones: null,
          }),
        ],
        HECHOS,
      );
      expect(nombres(rankingPost)).toEqual(['S1', 'S3', 'S4', 'S5']);
    });

    it('PROMOVER sube el objetivo tantas posiciones como indique', () => {
      const { rankingPost } = engine.apply(
        RANKING,
        [
          regla({
            codigo: 'E-A',
            accion: 'PROMOVER',
            idServicioObjetivo: 4,
            posiciones: 2,
          }),
        ],
        HECHOS,
      );
      expect(nombres(rankingPost)).toEqual(['S1', 'S4', 'S2', 'S3', 'S5']);
    });

    it('DEGRADAR baja el objetivo tantas posiciones como indique', () => {
      const { rankingPost } = engine.apply(
        RANKING,
        [
          regla({
            codigo: 'E-A',
            accion: 'DEGRADAR',
            idServicioObjetivo: 1,
            posiciones: 2,
          }),
        ],
        HECHOS,
      );
      expect(nombres(rankingPost)).toEqual(['S2', 'S3', 'S1', 'S4', 'S5']);
    });
  });

  describe('saturación en los extremos', () => {
    it('promover más posiciones de las disponibles deja el primer puesto', () => {
      const { rankingPost } = engine.apply(
        RANKING,
        [
          regla({
            codigo: 'E-A',
            accion: 'PROMOVER',
            idServicioObjetivo: 3,
            posiciones: 99,
          }),
        ],
        HECHOS,
      );
      expect(nombres(rankingPost)).toEqual(['S3', 'S1', 'S2', 'S4', 'S5']);
    });

    it('degradar más posiciones de las disponibles deja el último puesto', () => {
      const { rankingPost } = engine.apply(
        RANKING,
        [
          regla({
            codigo: 'E-A',
            accion: 'DEGRADAR',
            idServicioObjetivo: 2,
            posiciones: 99,
          }),
        ],
        HECHOS,
      );
      expect(nombres(rankingPost)).toEqual(['S1', 'S3', 'S4', 'S5', 'S2']);
    });

    it('promover al que ya es primero no lo mueve y lo dice en el efecto', () => {
      const { activadas } = engine.apply(
        RANKING,
        [
          regla({
            codigo: 'E-A',
            accion: 'PROMOVER',
            idServicioObjetivo: 1,
            posiciones: 3,
          }),
        ],
        HECHOS,
      );
      expect(activadas[0].efecto).toContain('ya estaba en el extremo');
    });
  });

  describe('cascada y orden', () => {
    it('aplica las excepciones en orden de prioridad ascendente', () => {
      // La segunda opera sobre el ranking que dejó la primera, no sobre el
      // original: es lo que hace que el orden importe de verdad.
      const { rankingPost, activadas } = engine.apply(
        RANKING,
        [
          regla({
            codigo: 'E-SEGUNDA',
            prioridadOrden: 2,
            accion: 'FORZAR',
            idServicioObjetivo: 5,
          }),
          regla({
            codigo: 'E-PRIMERA',
            prioridadOrden: 1,
            accion: 'FORZAR',
            idServicioObjetivo: 4,
          }),
        ],
        HECHOS,
      );
      expect(activadas.map((e) => e.codigo)).toEqual(['E-PRIMERA', 'E-SEGUNDA']);
      expect(nombres(rankingPost)[0]).toBe('S5');
    });

    it('registra el ranking antes y después de cada excepción por separado', () => {
      // Sin este detalle una recomendación cuestionada meses después no se
      // puede atribuir al ajuste concreto que la produjo.
      const { activadas } = engine.apply(
        RANKING,
        [
          regla({ codigo: 'E-1', prioridadOrden: 1, idServicioObjetivo: 3 }),
          regla({ codigo: 'E-2', prioridadOrden: 2, idServicioObjetivo: 5 }),
        ],
        HECHOS,
      );
      expect(nombres(activadas[0].rankingAntes)[0]).toBe('S1');
      expect(nombres(activadas[0].rankingDespues)[0]).toBe('S3');
      expect(nombres(activadas[1].rankingAntes)[0]).toBe('S3');
      expect(nombres(activadas[1].rankingDespues)[0]).toBe('S5');
    });
  });

  describe('descartes', () => {
    it('descarta la excepción cuya condición no se cumple', () => {
      const { activadas, descartadas, rankingPost } = engine.apply(
        RANKING,
        [
          regla({
            codigo: 'E-A',
            expresion: compiler.compile(
              { campo: 'cuelloBotella', op: 'contiene', valor: 'TRL' },
              'CON_GRADO',
            ),
          }),
        ],
        HECHOS,
      );
      expect(activadas).toHaveLength(0);
      expect(descartadas[0].codigo).toBe('E-A');
      expect(nombres(rankingPost)).toEqual(nombres(RANKING));
    });

    it('descarta con motivo explícito si el objetivo no está en el ranking', () => {
      // Es el conflicto entre capas —forzar un servicio que la capa 1
      // excluyó— que el validador debe detectar al configurar. En
      // evaluación no puede reventar, pero tampoco pasar inadvertido.
      const { descartadas } = engine.apply(
        RANKING,
        [regla({ codigo: 'E-A', idServicioObjetivo: 99 })],
        HECHOS,
      );
      expect(descartadas[0].razon).toContain('no está en el ranking');
    });

    it('un ranking vacío no rompe el motor', () => {
      const { rankingPost, descartadas } = engine.apply(
        [],
        [regla({ codigo: 'E-A' })],
        HECHOS,
      );
      expect(rankingPost).toEqual([]);
      expect(descartadas).toHaveLength(1);
    });
  });

  it('sin excepciones configuradas devuelve el ranking intacto', () => {
    const { rankingPost, activadas, descartadas } = engine.apply(
      RANKING,
      [],
      HECHOS,
    );
    expect(nombres(rankingPost)).toEqual(nombres(RANKING));
    expect(activadas).toHaveLength(0);
    expect(descartadas).toHaveLength(0);
  });
});

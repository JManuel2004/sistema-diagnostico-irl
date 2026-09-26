import { describe, expect, it } from '@jest/globals';
import type { DiagnosticFacts } from '@innlab/contracts';
import {
  ExceptionEngineService,
  type CompiledExceptionRule,
} from '../../../../../src/modules/routing/domain/services/exception-engine.service.js';
import type { ScoredCandidate } from '../../../../../src/modules/routing/domain/value-objects/scored-candidate.vo.js';
import { PredicateCompilerService } from '../../../../../src/modules/routing/domain/services/predicate-compiler.service.js';

const compiler = new PredicateCompilerService();
const engine = new ExceptionEngineService();

const FACTS: DiagnosticFacts = {
  diagnosticId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  levelByDimension: { TRL: 6, CRL: 4, BRL: 3, IPRL: 1, TmRL: 5, FRL: 2 },
  bottlenecks: ['IPRL'],
  gaps: ['BRL', 'IPRL', 'FRL'],
  imbalances: [
    { left: 'TRL', right: 'IPRL', difference: 5, classification: 'CRITICAL' },
    { left: 'TRL', right: 'CRL', difference: 2, classification: 'MODERATE' },
    { left: 'TRL', right: 'BRL', difference: 3, classification: 'MODERATE' },
    { left: 'CRL', right: 'BRL', difference: 1, classification: 'ACCEPTABLE' },
    { left: 'TmRL', right: 'FRL', difference: 3, classification: 'MODERATE' },
    { left: 'BRL', right: 'IPRL', difference: 2, classification: 'MODERATE' },
  ],
  averageLevel: 3.5,
  characterization: {
    stage: 'validacion',
    sector: null,
    teamSize: 3,
    academicLinkage: false,
  },
};

const NO_CONTRIBUTIONS: ScoredCandidate['contributions'] = {
  bottleneck: { value: 0, details: [] },
  gaps: { value: 0, details: [] },
  imbalances: { value: 0, details: [] },
  stageAffinity: { value: 0, matches: false },
  rangePenalty: { value: 0, applied: false },
};

/** Ranking of five services, ids 1..5, descending scores. */
const RANKING: ScoredCandidate[] = [1, 2, 3, 4, 5].map((id) => ({
  idService: id,
  serviceName: `S${id}`,
  contributions: NO_CONTRIBUTIONS,
  total: 10 - id,
}));

function rule(
  over: Partial<CompiledExceptionRule> & { code: string },
): CompiledExceptionRule {
  return {
    priorityOrder: 1,
    // Predicate that always holds with these facts.
    expression: compiler.compile(
      { field: 'bottleneck', op: 'contains', value: 'IPRL' },
      'WITH_DEGREE',
    ),
    action: 'FORCE',
    idTargetService: 3,
    positions: null,
    declaredReason: 'reason',
    ...over,
  };
}

const names = (r: readonly ScoredCandidate[]) =>
  r.map((c) => c.serviceName);

describe('ExceptionEngineService', () => {
  describe('acciones', () => {
    it('FORZAR lleva el objetivo al primer puesto', () => {
      const { finalRanking } = engine.apply(
        RANKING,
        [rule({ code: 'E-A', action: 'FORCE', idTargetService: 4 })],
        FACTS,
      );
      expect(names(finalRanking)).toEqual(['S4', 'S1', 'S2', 'S3', 'S5']);
    });

    it('VETAR retira el objetivo del ranking', () => {
      const { finalRanking } = engine.apply(
        RANKING,
        [
          rule({
            code: 'E-A',
            action: 'VETO',
            idTargetService: 2,
            positions: null,
          }),
        ],
        FACTS,
      );
      expect(names(finalRanking)).toEqual(['S1', 'S3', 'S4', 'S5']);
    });

    it('PROMOVER sube el objetivo tantas positions como indique', () => {
      const { finalRanking } = engine.apply(
        RANKING,
        [
          rule({
            code: 'E-A',
            action: 'PROMOTE',
            idTargetService: 4,
            positions: 2,
          }),
        ],
        FACTS,
      );
      expect(names(finalRanking)).toEqual(['S1', 'S4', 'S2', 'S3', 'S5']);
    });

    it('DEGRADAR baja el objetivo tantas positions como indique', () => {
      const { finalRanking } = engine.apply(
        RANKING,
        [
          rule({
            code: 'E-A',
            action: 'DEMOTE',
            idTargetService: 1,
            positions: 2,
          }),
        ],
        FACTS,
      );
      expect(names(finalRanking)).toEqual(['S2', 'S3', 'S1', 'S4', 'S5']);
    });
  });

  describe('saturación en los extremos', () => {
    it('promover más positions de las disponibles deja el primer puesto', () => {
      const { finalRanking } = engine.apply(
        RANKING,
        [
          rule({
            code: 'E-A',
            action: 'PROMOTE',
            idTargetService: 3,
            positions: 99,
          }),
        ],
        FACTS,
      );
      expect(names(finalRanking)).toEqual(['S3', 'S1', 'S2', 'S4', 'S5']);
    });

    it('degradar más positions de las disponibles deja el último puesto', () => {
      const { finalRanking } = engine.apply(
        RANKING,
        [
          rule({
            code: 'E-A',
            action: 'DEMOTE',
            idTargetService: 2,
            positions: 99,
          }),
        ],
        FACTS,
      );
      expect(names(finalRanking)).toEqual(['S1', 'S3', 'S4', 'S5', 'S2']);
    });

    it('promover al que ya es primero no lo mueve y lo dice en el effect', () => {
      const { applied } = engine.apply(
        RANKING,
        [
          rule({
            code: 'E-A',
            action: 'PROMOTE',
            idTargetService: 1,
            positions: 3,
          }),
        ],
        FACTS,
      );
      expect(applied[0].effect).toContain('ya estaba en el extremo');
    });
  });

  describe('cascada y order', () => {
    it('aplica las exceptions en order de prioridad ascendente', () => {
      // The second one works on the ranking the first one left, not on the
      // original: that is what makes the order really matter.
      const { finalRanking, applied } = engine.apply(
        RANKING,
        [
          rule({
            code: 'E-SEGUNDA',
            priorityOrder: 2,
            action: 'FORCE',
            idTargetService: 5,
          }),
          rule({
            code: 'E-PRIMERA',
            priorityOrder: 1,
            action: 'FORCE',
            idTargetService: 4,
          }),
        ],
        FACTS,
      );
      expect(applied.map((e) => e.code)).toEqual(['E-PRIMERA', 'E-SEGUNDA']);
      expect(names(finalRanking)[0]).toBe('S5');
    });

    it('registra el ranking antes y después de cada excepción por separado', () => {
      // Without this detail, a recommendation questioned months later cannot
      // be attributed to the specific adjustment that produced it.
      const { applied } = engine.apply(
        RANKING,
        [
          rule({ code: 'E-1', priorityOrder: 1, idTargetService: 3 }),
          rule({ code: 'E-2', priorityOrder: 2, idTargetService: 5 }),
        ],
        FACTS,
      );
      expect(names(applied[0].rankingBefore)[0]).toBe('S1');
      expect(names(applied[0].rankingAfter)[0]).toBe('S3');
      expect(names(applied[1].rankingBefore)[0]).toBe('S3');
      expect(names(applied[1].rankingAfter)[0]).toBe('S5');
    });
  });

  describe('descartes', () => {
    it('descarta la excepción cuya condición no se cumple', () => {
      const { applied, discarded, finalRanking } = engine.apply(
        RANKING,
        [
          rule({
            code: 'E-A',
            expression: compiler.compile(
              { field: 'bottleneck', op: 'contains', value: 'TRL' },
              'WITH_DEGREE',
            ),
          }),
        ],
        FACTS,
      );
      expect(applied).toHaveLength(0);
      expect(discarded[0].code).toBe('E-A');
      expect(names(finalRanking)).toEqual(names(RANKING));
    });

    it('descarta con reason explícito si el objetivo no está en el ranking', () => {
      // This is the conflict between layers — forcing a service that layer 1
      // excluded — that the validator must catch when configuring. At
      // evaluation it cannot blow up, but it cannot go unnoticed either.
      const { discarded } = engine.apply(
        RANKING,
        [rule({ code: 'E-A', idTargetService: 99 })],
        FACTS,
      );
      expect(discarded[0].reason).toContain('no está en el ranking');
    });

    it('un ranking vacío no rompe el motor', () => {
      const { finalRanking, discarded } = engine.apply(
        [],
        [rule({ code: 'E-A' })],
        FACTS,
      );
      expect(finalRanking).toEqual([]);
      expect(discarded).toHaveLength(1);
    });
  });

  it('sin exceptions configuradas devuelve el ranking intacto', () => {
    const { finalRanking, applied, discarded } = engine.apply(
      RANKING,
      [],
      FACTS,
    );
    expect(names(finalRanking)).toEqual(names(RANKING));
    expect(applied).toHaveLength(0);
    expect(discarded).toHaveLength(0);
  });
});

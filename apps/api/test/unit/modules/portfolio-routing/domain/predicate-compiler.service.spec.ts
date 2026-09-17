import { describe, expect, it } from '@jest/globals';
import type { DiagnosticFacts } from '@innlab/contracts';
import {
  PredicateCompilerService,
  evaluarExpresion,
} from '../../../../../src/modules/portfolio-routing/domain/services/predicate-compiler.service.js';
import { PredicateCompilationError } from '../../../../../src/modules/portfolio-routing/domain/errors/portfolio-routing.errors.js';

const compiler = new PredicateCompilerService();

const FACTS: DiagnosticFacts = {
  diagnosticId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  levelByDimension: { TRL: 6, CRL: 4, BRL: 3, IPRL: 1, TmRL: 5, FRL: 2 },
  bottlenecks: ['IPRL'],
  gaps: ['BRL', 'IPRL', 'FRL'],
  imbalances: [
    { left: 'TRL', right: 'CRL', difference: 2, classification: 'MODERATE' },
    { left: 'TRL', right: 'BRL', difference: 3, classification: 'MODERATE' },
    { left: 'CRL', right: 'BRL', difference: 1, classification: 'ACCEPTABLE' },
    { left: 'TmRL', right: 'FRL', difference: 3, classification: 'MODERATE' },
    { left: 'BRL', right: 'IPRL', difference: 2, classification: 'MODERATE' },
    { left: 'TRL', right: 'IPRL', difference: 5, classification: 'CRITICAL' },
  ],
  averageLevel: 3.5,
  characterization: {
    stage: 'validacion',
    sector: null,
    teamSize: 3,
    academicLinkage: false,
  },
};

describe('PredicateCompilerService', () => {
  describe('separación de modos', () => {
    it('rechaza un operador de grado en modo BOOLEAN', () => {
      // Es la garantía estructural de que una condición de grado no puede
      // colarse al filtro duro de elegibilidad.
      expect(() =>
        compiler.compile(
          { field: 'averageLevel', op: '<', value: 3 },
          'BOOLEAN',
        ),
      ).toThrow(PredicateCompilationError);
    });

    it('admite el mismo operador en modo CON_GRADO', () => {
      expect(() =>
        compiler.compile(
          { field: 'averageLevel', op: '<', value: 3 },
          'WITH_DEGREE',
        ),
      ).not.toThrow();
    });

    it('admite igualdad y pertenencia en modo BOOLEAN', () => {
      expect(() =>
        compiler.compile(
          { field: 'characterization.teamSize', op: '=', value: 1 },
          'BOOLEAN',
        ),
      ).not.toThrow();
      expect(() =>
        compiler.compile(
          { field: 'bottleneck', op: 'contains', value: 'IPRL' },
          'BOOLEAN',
        ),
      ).not.toThrow();
    });
  });

  describe('validación al compilar', () => {
    it('rechaza un campo desconocido y nombra los disponibles', () => {
      // Falla cuando alguien escribe la regla, no meses después cuando un
      // diagnóstico la activa. Esa diferencia de momento es el valor de
      // compilar en vez de interpretar.
      expect(() =>
        compiler.compile(
          { field: 'nivelDeMadurezInventado', op: '=', value: 3 },
          'WITH_DEGREE',
        ),
      ).toThrow(/Campo desconocido/);
    });

    it('rechaza un operador de pertenencia sobre un campo escalar', () => {
      expect(() =>
        compiler.compile(
          { field: 'averageLevel', op: 'contains', value: 'IPRL' },
          'WITH_DEGREE',
        ),
      ).toThrow(/requiere un campo de colección/);
    });

    it('rechaza una comparación de orden sobre un campo no numérico', () => {
      expect(() =>
        compiler.compile(
          { field: 'characterization.stage', op: '>=', value: 3 },
          'WITH_DEGREE',
        ),
      ).toThrow(/requiere un campo numérico/);
    });

    it('rechaza un valor de tipo incompatible con el operador', () => {
      expect(() =>
        compiler.compile(
          { field: 'gaps', op: 'count>=', value: 'tres' },
          'WITH_DEGREE',
        ),
      ).toThrow(/requiere un valor numérico/);
    });

    it('rechaza un nodo sin operador', () => {
      expect(() => compiler.compile({ field: 'gaps' }, 'WITH_DEGREE')).toThrow(
        /falta el operador/,
      );
    });

    it('rechaza `no` con más de un operando', () => {
      expect(() =>
        compiler.compile(
          {
            op: 'not',
            operands: [
              { field: 'bottleneck', op: 'contains', value: 'IPRL' },
              { field: 'gaps', op: 'contains', value: 'FRL' },
            ],
          },
          'WITH_DEGREE',
        ),
      ).toThrow(/exactamente un operando/);
    });

    it('rechaza un compuesto sin operands', () => {
      expect(() =>
        compiler.compile({ op: 'and', operands: [] }, 'WITH_DEGREE'),
      ).toThrow(/al menos un operando/);
    });

it('rechaza un nodo que no es un objeto', () => {
      expect(() => compiler.compile('bottleneck', 'WITH_DEGREE')).toThrow(
        /se esperaba un objeto/,
      );
      expect(() => compiler.compile(null, 'WITH_DEGREE')).toThrow(
        /se esperaba un objeto/,
      );
    });

    it('rechaza un operador que no existe en el DSL', () => {
      expect(() =>
        compiler.compile(
          { field: 'averageLevel', op: 'entre', value: 3 },
          'WITH_DEGREE',
        ),
      ).toThrow(/Operador desconocido/);
    });

    it('rechaza un valor no textual para un operador de pertenencia', () => {
      expect(() =>
        compiler.compile(
          { field: 'gaps', op: 'contains', value: 3 },
          'WITH_DEGREE',
        ),
      ).toThrow(/requiere un valor de texto/);
    });

    it('propaga el error desde un nodo anidado, indicando la ruta', () => {
      expect(() =>
        compiler.compile(
          {
            op: 'and',
            operands: [
              { field: 'bottleneck', op: 'contains', value: 'IPRL' },
              { op: 'or', operands: [{ field: 'inexistente', op: '=', value: 1 }] },
            ],
          },
          'WITH_DEGREE',
        ),
      ).toThrow(/root\.and\[1\]\.or\[0\]/);
    });
  });

  describe('evaluación', () => {
    const compilarYEvaluar = (p: unknown, facts = FACTS) =>
      evaluarExpresion(compiler.compile(p, 'WITH_DEGREE'), facts);

    it('resuelve pertenencia sobre el cuello de botella', () => {
      expect(
        compilarYEvaluar({ field: 'bottleneck', op: 'contains', value: 'IPRL' }),
      ).toBe(true);
      expect(
        compilarYEvaluar({ field: 'bottleneck', op: 'contains', value: 'TRL' }),
      ).toBe(false);
    });

    it('resuelve el conteo de gaps', () => {
      expect(
        compilarYEvaluar({ field: 'gaps', op: 'count>=', value: 3 }),
      ).toBe(true);
      expect(
        compilarYEvaluar({ field: 'gaps', op: 'count>=', value: 4 }),
      ).toBe(false);
    });

    it('deriva los pares en desequilibrio crítico a partir de los facts', () => {
      expect(
        compilarYEvaluar({
          field: 'criticalImbalances',
          op: 'contains',
          value: 'TRL-IPRL',
        }),
      ).toBe(true);
      expect(
        compilarYEvaluar({
          field: 'criticalImbalances',
          op: 'contains',
          value: 'CRL-BRL',
        }),
      ).toBe(false);
    });

    it('resuelve un nivel dimensional concreto', () => {
      expect(
        compilarYEvaluar({ field: 'levelByDimension.IPRL', op: '<=', value: 2 }),
      ).toBe(true);
    });

    it('combina con y / o / no', () => {
      expect(
        compilarYEvaluar({
          op: 'and',
          operands: [
            { field: 'bottleneck', op: 'contains', value: 'IPRL' },
            {
              op: 'not',
              operands: [{ field: 'gaps', op: 'contains', value: 'TRL' }],
            },
          ],
        }),
      ).toBe(true);

      expect(
        compilarYEvaluar({
          op: 'or',
          operands: [
            { field: 'bottleneck', op: 'contains', value: 'TRL' },
            { field: 'averageLevel', op: '>', value: 3 },
          ],
        }),
      ).toBe(true);
    });


    describe('cobertura de todos los operadores', () => {
      // Un operador sin probar en un evaluador de DSL es el sitio exacto
      // donde se esconde un fallo silencioso: devuelve `false` para todo y
      // la regla parece no cumplirse nunca.
      it.each([
        [{ field: 'bottleneck', op: 'not_contains', value: 'TRL' }, true],
        [{ field: 'bottleneck', op: 'not_contains', value: 'IPRL' }, false],
        [{ field: 'gaps', op: 'count<=', value: 3 }, true],
        [{ field: 'gaps', op: 'count<=', value: 2 }, false],
        [{ field: 'gaps', op: 'count=', value: 3 }, true],
        [{ field: 'gaps', op: 'count=', value: 4 }, false],
        [{ field: 'averageLevel', op: '>=', value: 3.5 }, true],
        [{ field: 'averageLevel', op: '>=', value: 4 }, false],
        [{ field: 'averageLevel', op: '>', value: 3 }, true],
        [{ field: 'averageLevel', op: '>', value: 3.5 }, false],
        [{ field: 'levelByDimension.TRL', op: '=', value: 6 }, true],
        [{ field: 'levelByDimension.TRL', op: '!=', value: 6 }, false],
        [{ field: 'characterization.stage', op: '!=', value: 'idea' }, true],
        [{ field: 'characterization.sector', op: '=', value: null }, true],
        [
          { field: 'moderateImbalances', op: 'contains', value: 'TRL-CRL' },
          true,
        ],
        [
          { field: 'moderateImbalances', op: 'contains', value: 'TRL-IPRL' },
          false,
        ],
      ] as [Record<string, unknown>, boolean][])(
        'evalúa %j como %s',
        (predicate, esperado) => {
          expect(compilarYEvaluar(predicate)).toBe(esperado);
        },
      );

      it('un nivel dimensional inexistente resuelve a null y no cumple', () => {
        const sinTrl = {
          ...FACTS,
          levelByDimension: { CRL: 4 },
        } as unknown as DiagnosticFacts;
        expect(
          compilarYEvaluar(
            { field: 'levelByDimension.TRL', op: '>=', value: 1 },
            sinTrl,
          ),
        ).toBe(false);
      });
    });

    describe('datos ausentes', () => {
      const sinCaracterizacion: DiagnosticFacts = {
        ...FACTS,
        characterization: {
          stage: null,
          sector: null,
          teamSize: null,
          academicLinkage: null,
        },
      };

      it('una comparación de orden contra un dato ausente es falsa', () => {
        // La falta de información no puede disparar reglas: si lo hiciera,
        // un diagnóstico sin iniciativa registrada activaría exclusiones
        // que nadie configuró para él.
        expect(
          compilarYEvaluar(
            { field: 'characterization.teamSize', op: '<', value: 2 },
            sinCaracterizacion,
          ),
        ).toBe(false);
      });

      it('una igualdad contra un dato ausente es falsa', () => {
        expect(
          compilarYEvaluar(
            { field: 'characterization.academicLinkage', op: '=', value: false },
            sinCaracterizacion,
          ),
        ).toBe(false);
      });
    });
  });
});

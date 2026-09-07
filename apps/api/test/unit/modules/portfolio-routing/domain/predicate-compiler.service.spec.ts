import { describe, expect, it } from '@jest/globals';
import type { HechosDiagnostico } from '@innlab/contracts';
import {
  PredicateCompilerService,
  evaluarExpresion,
} from '../../../../../src/modules/portfolio-routing/domain/services/predicate-compiler.service.js';
import { PredicateCompilationError } from '../../../../../src/modules/portfolio-routing/domain/errors/portfolio-routing.errors.js';

const compiler = new PredicateCompilerService();

const HECHOS: HechosDiagnostico = {
  diagnosticId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  nivelPorDimension: { TRL: 6, CRL: 4, BRL: 3, IPRL: 1, TmRL: 5, FRL: 2 },
  cuellosBotella: ['IPRL'],
  brechas: ['BRL', 'IPRL', 'FRL'],
  desequilibrios: [
    { izquierda: 'TRL', derecha: 'CRL', diferencia: 2, clasificacion: 'MODERADO' },
    { izquierda: 'TRL', derecha: 'BRL', diferencia: 3, clasificacion: 'MODERADO' },
    { izquierda: 'CRL', derecha: 'BRL', diferencia: 1, clasificacion: 'ACEPTABLE' },
    { izquierda: 'TmRL', derecha: 'FRL', diferencia: 3, clasificacion: 'MODERADO' },
    { izquierda: 'BRL', derecha: 'IPRL', diferencia: 2, clasificacion: 'MODERADO' },
    { izquierda: 'TRL', derecha: 'IPRL', diferencia: 5, clasificacion: 'CRITICO' },
  ],
  nivelPromedio: 3.5,
  caracterizacion: {
    etapa: 'validacion',
    sector: null,
    tamanoEquipo: 3,
    vinculacionAcademica: false,
  },
};

describe('PredicateCompilerService', () => {
  describe('separación de modos', () => {
    it('rechaza un operador de grado en modo BOOLEANO', () => {
      // Es la garantía estructural de que una condición de grado no puede
      // colarse al filtro duro de elegibilidad.
      expect(() =>
        compiler.compile(
          { campo: 'nivelPromedio', op: '<', valor: 3 },
          'BOOLEANO',
        ),
      ).toThrow(PredicateCompilationError);
    });

    it('admite el mismo operador en modo CON_GRADO', () => {
      expect(() =>
        compiler.compile(
          { campo: 'nivelPromedio', op: '<', valor: 3 },
          'CON_GRADO',
        ),
      ).not.toThrow();
    });

    it('admite igualdad y pertenencia en modo BOOLEANO', () => {
      expect(() =>
        compiler.compile(
          { campo: 'caracterizacion.tamanoEquipo', op: '=', valor: 1 },
          'BOOLEANO',
        ),
      ).not.toThrow();
      expect(() =>
        compiler.compile(
          { campo: 'cuelloBotella', op: 'contiene', valor: 'IPRL' },
          'BOOLEANO',
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
          { campo: 'nivelDeMadurezInventado', op: '=', valor: 3 },
          'CON_GRADO',
        ),
      ).toThrow(/Campo desconocido/);
    });

    it('rechaza un operador de pertenencia sobre un campo escalar', () => {
      expect(() =>
        compiler.compile(
          { campo: 'nivelPromedio', op: 'contiene', valor: 'IPRL' },
          'CON_GRADO',
        ),
      ).toThrow(/requiere un campo de colección/);
    });

    it('rechaza una comparación de orden sobre un campo no numérico', () => {
      expect(() =>
        compiler.compile(
          { campo: 'caracterizacion.etapa', op: '>=', valor: 3 },
          'CON_GRADO',
        ),
      ).toThrow(/requiere un campo numérico/);
    });

    it('rechaza un valor de tipo incompatible con el operador', () => {
      expect(() =>
        compiler.compile(
          { campo: 'brechas', op: 'conteo>=', valor: 'tres' },
          'CON_GRADO',
        ),
      ).toThrow(/requiere un valor numérico/);
    });

    it('rechaza un nodo sin operador', () => {
      expect(() => compiler.compile({ campo: 'brechas' }, 'CON_GRADO')).toThrow(
        /falta el operador/,
      );
    });

    it('rechaza `no` con más de un operando', () => {
      expect(() =>
        compiler.compile(
          {
            op: 'no',
            operandos: [
              { campo: 'cuelloBotella', op: 'contiene', valor: 'IPRL' },
              { campo: 'brechas', op: 'contiene', valor: 'FRL' },
            ],
          },
          'CON_GRADO',
        ),
      ).toThrow(/exactamente un operando/);
    });

    it('rechaza un compuesto sin operandos', () => {
      expect(() =>
        compiler.compile({ op: 'y', operandos: [] }, 'CON_GRADO'),
      ).toThrow(/al menos un operando/);
    });

    it('propaga el error desde un nodo anidado, indicando la ruta', () => {
      expect(() =>
        compiler.compile(
          {
            op: 'y',
            operandos: [
              { campo: 'cuelloBotella', op: 'contiene', valor: 'IPRL' },
              { op: 'o', operandos: [{ campo: 'inexistente', op: '=', valor: 1 }] },
            ],
          },
          'CON_GRADO',
        ),
      ).toThrow(/raíz\.y\[1\]\.o\[0\]/);
    });
  });

  describe('evaluación', () => {
    const compilarYEvaluar = (p: unknown, hechos = HECHOS) =>
      evaluarExpresion(compiler.compile(p, 'CON_GRADO'), hechos);

    it('resuelve pertenencia sobre el cuello de botella', () => {
      expect(
        compilarYEvaluar({ campo: 'cuelloBotella', op: 'contiene', valor: 'IPRL' }),
      ).toBe(true);
      expect(
        compilarYEvaluar({ campo: 'cuelloBotella', op: 'contiene', valor: 'TRL' }),
      ).toBe(false);
    });

    it('resuelve el conteo de brechas', () => {
      expect(
        compilarYEvaluar({ campo: 'brechas', op: 'conteo>=', valor: 3 }),
      ).toBe(true);
      expect(
        compilarYEvaluar({ campo: 'brechas', op: 'conteo>=', valor: 4 }),
      ).toBe(false);
    });

    it('deriva los pares en desequilibrio crítico a partir de los hechos', () => {
      expect(
        compilarYEvaluar({
          campo: 'desequilibriosCriticos',
          op: 'contiene',
          valor: 'TRL-IPRL',
        }),
      ).toBe(true);
      expect(
        compilarYEvaluar({
          campo: 'desequilibriosCriticos',
          op: 'contiene',
          valor: 'CRL-BRL',
        }),
      ).toBe(false);
    });

    it('resuelve un nivel dimensional concreto', () => {
      expect(
        compilarYEvaluar({ campo: 'nivelPorDimension.IPRL', op: '<=', valor: 2 }),
      ).toBe(true);
    });

    it('combina con y / o / no', () => {
      expect(
        compilarYEvaluar({
          op: 'y',
          operandos: [
            { campo: 'cuelloBotella', op: 'contiene', valor: 'IPRL' },
            {
              op: 'no',
              operandos: [{ campo: 'brechas', op: 'contiene', valor: 'TRL' }],
            },
          ],
        }),
      ).toBe(true);

      expect(
        compilarYEvaluar({
          op: 'o',
          operandos: [
            { campo: 'cuelloBotella', op: 'contiene', valor: 'TRL' },
            { campo: 'nivelPromedio', op: '>', valor: 3 },
          ],
        }),
      ).toBe(true);
    });

    describe('datos ausentes', () => {
      const sinCaracterizacion: HechosDiagnostico = {
        ...HECHOS,
        caracterizacion: {
          etapa: null,
          sector: null,
          tamanoEquipo: null,
          vinculacionAcademica: null,
        },
      };

      it('una comparación de orden contra un dato ausente es falsa', () => {
        // La falta de información no puede disparar reglas: si lo hiciera,
        // un diagnóstico sin iniciativa registrada activaría exclusiones
        // que nadie configuró para él.
        expect(
          compilarYEvaluar(
            { campo: 'caracterizacion.tamanoEquipo', op: '<', valor: 2 },
            sinCaracterizacion,
          ),
        ).toBe(false);
      });

      it('una igualdad contra un dato ausente es falsa', () => {
        expect(
          compilarYEvaluar(
            { campo: 'caracterizacion.vinculacionAcademica', op: '=', valor: false },
            sinCaracterizacion,
          ),
        ).toBe(false);
      });
    });
  });
});

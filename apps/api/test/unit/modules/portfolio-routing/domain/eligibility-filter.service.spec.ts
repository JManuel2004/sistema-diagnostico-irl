import { describe, expect, it } from '@jest/globals';
import type { DimensionCode, HechosDiagnostico } from '@innlab/contracts';
import {
  EligibilityFilterService,
  type ReglaElegibilidadCompilada,
} from '../../../../../src/modules/portfolio-routing/domain/services/eligibility-filter.service.js';
import type { FichaNumerica } from '../../../../../src/modules/portfolio-routing/domain/value-objects/ficha-ordinal.vo.js';
import { PredicateCompilerService } from '../../../../../src/modules/portfolio-routing/domain/services/predicate-compiler.service.js';

const compiler = new PredicateCompilerService();
const filtro = new EligibilityFilterService();

const HECHOS: HechosDiagnostico = {
  diagnosticId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  nivelPorDimension: { TRL: 6, CRL: 4, BRL: 3, IPRL: 1, TmRL: 5, FRL: 2 },
  cuellosBotella: ['IPRL'],
  brechas: ['BRL', 'IPRL', 'FRL'],
  desequilibrios: [],
  nivelPromedio: 3.5,
  caracterizacion: {
    etapa: 'validacion',
    sector: null,
    tamanoEquipo: 1,
    vinculacionAcademica: false,
  },
} as unknown as HechosDiagnostico;

function ficha(id: number, nombre: string): FichaNumerica {
  return {
    idServicio: id,
    nombreServicio: nombre,
    nivelMin: 1,
    nivelMax: 9,
    etapasPertinentes: ['validacion'],
    intensidades: new Map<DimensionCode, number>(),
    etiquetas: new Map<DimensionCode, string>(),
  };
}

const FICHAS = [ficha(1, 'Formación'), ficha(2, 'Retos'), ficha(3, 'Grado')];

function regla(
  idServicio: number,
  predicado: unknown,
  mensaje: string,
  idRegla = 'R',
): ReglaElegibilidadCompilada {
  return {
    idRegla,
    idServicio,
    expresion: compiler.compile(predicado, 'BOOLEANO'),
    mensajeExclusion: mensaje,
  };
}

describe('EligibilityFilterService', () => {
  it('un servicio sin reglas asociadas es elegible por defecto', () => {
    const { elegibles, excluidos } = filtro.filter(FICHAS, [], HECHOS);
    expect(elegibles).toHaveLength(3);
    expect(excluidos).toHaveLength(0);
  });

  it('excluye el servicio cuya regla se cumple y reporta su mensaje', () => {
    const reglas = [
      regla(
        2,
        { campo: 'caracterizacion.tamanoEquipo', op: '=', valor: 1 },
        'Retos requiere al menos 2 personas',
      ),
    ];
    const { elegibles, excluidos } = filtro.filter(FICHAS, reglas, HECHOS);

    expect(elegibles.map((f) => f.nombreServicio)).toEqual([
      'Formación',
      'Grado',
    ]);
    expect(excluidos).toEqual([
      {
        idServicio: 2,
        nombre: 'Retos',
        mensajeExclusion: 'Retos requiere al menos 2 personas',
      },
    ]);
  });

  it('no excluye cuando la condición no se cumple', () => {
    const reglas = [
      regla(
        2,
        { campo: 'caracterizacion.tamanoEquipo', op: '=', valor: 9 },
        'no aplica',
      ),
    ];
    const { excluidos } = filtro.filter(FICHAS, reglas, HECHOS);
    expect(excluidos).toHaveLength(0);
  });

  it('con varias reglas sobre un servicio, reporta la primera que se cumple', () => {
    // El motivo mostrado debe ser el de la regla que efectivamente lo dejó
    // fuera, no un mensaje genérico.
    const reglas = [
      regla(3, { campo: 'brechas', op: 'contiene', valor: 'TRL' }, 'primera', 'R1'),
      regla(3, { campo: 'brechas', op: 'contiene', valor: 'IPRL' }, 'segunda', 'R2'),
    ];
    const { excluidos } = filtro.filter(FICHAS, reglas, HECHOS);
    expect(excluidos[0].mensajeExclusion).toBe('segunda');
  });

  it('una regla solo afecta al servicio al que está asociada', () => {
    const reglas = [
      regla(
        3,
        { campo: 'caracterizacion.vinculacionAcademica', op: '=', valor: false },
        'requiere vinculación',
      ),
    ];
    const { elegibles, excluidos } = filtro.filter(FICHAS, reglas, HECHOS);
    expect(excluidos.map((e) => e.nombre)).toEqual(['Grado']);
    expect(elegibles.map((f) => f.nombreServicio)).toEqual([
      'Formación',
      'Retos',
    ]);
  });

  it('puede excluir todos los servicios', () => {
    const reglas = FICHAS.map((f) =>
      regla(f.idServicio, { campo: 'brechas', op: 'contiene', valor: 'IPRL' }, 'fuera'),
    );
    const { elegibles, excluidos } = filtro.filter(FICHAS, reglas, HECHOS);
    expect(elegibles).toHaveLength(0);
    expect(excluidos).toHaveLength(3);
  });
});

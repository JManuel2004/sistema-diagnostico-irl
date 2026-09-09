import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';
import type { DimensionCode, HechosDiagnostico } from '@innlab/contracts';
import { AffinityScorerService } from '../../../../../src/modules/portfolio-routing/domain/services/affinity-scorer.service.js';
import type { FichaNumerica } from '../../../../../src/modules/portfolio-routing/domain/value-objects/ficha-ordinal.vo.js';
import type { ParametrosScoring } from '../../../../../src/modules/portfolio-routing/domain/value-objects/parametros-scoring.vo.js';

const DIMS: DimensionCode[] = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'];
const VALORES_ESCALA = [0.0, 0.2, 0.5, 1.0];

const PARAMS: ParametrosScoring = {
  pesoCuelloBotella: 3.0,
  pesoBrecha: 1.5,
  pesoDesequilibrioModerado: 0.5,
  pesoDesequilibrioCritico: 1.0,
  pesoAfinidadEtapa: 0.8,
  penalizacionFueraRango: 2.0,
  umbralMinimo: 2.5,
  nAlternativas: 2,
};

const scorer = new AffinityScorerService();

function ficha(
  intensidades: Partial<Record<DimensionCode, number>>,
  overrides: Partial<FichaNumerica> = {},
): FichaNumerica {
  const mapa = new Map<DimensionCode, number>(
    DIMS.map((d) => [d, intensidades[d] ?? 0]),
  );
  const etiquetas = new Map<DimensionCode, string>(
    DIMS.map((d) => [d, etiquetaPara(intensidades[d] ?? 0)]),
  );
  return {
    idServicio: 1,
    nombreServicio: 'Servicio',
    nivelMin: 1,
    nivelMax: 9,
    etapasPertinentes: ['validacion'],
    intensidades: mapa,
    etiquetas,
    ...overrides,
  };
}

function etiquetaPara(v: number): string {
  if (v === 1.0) return 'principal';
  if (v === 0.5) return 'secundario';
  if (v === 0.2) return 'marginal';
  return 'no_aplica';
}

function hechos(overrides: Partial<HechosDiagnostico> = {}): HechosDiagnostico {
  return {
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
    ...overrides,
  };
}

describe('AffinityScorerService', () => {
  describe('cuello de botella', () => {
    it('multiplica el peso por la intensidad en la dimensión rezagada', () => {
      const [c] = scorer.score([ficha({ IPRL: 0.5 })], hechos(), PARAMS);
      expect(c.aportes.cuelloBotella.valor).toBeCloseTo(1.5, 3);
    });

    it('promedia las intensidades cuando varias dimensiones empatan en el mínimo', () => {
      // Promediar trata el empate simétricamente. Tomar el mínimo sería
      // más conservador y el máximo más generoso; ambas romperían esa
      // simetría sin una razón de negocio que lo justifique.
      const [c] = scorer.score(
        [ficha({ IPRL: 1.0, FRL: 0.0 })],
        hechos({ cuellosBotella: ['IPRL', 'FRL'] }),
        PARAMS,
      );
      expect(c.aportes.cuelloBotella.valor).toBeCloseTo(3.0 * 0.5, 3);
    });

    it('registra la etiqueta ordinal de cada dimensión empatada', () => {
      const [c] = scorer.score(
        [ficha({ IPRL: 1.0, FRL: 0.2 })],
        hechos({ cuellosBotella: ['IPRL', 'FRL'] }),
        PARAMS,
      );
      expect(c.aportes.cuelloBotella.detalle).toEqual([
        { dimension: 'IPRL', etiquetaOrigen: 'principal', valor: 1.0 },
        { dimension: 'FRL', etiquetaOrigen: 'marginal', valor: 0.2 },
      ]);
    });
  });

  describe('brechas', () => {
    it('suma las intensidades sobre las dimensiones en brecha', () => {
      const [c] = scorer.score(
        [ficha({ BRL: 1.0, IPRL: 0.5, FRL: 0.5 })],
        hechos(),
        PARAMS,
      );
      expect(c.aportes.brechas.valor).toBeCloseTo(1.5 * 2.0, 3);
    });

    it('un perfil sin brechas no aporta por este término', () => {
      const [c] = scorer.score(
        [ficha({ BRL: 1.0 })],
        hechos({ brechas: [] }),
        PARAMS,
      );
      expect(c.aportes.brechas.valor).toBe(0);
    });
  });

  describe('desequilibrios', () => {
    it('pondera el peso del par por la intensidad dominante de sus dos dimensiones', () => {
      const [c] = scorer.score(
        [ficha({ TRL: 0.0, IPRL: 0.5 })],
        hechos({
          desequilibrios: [
            { izquierda: 'TRL', derecha: 'IPRL', diferencia: 5, clasificacion: 'CRITICO' },
          ],
        }),
        PARAMS,
      );
      expect(c.aportes.desequilibrios.valor).toBeCloseTo(1.0 * 0.5, 3);
    });

    it('ignora los pares aceptables', () => {
      const [c] = scorer.score(
        [ficha({ CRL: 1.0, BRL: 1.0 })],
        hechos({
          desequilibrios: [
            { izquierda: 'CRL', derecha: 'BRL', diferencia: 1, clasificacion: 'ACEPTABLE' },
          ],
        }),
        PARAMS,
      );
      expect(c.aportes.desequilibrios.valor).toBe(0);
    });

    it('no aporta si el servicio no atiende ninguna dimensión del par', () => {
      // Con cobertura binaria este servicio habría puntuado igual que uno
      // que sí aborda el desequilibrio, premiando tener ficha ancha en vez
      // de ser pertinente.
      const [c] = scorer.score(
        [ficha({ TmRL: 1.0 })],
        hechos({
          desequilibrios: [
            { izquierda: 'TRL', derecha: 'IPRL', diferencia: 5, clasificacion: 'CRITICO' },
          ],
        }),
        PARAMS,
      );
      expect(c.aportes.desequilibrios.valor).toBe(0);
    });
  });

  describe('afinidad de etapa y penalización de rango', () => {
    it('aporta cuando la etapa del perfil está entre las pertinentes', () => {
      const [c] = scorer.score([ficha({})], hechos(), PARAMS);
      expect(c.aportes.afinidadEtapa.coincide).toBe(true);
      expect(c.aportes.afinidadEtapa.valor).toBeCloseTo(0.8, 3);
    });

    it('una etapa sin registrar no coincide con ninguna', () => {
      const [c] = scorer.score(
        [ficha({})],
        hechos({
          caracterizacion: {
            etapa: null,
            sector: null,
            tamanoEquipo: null,
            vinculacionAcademica: null,
          },
        }),
        PARAMS,
      );
      expect(c.aportes.afinidadEtapa.coincide).toBe(false);
      expect(c.aportes.afinidadEtapa.valor).toBe(0);
    });

    it('penaliza cuando el nivel promedio queda fuera de la banda del servicio', () => {
      const [c] = scorer.score(
        [ficha({}, { nivelMin: 4, nivelMax: 9 })],
        hechos({ nivelPromedio: 3.5 }),
        PARAMS,
      );
      expect(c.aportes.penalizacionRango.aplicada).toBe(true);
      expect(c.aportes.penalizacionRango.valor).toBeCloseTo(2.0, 3);
    });

    it('no penaliza en los extremos de la banda, que son inclusivos', () => {
      const [enMin] = scorer.score(
        [ficha({}, { nivelMin: 3.5 as unknown as number, nivelMax: 9 })],
        hechos({ nivelPromedio: 3.5 }),
        PARAMS,
      );
      expect(enMin.aportes.penalizacionRango.aplicada).toBe(false);
    });
  });

  describe('propiedades (fast-check)', () => {
    const arbIntensidades = fc.record(
      Object.fromEntries(
        DIMS.map((d) => [d, fc.constantFrom(...VALORES_ESCALA)]),
      ) as Record<DimensionCode, fc.Arbitrary<number>>,
    );

    it('el total es exactamente la suma de aportes menos la penalización', () => {
      fc.assert(
        fc.property(arbIntensidades, (intensidades) => {
          const [c] = scorer.score(
            [ficha(intensidades)],
            hechos(),
            PARAMS,
          );
          const esperado =
            c.aportes.cuelloBotella.valor +
            c.aportes.brechas.valor +
            c.aportes.desequilibrios.valor +
            c.aportes.afinidadEtapa.valor -
            c.aportes.penalizacionRango.valor;
          expect(c.total).toBeCloseTo(esperado, 3);
        }),
        { numRuns: 200 },
      );
    });

    it('el puntaje no decrece al aumentar la intensidad en el cuello de botella', () => {
      fc.assert(
        fc.property(
          arbIntensidades,
          fc.constantFrom(...VALORES_ESCALA),
          fc.constantFrom(...VALORES_ESCALA),
          (base, bajo, alto) => {
            fc.pre(bajo <= alto);
            const conBajo = { ...base, IPRL: bajo };
            const conAlto = { ...base, IPRL: alto };
            const [a] = scorer.score(
              [ficha(conBajo)],
              hechos(),
              PARAMS,
            );
            const [b] = scorer.score(
              [ficha(conAlto)],
              hechos(),
              PARAMS,
            );
            expect(b.total).toBeGreaterThanOrEqual(a.total - 1e-9);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('un servicio que no atiende ninguna dimensión solo puede aportar por etapa', () => {
      const [c] = scorer.score(
        [ficha(Object.fromEntries(DIMS.map((d) => [d, 0])))],
        hechos(),
        PARAMS,
      );
      expect(c.aportes.cuelloBotella.valor).toBe(0);
      expect(c.aportes.brechas.valor).toBe(0);
      expect(c.aportes.desequilibrios.valor).toBe(0);
      expect(c.total).toBeCloseTo(PARAMS.pesoAfinidadEtapa, 3);
    });

    it('el puntaje es determinista', () => {
      fc.assert(
        fc.property(arbIntensidades, (intensidades) => {
          const f = ficha(
            intensidades,
          );
          const [a] = scorer.score([f], hechos(), PARAMS);
          const [b] = scorer.score([f], hechos(), PARAMS);
          expect(a.total).toBe(b.total);
        }),
        { numRuns: 100 },
      );
    });
  });
});

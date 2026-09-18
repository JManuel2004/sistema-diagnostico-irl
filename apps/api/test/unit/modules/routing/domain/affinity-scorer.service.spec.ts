import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';
import type { DimensionCode, DiagnosticFacts } from '@innlab/contracts';
import { AffinityScorerService } from '../../../../../src/modules/routing/domain/services/affinity-scorer.service.js';
import type { NumericProfile } from '../../../../../src/modules/routing/domain/value-objects/ordinal-profile.vo.js';
import type { ScoringParameters } from '../../../../../src/modules/routing/domain/value-objects/scoring-parameters.vo.js';

const DIMS: DimensionCode[] = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'];
const VALORES_ESCALA = [0.0, 0.2, 0.5, 1.0];

const PARAMS: ScoringParameters = {
  bottleneckWeight: 3.0,
  gapWeight: 1.5,
  moderateImbalanceWeight: 0.5,
  criticalImbalanceWeight: 1.0,
  stageAffinityWeight: 0.8,
  outOfRangePenalty: 2.0,
  minimumThreshold: 2.5,
  alternativesCount: 2,
};

const scorer = new AffinityScorerService();

function profile(
  intensities: Partial<Record<DimensionCode, number>>,
  overrides: Partial<NumericProfile> = {},
): NumericProfile {
  const mapa = new Map<DimensionCode, number>(
    DIMS.map((d) => [d, intensities[d] ?? 0]),
  );
  const labels = new Map<DimensionCode, string>(
    DIMS.map((d) => [d, etiquetaPara(intensities[d] ?? 0)]),
  );
  return {
    idService: 1,
    serviceName: 'Servicio',
    minLevel: 1,
    maxLevel: 9,
    relevantStages: ['validacion'],
    intensities: mapa,
    labels,
    ...overrides,
  };
}

function etiquetaPara(v: number): string {
  if (v === 1.0) return 'primary';
  if (v === 0.5) return 'secondary';
  if (v === 0.2) return 'marginal';
  return 'not_applicable';
}

function facts(overrides: Partial<DiagnosticFacts> = {}): DiagnosticFacts {
  return {
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
    ...overrides,
  };
}

describe('AffinityScorerService', () => {
  describe('cuello de botella', () => {
    it('multiplica el peso por la intensity en la dimensión rezagada', () => {
      const [c] = scorer.score([profile({ IPRL: 0.5 })], facts(), PARAMS);
      expect(c.contributions.bottleneck.value).toBeCloseTo(1.5, 3);
    });

    it('promedia las intensities cuando varias dimensions empatan en el mínimo', () => {
      // Promediar trata el empate simétricamente. Tomar el mínimo sería
      // más conservador y el máximo más generoso; ambas romperían esa
      // simetría sin una razón de negocio que lo justifique.
      const [c] = scorer.score(
        [profile({ IPRL: 1.0, FRL: 0.0 })],
        facts({ bottlenecks: ['IPRL', 'FRL'] }),
        PARAMS,
      );
      expect(c.contributions.bottleneck.value).toBeCloseTo(3.0 * 0.5, 3);
    });

    it('registra la label ordinal de cada dimensión empatada', () => {
      const [c] = scorer.score(
        [profile({ IPRL: 1.0, FRL: 0.2 })],
        facts({ bottlenecks: ['IPRL', 'FRL'] }),
        PARAMS,
      );
      expect(c.contributions.bottleneck.details).toEqual([
        { dimension: 'IPRL', sourceLabel: 'primary', value: 1.0 },
        { dimension: 'FRL', sourceLabel: 'marginal', value: 0.2 },
      ]);
    });
  });

  describe('gaps', () => {
    it('suma las intensities sobre las dimensions en brecha', () => {
      const [c] = scorer.score(
        [profile({ BRL: 1.0, IPRL: 0.5, FRL: 0.5 })],
        facts(),
        PARAMS,
      );
      expect(c.contributions.gaps.value).toBeCloseTo(1.5 * 2.0, 3);
    });

    it('un perfil sin gaps no aporta por este término', () => {
      const [c] = scorer.score(
        [profile({ BRL: 1.0 })],
        facts({ gaps: [] }),
        PARAMS,
      );
      expect(c.contributions.gaps.value).toBe(0);
    });
  });

  describe('imbalances', () => {
    it('pondera el peso del pair por la intensity dominante de sus dos dimensions', () => {
      const [c] = scorer.score(
        [profile({ TRL: 0.0, IPRL: 0.5 })],
        facts({
          imbalances: [
            { left: 'TRL', right: 'IPRL', difference: 5, classification: 'CRITICAL' },
          ],
        }),
        PARAMS,
      );
      expect(c.contributions.imbalances.value).toBeCloseTo(1.0 * 0.5, 3);
    });

    it('ignora los pares aceptables', () => {
      const [c] = scorer.score(
        [profile({ CRL: 1.0, BRL: 1.0 })],
        facts({
          imbalances: [
            { left: 'CRL', right: 'BRL', difference: 1, classification: 'ACCEPTABLE' },
          ],
        }),
        PARAMS,
      );
      expect(c.contributions.imbalances.value).toBe(0);
    });

    it('no aporta si el service no atiende ninguna dimensión del pair', () => {
      // Con cobertura binaria este servicio habría puntuado igual que uno
      // que sí aborda el desequilibrio, premiando tener ficha ancha en vez
      // de ser pertinente.
      const [c] = scorer.score(
        [profile({ TmRL: 1.0 })],
        facts({
          imbalances: [
            { left: 'TRL', right: 'IPRL', difference: 5, classification: 'CRITICAL' },
          ],
        }),
        PARAMS,
      );
      expect(c.contributions.imbalances.value).toBe(0);
    });
  });

  describe('afinidad de stage y penalización de rango', () => {
    it('aporta cuando la stage del perfil está entre las pertinentes', () => {
      const [c] = scorer.score([profile({})], facts(), PARAMS);
      expect(c.contributions.stageAffinity.matches).toBe(true);
      expect(c.contributions.stageAffinity.value).toBeCloseTo(0.8, 3);
    });

    it('una stage sin registrar no matches con ninguna', () => {
      const [c] = scorer.score(
        [profile({})],
        facts({
          characterization: {
            stage: null,
            sector: null,
            teamSize: null,
            academicLinkage: null,
          },
        }),
        PARAMS,
      );
      expect(c.contributions.stageAffinity.matches).toBe(false);
      expect(c.contributions.stageAffinity.value).toBe(0);
    });

    it('penaliza cuando el nivel promedio queda fuera de la banda del service', () => {
      const [c] = scorer.score(
        [profile({}, { minLevel: 4, maxLevel: 9 })],
        facts({ averageLevel: 3.5 }),
        PARAMS,
      );
      expect(c.contributions.rangePenalty.applied).toBe(true);
      expect(c.contributions.rangePenalty.value).toBeCloseTo(2.0, 3);
    });

    it('no penaliza en los extremos de la banda, que son inclusivos', () => {
      const [enMin] = scorer.score(
        [profile({}, { minLevel: 3.5 as unknown as number, maxLevel: 9 })],
        facts({ averageLevel: 3.5 }),
        PARAMS,
      );
      expect(enMin.contributions.rangePenalty.applied).toBe(false);
    });
  });

  describe('propiedades (fast-check)', () => {
    const arbIntensidades = fc.record(
      Object.fromEntries(
        DIMS.map((d) => [d, fc.constantFrom(...VALORES_ESCALA)]),
      ) as Record<DimensionCode, fc.Arbitrary<number>>,
    );

    it('el total es exactamente la suma de contributions menos la penalización', () => {
      fc.assert(
        fc.property(arbIntensidades, (intensities) => {
          const [c] = scorer.score(
            [profile(intensities)],
            facts(),
            PARAMS,
          );
          const esperado =
            c.contributions.bottleneck.value +
            c.contributions.gaps.value +
            c.contributions.imbalances.value +
            c.contributions.stageAffinity.value -
            c.contributions.rangePenalty.value;
          expect(c.total).toBeCloseTo(esperado, 3);
        }),
        { numRuns: 200 },
      );
    });

    it('el score no decrece al aumentar la intensity en el cuello de botella', () => {
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
              [profile(conBajo)],
              facts(),
              PARAMS,
            );
            const [b] = scorer.score(
              [profile(conAlto)],
              facts(),
              PARAMS,
            );
            expect(b.total).toBeGreaterThanOrEqual(a.total - 1e-9);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('un service que no atiende ninguna dimensión solo puede aportar por stage', () => {
      const [c] = scorer.score(
        [profile(Object.fromEntries(DIMS.map((d) => [d, 0])))],
        facts(),
        PARAMS,
      );
      expect(c.contributions.bottleneck.value).toBe(0);
      expect(c.contributions.gaps.value).toBe(0);
      expect(c.contributions.imbalances.value).toBe(0);
      expect(c.total).toBeCloseTo(PARAMS.stageAffinityWeight, 3);
    });

    it('el score es determinista', () => {
      fc.assert(
        fc.property(arbIntensidades, (intensities) => {
          const f = profile(
            intensities,
          );
          const [a] = scorer.score([f], facts(), PARAMS);
          const [b] = scorer.score([f], facts(), PARAMS);
          expect(a.total).toBe(b.total);
        }),
        { numRuns: 100 },
      );
    });
  });
});

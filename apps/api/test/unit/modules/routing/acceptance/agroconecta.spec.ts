import { describe, expect, it } from '@jest/globals';
import type { DimensionCode, DiagnosticFacts } from '@innlab/contracts';
import {
  CALIBRATION_SCALE,
  ORDINAL_PROFILES,
  SCORING_PARAMETERS,
  ELIGIBILITY_RULES,
  EXCEPTION_RULES,
  SERVICES,
} from '../../../../../src/shared/kernel/infrastructure/database/seeds/data/routing.js';
import { CalibrationScale } from '../../../../../src/modules/routing/domain/value-objects/calibration-scale.vo.js';
import type { OrdinalProfile } from '../../../../../src/modules/routing/domain/value-objects/ordinal-profile.vo.js';
import { OrdinalTranslatorService } from '../../../../../src/modules/routing/domain/services/ordinal-translator.service.js';
import { EligibilityFilterService } from '../../../../../src/modules/routing/domain/services/eligibility-filter.service.js';
import { AffinityScorerService } from '../../../../../src/modules/routing/domain/services/affinity-scorer.service.js';
import { ExceptionEngineService } from '../../../../../src/modules/routing/domain/services/exception-engine.service.js';
import { PredicateCompilerService } from '../../../../../src/modules/routing/domain/services/predicate-compiler.service.js';
import type { CompiledEligibilityRule } from '../../../../../src/modules/routing/domain/services/eligibility-filter.service.js';
import type { CompiledExceptionRule } from '../../../../../src/modules/routing/domain/services/exception-engine.service.js';

/**
 * Acceptance test of the routing engine — AgroConecta case.
 *
 * Runs the whole engine against **the configuration the seed plants**, not
 * against a parallel fixture: it imports `data/routing.ts` directly, so if
 * someone changes a profile or a weight the test catches it. A fixture of
 * its own would have made this a test of itself.
 *
 * The expected values were derived by hand from the scale, the profiles and
 * the declared weights, not by observing what the code produces. The
 * term-by-term breakdown is below so they can be checked without running
 * anything.
 *
 * AgroConecta profile: TRL 6 · CRL 4 · BRL 3 · IPRL 1 · TmRL 5 · FRL 2
 *   - bottleneck:       IPRL (level 1, no tie)
 *   - gaps (IRL ≤ 3):   BRL, IPRL, FRL  → three
 *   - average level:    21 / 6 = 3.5
 *   - imbalances:       TRL-IPRL critical (5); TRL-CRL, TRL-BRL,
 *                       TmRL-FRL and BRL-IPRL moderate; CRL-BRL acceptable
 */

const ID_BY_SERVICE = new Map(
  SERVICES.map((s, i) => [s.name, i + 1] as const),
);

const LEVELS: Record<DimensionCode, number> = {
  TRL: 6,
  CRL: 4,
  BRL: 3,
  IPRL: 1,
  TmRL: 5,
  FRL: 2,
};

const FACTS_AGROCONECTA: DiagnosticFacts = {
  diagnosticId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  levelByDimension: LEVELS,
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
  // The case document records `academic linkage` as "null (assumed
  // false)". The assumption is encoded explicitly as `false` instead of
  // leaving it to a coercion of `null`, so it is visible in the data: the
  // engine treats `null` as "does not exclude", so relying on the coercion
  // would silently have given the opposite result.
  characterization: {
    stage: 'validacion',
    sector: 'agroindustria',
    teamSize: 3,
    academicLinkage: false,
  },
};

function buildEngine() {
  const compiler = new PredicateCompilerService();
  const scale = CalibrationScale.create(
    CALIBRATION_SCALE.map((p) => ({
      label: p.label,
      value: p.value,
      order: p.order,
    })),
  );

  const profiles: OrdinalProfile[] = ORDINAL_PROFILES.map((f) => ({
    idService: ID_BY_SERVICE.get(f.service)!,
    serviceName: f.service,
    minLevel: f.minLevel,
    maxLevel: f.maxLevel,
    relevantStages: f.relevantStages,
    intensities: new Map(
      Object.entries(f.intensities) as [DimensionCode, string][],
    ),
  }));

  const eligibilityRules: CompiledEligibilityRule[] =
    ELIGIBILITY_RULES.map((r) => ({
      code: r.code,
      idService: ID_BY_SERVICE.get(r.service)!,
      expression: compiler.compile(r.predicate, 'BOOLEAN'),
      exclusionMessage: r.exclusionMessage,
    }));

  const exceptionRules: CompiledExceptionRule[] = EXCEPTION_RULES.map(
    (r) => ({
      code: r.code,
      priorityOrder: r.priorityOrder,
      expression: compiler.compile(r.predicate, 'WITH_DEGREE'),
      action: r.action,
      idTargetService: ID_BY_SERVICE.get(r.targetService)!,
      positions: r.positions,
      declaredReason: r.declaredReason,
    }),
  );

  return { scale, profiles, eligibilityRules, exceptionRules };
}

function evaluate(facts: DiagnosticFacts) {
  const { scale, profiles, eligibilityRules, exceptionRules } =
    buildEngine();

  const numericas = new OrdinalTranslatorService().translate(profiles, scale);
  const { eligible, excluded } = new EligibilityFilterService().filter(
    numericas,
    eligibilityRules,
    facts,
  );
  const scored = new AffinityScorerService().score(
    eligible,
    facts,
    SCORING_PARAMETERS,
  );
  const initialRanking = [...scored].sort((a, b) =>
    b.total !== a.total ? b.total - a.total : a.idService - b.idService,
  );
  const result = new ExceptionEngineService().apply(
    initialRanking,
    exceptionRules,
    facts,
  );

  return { excluded, initialRanking, ...result };
}

describe('Aceptación — enrutamiento de portafolio para AgroConecta', () => {
  describe('capa 1 · eligibility', () => {
    it('excluye Proyectos de Grado por falta de vinculación académica (ELG-01)', () => {
      const { excluded } = evaluate(FACTS_AGROCONECTA);

      expect(excluded).toHaveLength(1);
      expect(excluded[0].name).toBe('Proyectos de Grado');
      expect(excluded[0].exclusionMessage).toContain(
        'vinculación académica confirmada',
      );
    });

    it('no excluye Retos en el Aula: el equipo tiene 3 personas (ELG-02 exige ≥2)', () => {
      const { excluded } = evaluate(FACTS_AGROCONECTA);

      expect(excluded.map((e) => e.name)).not.toContain('Retos en el Aula');
    });
  });

  describe('capa 2 · cálculo de afinidad', () => {
    /**
     * Consultoría breakdown, derived by hand from the configuration:
     *
     *   intensities → TRL 0.0 · CRL 1.0 · BRL 1.0 · IPRL 0.5 · TmRL 0.0 · FRL 0.5
     *
     *   bottleneck (IPRL)  3.0 × 0.5                              = 1.50
     *   gaps               1.5 × (BRL 1.0 + IPRL 0.5 + FRL 0.5)   = 3.00
     *   imbalances      TRL-CRL   0.5 × max(0.0, 1.0) = 0.50
     *                   TRL-BRL   0.5 × max(0.0, 1.0) = 0.50
     *                   CRL-BRL   acceptable          = 0.00
     *                   TmRL-FRL  0.5 × max(0.0, 0.5) = 0.25
     *                   BRL-IPRL  0.5 × max(1.0, 0.5) = 0.50
     *                   TRL-IPRL  1.0 × max(0.0, 0.5) = 0.50      = 2.25
     *   stage affinity  validation ∈ {validation, growth}         = 0.80
     *   penalty         average 3.5 < min_level 4                 = −2.00
     *                                                     total =  5.55
     */
    it('puntúa Consultoría en 5.55, con el breakdown término a término esperado', () => {
      const { initialRanking } = evaluate(FACTS_AGROCONECTA);
      const consulting = initialRanking.find(
        (c) => c.serviceName === 'Consultoría',
      );

      expect(consulting).toBeDefined();
      expect(consulting!.contributions.bottleneck.value).toBeCloseTo(1.5, 3);
      expect(consulting!.contributions.gaps.value).toBeCloseTo(3.0, 3);
      expect(consulting!.contributions.imbalances.value).toBeCloseTo(2.25, 3);
      expect(consulting!.contributions.stageAffinity.value).toBeCloseTo(0.8, 3);
      expect(consulting!.contributions.rangePenalty.value).toBeCloseTo(2.0, 3);
      expect(consulting!.contributions.rangePenalty.applied).toBe(true);
      expect(consulting!.total).toBeCloseTo(5.55, 3);
    });

    it('produce el ranking pre-excepción esperado', () => {
      const { initialRanking } = evaluate(FACTS_AGROCONECTA);

      expect(
        initialRanking.map((c) => [c.serviceName, c.total] as const),
      ).toEqual([
        ['Consultoría', 5.55],
        ['Mentoría', 3.8],
        ['Proyectos Integradores', 3.05],
        ['Formación', 3.0],
        ['Retos en el Aula', 2.9],
      ]);
    });

    it('conserva la label ordinal de origen junto a cada contribution', () => {
      const { initialRanking } = evaluate(FACTS_AGROCONECTA);
      const consulting = initialRanking.find(
        (c) => c.serviceName === 'Consultoría',
      )!;

      // It is what allows explaining "it is secondary in IPRL" instead of
      // exposing the 0.5 of the calibration.
      expect(consulting.contributions.bottleneck.details).toEqual([
        { dimension: 'IPRL', sourceLabel: 'secondary', value: 0.5 },
      ]);
    });
  });

  describe('capa 3 · ajustes puntuales', () => {
    it('activa E-01 y descarta E-02 y E-03, en ese order de prioridad', () => {
      const { applied, discarded } = evaluate(FACTS_AGROCONECTA);

      expect(applied.map((e) => e.code)).toEqual(['E-01']);
      expect(discarded.map((e) => e.code)).toEqual(['E-02', 'E-03']);
    });

    it('E-01 fuerza Consultoría y deja constancia de que era una decisión, no un cálculo', () => {
      const { applied } = evaluate(FACTS_AGROCONECTA);
      const e01 = applied[0];

      expect(e01.action).toBe('FORCE');
      expect(e01.targetService).toBe('Consultoría');
      expect(e01.declaredReason).toContain('riesgo legal crítico');
      // Consultoría was already first by calculation; the trace has to say
      // that it was also pinned explicitly, because for the audit "it won"
      // and "it was decided that it would win" are not the same.
      expect(e01.effect).toContain('ya ocupaba el puesto 1');
      expect(e01.rankingBefore[0].serviceName).toBe('Consultoría');
      expect(e01.rankingAfter[0].serviceName).toBe('Consultoría');
    });

    it('descarta E-02 porque el cuello de botella es IPRL', () => {
      const { discarded } = evaluate(FACTS_AGROCONECTA);
      // gaps count >= 3 holds, but NOT(bottleneck contains IPRL) does
      // not: the guard is precisely what keeps an adjustment meant for
      // diffuse profiles from displacing a service chosen for a specific
      // urgency.
      expect(discarded.find((e) => e.code === 'E-02')?.reason).toContain(
        'no se cumple',
      );
    });
  });

  describe('resultado final', () => {
    it('recomienda Consultoría, con Mentoría y Proyectos Integradores como alternatives', () => {
      const { finalRanking } = evaluate(FACTS_AGROCONECTA);
      const aboveThreshold = finalRanking.filter(
        (c) => c.total >= SCORING_PARAMETERS.minimumThreshold,
      );

      expect(aboveThreshold[0].serviceName).toBe('Consultoría');
      expect(
        aboveThreshold
          .slice(1, 1 + SCORING_PARAMETERS.alternativesCount)
          .map((c) => c.serviceName),
      ).toEqual(['Mentoría', 'Proyectos Integradores']);
    });

    it('todos los candidates eligible superan el threshold mínimo de 2.5', () => {
      const { finalRanking } = evaluate(FACTS_AGROCONECTA);

      expect(
        finalRanking.every((c) => c.total >= SCORING_PARAMETERS.minimumThreshold),
      ).toBe(true);
    });
  });

  describe('sensibilidad del caso', () => {
    /**
     * Counter-check of E-02's guard. If the bottleneck were not IPRL, E-01
     * would not fire and E-02 would, promoting Retos en el Aula two
     * positions. Checking it is what proves the guard does something and that
     * the priority cascade is not decorative.
     */
    it('sin cuello de botella en IPRL, E-01 calla y E-02 promueve Retos en el Aula', () => {
      const withoutIprl: DiagnosticFacts = {
        ...FACTS_AGROCONECTA,
        levelByDimension: { ...LEVELS, IPRL: 5, BRL: 1 },
        bottlenecks: ['BRL'],
        gaps: ['BRL', 'FRL', 'CRL'],
        imbalances: FACTS_AGROCONECTA.imbalances.map((d) =>
          d.left === 'TRL' && d.right === 'IPRL'
            ? { ...d, difference: 1, classification: 'ACCEPTABLE' as const }
            : d,
        ),
      };

      const { applied, discarded } = evaluate(withoutIprl);

      expect(discarded.map((e) => e.code)).toContain('E-01');
      expect(applied.map((e) => e.code)).toContain('E-02');

      const e02 = applied.find((e) => e.code === 'E-02')!;
      expect(e02.action).toBe('PROMOTE');
      expect(e02.targetService).toBe('Retos en el Aula');

      const before = e02.rankingBefore.findIndex(
        (c) => c.serviceName === 'Retos en el Aula',
      );
      const after = e02.rankingAfter.findIndex(
        (c) => c.serviceName === 'Retos en el Aula',
      );
      expect(after).toBe(Math.max(0, before - 2));
    });
  });
});

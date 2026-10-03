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
import type { AdjustmentOnlyService } from '../../../../../src/modules/routing/domain/value-objects/adjustment-only-service.vo.js';
import { isIncluded } from '../../../../../src/modules/routing/domain/value-objects/scored-candidate.vo.js';
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
 * The services are INNLAB's official portfolio; their intensities, stages
 * and rules are simulated (see `data/routing.ts`).
 *
 * AgroConecta profile: TRL 6 · CRL 4 · BRL 3 · IPRL 1 · TmRL 5 · FRL 2
 *   - bottleneck:       IPRL (level 1, no tie)
 *   - gaps (IRL ≤ 3):   BRL, IPRL, FRL  → three
 *   - average level:    21 / 6 = 3.5
 *   - imbalances:       TRL-IPRL critical (5); TRL-CRL, TRL-BRL,
 *                       TmRL-FRL and BRL-IPRL moderate; CRL-BRL acceptable
 */

const ID_BY_SERVICE = new Map(SERVICES.map((s, i) => [s.name, i + 1] as const));
const ADJUSTMENT_ONLY = new Set(
  SERVICES.filter((s) => s.adjustmentOnly).map((s) => s.name),
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
  characterization: {
    stage: 'validacion',
    sector: 'agroindustria',
    teamSize: 3,
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

  // As the configuration repository does: only scored services get a profile
  // for layers 1 and 2; adjustment-only ones are kept apart for layer 3.
  const profiles: OrdinalProfile[] = ORDINAL_PROFILES.filter(
    (f) => !ADJUSTMENT_ONLY.has(f.service),
  ).map((f) => ({
    idService: ID_BY_SERVICE.get(f.service)!,
    serviceName: f.service,
    minLevel: f.minLevel!,
    maxLevel: f.maxLevel!,
    relevantStages: f.relevantStages,
    intensities: new Map(
      Object.entries(f.intensities) as [DimensionCode, string][],
    ),
  }));
  const adjustmentOnly: AdjustmentOnlyService[] = SERVICES.filter(
    (s) => s.adjustmentOnly,
  ).map((s) => ({
    idService: ID_BY_SERVICE.get(s.name)!,
    serviceName: s.name,
  }));

  const eligibilityRules: CompiledEligibilityRule[] = ELIGIBILITY_RULES.map(
    (r) => ({
      code: r.code,
      idService: ID_BY_SERVICE.get(r.service)!,
      expression: compiler.compile(r.predicate, 'BOOLEAN'),
      exclusionMessage: r.exclusionMessage,
    }),
  );

  const exceptionRules: CompiledExceptionRule[] = EXCEPTION_RULES.map((r) => ({
    code: r.code,
    priorityOrder: r.priorityOrder,
    expression: compiler.compile(r.predicate, 'WITH_DEGREE'),
    action: r.action,
    idTargetService: ID_BY_SERVICE.get(r.targetService)!,
    positions: r.positions,
    declaredReason: r.declaredReason,
  }));

  return { scale, profiles, adjustmentOnly, eligibilityRules, exceptionRules };
}

function evaluate(facts: DiagnosticFacts) {
  const { scale, profiles, adjustmentOnly, eligibilityRules, exceptionRules } =
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
    adjustmentOnly,
  );

  return { excluded, initialRanking, ...result };
}

describe('Aceptación — enrutamiento de portafolio para AgroConecta', () => {
  describe('servicios solo por ajuste', () => {
    it('no participan en la capa 1 ni en la 2: no se excluyen ni se puntúan', () => {
      const { excluded, initialRanking } = evaluate(FACTS_AGROCONECTA);
      const seen = [
        ...excluded.map((e) => e.name),
        ...initialRanking.map((c) => c.serviceName),
      ];

      expect([...ADJUSTMENT_ONLY].sort()).toEqual([
        'Academia a la Medida',
        'Alianza Residente',
        'Chispa',
        'Práctica de Innovación',
      ]);
      for (const name of ADJUSTMENT_ONLY) expect(seen).not.toContain(name);
    });
  });

  describe('capa 1 · eligibility', () => {
    it('no excluye ningún servicio: su equipo tiene más de una persona', () => {
      const { excluded, initialRanking } = evaluate(FACTS_AGROCONECTA);

      expect(excluded).toEqual([]);
      expect(initialRanking.map((c) => c.serviceName)).toContain(
        'Célula de Grado · Posgrado',
      );
    });

    it('no excluye Reto en el Aula: el equipo tiene 3 personas (ELG-02 exige ≥2)', () => {
      const { excluded } = evaluate(FACTS_AGROCONECTA);

      expect(excluded.map((e) => e.name)).not.toContain('Reto en el Aula');
    });
  });

  describe('capa 2 · cálculo de afinidad', () => {
    /**
     * Reto Express breakdown, derived by hand from the configuration:
     *
     *   intensities → TRL 1.0 · CRL 0.5 · BRL 0.2 · IPRL 0.0 · TmRL 0.2 · FRL 0.0
     *
     *   bottleneck (IPRL)  3.0 × 0.0                              = 0.00
     *   gaps               1.5 × (BRL 0.2 + IPRL 0.0 + FRL 0.0)   = 0.30
     *   imbalances      TRL-CRL   0.5 × max(1.0, 0.5) = 0.50
     *                   TRL-BRL   0.5 × max(1.0, 0.2) = 0.50
     *                   CRL-BRL   acceptable          = 0.00
     *                   TmRL-FRL  0.5 × max(0.2, 0.0) = 0.10
     *                   BRL-IPRL  0.5 × max(0.2, 0.0) = 0.10
     *                   TRL-IPRL  1.0 × max(1.0, 0.0) = 1.00      = 2.20
     *   stage affinity  validacion ∈ {idea, validacion}           = 0.80
     *   penalty         average 3.5 within 3–5                    = 0.00
     *                                                     total =  3.30
     */
    it('puntúa Reto Express en 3.30, con el desglose término a término esperado', () => {
      const { initialRanking } = evaluate(FACTS_AGROCONECTA);
      const reto = initialRanking.find((c) => c.serviceName === 'Reto Express');

      expect(reto).toBeDefined();
      expect(reto!.contributions.bottleneck.value).toBeCloseTo(0, 3);
      expect(reto!.contributions.gaps.value).toBeCloseTo(0.3, 3);
      expect(reto!.contributions.imbalances.value).toBeCloseTo(2.2, 3);
      expect(reto!.contributions.stageAffinity.value).toBeCloseTo(0.8, 3);
      expect(reto!.contributions.rangePenalty.applied).toBe(false);
      expect(reto!.total).toBeCloseTo(3.3, 3);
    });

    /**
     * Célula de Grado · Posgrado breakdown, by hand:
     *
     *   intensities → TRL 0.2 · CRL 1.0 · BRL 1.0 · IPRL 0.0 · TmRL 0.5 · FRL 0.2
     *
     *   bottleneck (IPRL)  3.0 × 0.0                              = 0.00
     *   gaps               1.5 × (BRL 1.0 + IPRL 0.0 + FRL 0.2)   = 1.80
     *   imbalances      TRL-CRL   0.5 × max(0.2, 1.0) = 0.50
     *                   TRL-BRL   0.5 × max(0.2, 1.0) = 0.50
     *                   CRL-BRL   acceptable          = 0.00
     *                   TmRL-FRL  0.5 × max(0.5, 0.2) = 0.25
     *                   BRL-IPRL  0.5 × max(1.0, 0.0) = 0.50
     *                   TRL-IPRL  1.0 × max(0.2, 0.0) = 0.20      = 1.95
     *   stage affinity  validacion ∈ {idea, validacion}           = 0.80
     *   penalty         average 3.5 within 3–5                    = 0.00
     *                                                     total =  4.55
     */
    it('puntúa Célula de Grado · Posgrado en 4.55: trabaja Cliente y Negocio dentro de su banda', () => {
      const { initialRanking } = evaluate(FACTS_AGROCONECTA);
      const posgrado = initialRanking.find(
        (c) => c.serviceName === 'Célula de Grado · Posgrado',
      );

      expect(posgrado).toBeDefined();
      expect(posgrado!.contributions.gaps.value).toBeCloseTo(1.8, 3);
      expect(posgrado!.contributions.imbalances.value).toBeCloseTo(1.95, 3);
      expect(posgrado!.contributions.rangePenalty.applied).toBe(false);
      expect(posgrado!.total).toBeCloseTo(4.55, 3);
    });

    /**
     * The rest, by hand (bottleneck + gaps + imbalances + stage − penalty):
     *   Célula Dedicada · Co.LAB  0.60 + 1.05 + 2.50 + 0.0 − 2.0 = 2.15
     *   Célula de Grado · Pregr.  0.60 + 0.60 + 2.10 + 0.8 − 2.0 = 2.10
     *   Consultoría Experta       0.60 + 1.05 + 2.35 + 0.0 − 2.0 = 2.00
     *   Reto en el Aula           0.00 + 0.75 + 2.25 + 0.8 − 2.0 = 1.80
     *   Semillero con Propósito   0.00 + 0.30 + 2.35 + 0.8 − 2.0 = 1.45
     *   Talento In-House          0.00 + 0.30 + 2.60 + 0.0 − 2.0 = 0.90
     * Every one of them is outside its band for an average of 3.5.
     */
    it('produce el ranking previo a los ajustes esperado', () => {
      const { initialRanking } = evaluate(FACTS_AGROCONECTA);

      expect(
        initialRanking.map((c) => [c.serviceName, c.total] as const),
      ).toEqual([
        ['Célula de Grado · Posgrado', 4.55],
        ['Reto Express', 3.3],
        ['Célula Dedicada · Co.LAB', 2.15],
        ['Célula de Grado · Pregrado', 2.1],
        ['Consultoría Experta', 2.0],
        ['Reto en el Aula', 1.8],
        ['Semillero con Propósito', 1.45],
        ['Talento In-House', 0.9],
      ]);
    });

    it('conserva la etiqueta ordinal de origen junto a cada contribución', () => {
      const { initialRanking } = evaluate(FACTS_AGROCONECTA);
      const colab = initialRanking.find(
        (c) => c.serviceName === 'Célula Dedicada · Co.LAB',
      )!;

      // It is what allows explaining "it is marginal in IPRL" instead of
      // exposing the 0.2 of the calibration.
      expect(colab.contributions.bottleneck.details).toEqual([
        { dimension: 'IPRL', sourceLabel: 'marginal', value: 0.2 },
      ]);
    });
  });

  describe('capa 3 · ajustes', () => {
    it('solo se dispara INC-02; los demás se descartan en su orden de prioridad', () => {
      const { applied, discarded } = evaluate(FACTS_AGROCONECTA);

      expect(applied.map((e) => e.code)).toEqual(['INC-02']);
      expect(discarded.map((e) => e.code)).toEqual([
        'E-02',
        'E-03',
        'INC-01',
        'INC-03',
        'INC-04',
      ]);
    });

    it('INC-02 mete Academia a la Medida en el puesto 2 del ranking, sin puntaje', () => {
      const { applied, finalRanking } = evaluate(FACTS_AGROCONECTA);
      const inc02 = applied[0];

      expect(inc02.action).toBe('INCLUDE');
      expect(inc02.targetService).toBe('Academia a la Medida');
      expect(inc02.effect).toBe(
        'Academia a la Medida entra al ranking en el puesto 2, sin puntaje',
      );
      expect(finalRanking.map((c) => c.serviceName)).toEqual([
        'Célula de Grado · Posgrado',
        'Academia a la Medida',
        'Reto Express',
        'Célula Dedicada · Co.LAB',
        'Célula de Grado · Pregrado',
        'Consultoría Experta',
        'Reto en el Aula',
        'Semillero con Propósito',
        'Talento In-House',
      ]);
      expect(isIncluded(finalRanking[1])).toBe(true);
    });

    it('descarta E-02 porque el cuello de botella es IPRL', () => {
      const { discarded } = evaluate(FACTS_AGROCONECTA);
      // gaps count >= 3 holds, but NOT(bottleneck contains IPRL) does not:
      // the guard keeps an adjustment meant for diffuse profiles from
      // displacing a service chosen for a specific urgency.
      expect(discarded.find((e) => e.code === 'E-02')?.reason).toContain(
        'no se cumple',
      );
    });
  });

  describe('resultado final', () => {
    it('recomienda Célula de Grado · Posgrado, con Academia a la Medida (exenta del umbral) y Reto Express', () => {
      const { finalRanking } = evaluate(FACTS_AGROCONECTA);
      // The included service passes without a score; of the scored ones,
      // only Célula de Grado · Posgrado and Reto Express reach the threshold (2.5).
      const eligibleForResult = finalRanking.filter(
        (c) => isIncluded(c) || c.total >= SCORING_PARAMETERS.minimumThreshold,
      );

      expect(eligibleForResult.map((c) => c.serviceName)).toEqual([
        'Célula de Grado · Posgrado',
        'Academia a la Medida',
        'Reto Express',
      ]);
    });
  });

  describe('sensibilidad del caso', () => {
    /**
     * Counter-check of E-02's guard. If the bottleneck were not IPRL, E-02
     * would fire and promote Reto en el Aula two positions. Checking it is
     * what proves the guard does something.
     */
    it('sin cuello de botella en IPRL, E-02 promueve Reto en el Aula', () => {
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

      const { applied } = evaluate(withoutIprl);
      const e02 = applied.find((e) => e.code === 'E-02')!;

      expect(e02.action).toBe('PROMOTE');
      expect(e02.targetService).toBe('Reto en el Aula');
      const before = e02.rankingBefore.findIndex(
        (c) => c.serviceName === 'Reto en el Aula',
      );
      const after = e02.rankingAfter.findIndex(
        (c) => c.serviceName === 'Reto en el Aula',
      );
      expect(after).toBe(Math.max(0, before - 2));
    });

    it('un equipo de una persona excluye Reto en el Aula e incluye Práctica de Innovación', () => {
      const solo: DiagnosticFacts = {
        ...FACTS_AGROCONECTA,
        characterization: {
          ...FACTS_AGROCONECTA.characterization,
          teamSize: 1,
        },
      };

      const { excluded, finalRanking } = evaluate(solo);

      expect(excluded.map((e) => e.ruleCode)).toContain('ELG-02');
      // INC-02 puts Academia in position 2; INC-03, applied after it, puts
      // Práctica in position 2 and pushes Academia to 3.
      expect(finalRanking.slice(0, 3).map((c) => c.serviceName)).toEqual([
        'Célula de Grado · Posgrado',
        'Práctica de Innovación',
        'Academia a la Medida',
      ]);
    });
  });
});

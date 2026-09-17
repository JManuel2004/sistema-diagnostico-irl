import { describe, expect, it } from '@jest/globals';
import type { DimensionCode, DiagnosticFacts } from '@innlab/contracts';
import {
  CALIBRATION_SCALE,
  ORDINAL_PROFILES,
  SCORING_PARAMETERS,
  ELIGIBILITY_RULES,
  EXCEPTION_RULES,
  SERVICES,
} from '../../../../../src/infrastructure/database/seeds/data/portfolio-routing.js';
import { CalibrationScale } from '../../../../../src/modules/portfolio-routing/domain/value-objects/calibration-scale.vo.js';
import type { OrdinalProfile } from '../../../../../src/modules/portfolio-routing/domain/value-objects/ordinal-profile.vo.js';
import { OrdinalTranslatorService } from '../../../../../src/modules/portfolio-routing/domain/services/ordinal-translator.service.js';
import { EligibilityFilterService } from '../../../../../src/modules/portfolio-routing/domain/services/eligibility-filter.service.js';
import { AffinityScorerService } from '../../../../../src/modules/portfolio-routing/domain/services/affinity-scorer.service.js';
import { ExceptionEngineService } from '../../../../../src/modules/portfolio-routing/domain/services/exception-engine.service.js';
import { PredicateCompilerService } from '../../../../../src/modules/portfolio-routing/domain/services/predicate-compiler.service.js';
import type { CompiledEligibilityRule } from '../../../../../src/modules/portfolio-routing/domain/services/eligibility-filter.service.js';
import type { CompiledExceptionRule } from '../../../../../src/modules/portfolio-routing/domain/services/exception-engine.service.js';

/**
 * Prueba de aceptación del motor de enrutamiento — caso AgroConecta.
 *
 * Corre el motor completo contra **la configuración que siembra el seed**,
 * no contra un fixture paralelo: importa `data/portfolio-routing.ts`
 * directamente, de modo que si alguien cambia una ficha o un peso la
 * prueba lo detecta. Un fixture propio habría convertido esto en una
 * prueba de sí misma.
 *
 * Los valores esperados se derivaron a mano de la escala, las fichas y
 * los pesos declarados, no observando lo que produce el código. El
 * desglose término a término está más abajo para que sean verificables
 * sin ejecutar nada.
 *
 * Perfil de AgroConecta: TRL 6 · CRL 4 · BRL 3 · IPRL 1 · TmRL 5 · FRL 2
 *   - cuello de botella: IPRL (nivel 1, sin empate)
 *   - brechas (IRL ≤ 3):  BRL, IPRL, FRL  → tres
 *   - nivel promedio:     21 / 6 = 3.5
 *   - desequilibrios:     TRL-IPRL crítico (5); TRL-CRL, TRL-BRL,
 *                         TmRL-FRL y BRL-IPRL moderados; CRL-BRL aceptable
 */

const ID_POR_SERVICIO = new Map(
  SERVICES.map((s, i) => [s.name, i + 1] as const),
);

const NIVELES: Record<DimensionCode, number> = {
  TRL: 6,
  CRL: 4,
  BRL: 3,
  IPRL: 1,
  TmRL: 5,
  FRL: 2,
};

const FACTS_AGROCONECTA: DiagnosticFacts = {
  diagnosticId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  levelByDimension: NIVELES,
  bottlenecks: ['IPRL'],
  gaps: ['BRL', 'IPRL', 'FRL'],
  imbalances: [
    { left: 'TRL', right: 'CRL', difference: 2, classification: 'MODERADO' },
    { left: 'TRL', right: 'BRL', difference: 3, classification: 'MODERADO' },
    { left: 'CRL', right: 'BRL', difference: 1, classification: 'ACEPTABLE' },
    { left: 'TmRL', right: 'FRL', difference: 3, classification: 'MODERADO' },
    { left: 'BRL', right: 'IPRL', difference: 2, classification: 'MODERADO' },
    { left: 'TRL', right: 'IPRL', difference: 5, classification: 'CRITICO' },
  ],
  averageLevel: 3.5,
  // El documento del caso registra `vinculacion_academica` como "null
  // (asumido falso)". El supuesto se codifica explícitamente como `false`
  // en vez de dejarlo a una coerción de `null`, para que quede visible en
  // el dato: el motor trata `null` como "no excluye", así que confiar en
  // la coerción habría dado el resultado contrario en silencio.
  characterization: {
    stage: 'validacion',
    sector: 'agroindustria',
    teamSize: 3,
    academicLinkage: false,
  },
};

function construirEngine() {
  const compiler = new PredicateCompilerService();
  const scale = CalibrationScale.create(
    CALIBRATION_SCALE.map((p) => ({
      label: p.label,
      value: p.value,
      order: p.order,
    })),
  );

  const profiles: OrdinalProfile[] = ORDINAL_PROFILES.map((f) => ({
    idService: ID_POR_SERVICIO.get(f.service)!,
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
      idRegla: r.code,
      idService: ID_POR_SERVICIO.get(r.service)!,
      expresion: compiler.compile(r.predicate, 'BOOLEAN'),
      exclusionMessage: r.exclusionMessage,
    }));

  const exceptionRules: CompiledExceptionRule[] = EXCEPTION_RULES.map(
    (r) => ({
      code: r.code,
      priorityOrder: r.priorityOrder,
      expresion: compiler.compile(r.predicate, 'WITH_DEGREE'),
      action: r.action,
      idTargetService: ID_POR_SERVICIO.get(r.targetService)!,
      positions: r.positions,
      declaredReason: r.declaredReason,
    }),
  );

  return { scale, profiles, eligibilityRules, exceptionRules };
}

function evaluar(facts: DiagnosticFacts) {
  const { scale, profiles, eligibilityRules, exceptionRules } =
    construirEngine();

  const numericas = new OrdinalTranslatorService().translate(profiles, scale);
  const { eligible, excluded } = new EligibilityFilterService().filter(
    numericas,
    eligibilityRules,
    facts,
  );
  const puntuados = new AffinityScorerService().score(
    eligible,
    facts,
    SCORING_PARAMETERS,
  );
  const rankingPre = [...puntuados].sort((a, b) =>
    b.total !== a.total ? b.total - a.total : a.idService - b.idService,
  );
  const resultado = new ExceptionEngineService().apply(
    rankingPre,
    exceptionRules,
    facts,
  );

  return { excluded, rankingPre, ...resultado };
}

describe('Aceptación — enrutamiento de portafolio para AgroConecta', () => {
  describe('capa 1 · eligibility', () => {
    it('excluye Proyectos de Grado por falta de vinculación académica (ELG-01)', () => {
      const { excluded } = evaluar(FACTS_AGROCONECTA);

      expect(excluded).toHaveLength(1);
      expect(excluded[0].name).toBe('Proyectos de Grado');
      expect(excluded[0].exclusionMessage).toContain(
        'vinculación académica confirmada',
      );
    });

    it('no excluye Retos en el Aula: el equipo tiene 3 personas (ELG-02 exige ≥2)', () => {
      const { excluded } = evaluar(FACTS_AGROCONECTA);

      expect(excluded.map((e) => e.name)).not.toContain('Retos en el Aula');
    });
  });

  describe('capa 2 · cálculo de afinidad', () => {
    /**
     * Desglose de Consultoría, derivado a mano de la configuración:
     *
     *   intensities → TRL 0.0 · CRL 1.0 · BRL 1.0 · IPRL 0.5 · TmRL 0.0 · FRL 0.5
     *
     *   cuello (IPRL)   3.0 × 0.5                              = 1.50
     *   brechas         1.5 × (BRL 1.0 + IPRL 0.5 + FRL 0.5)   = 3.00
     *   desequilibrios  TRL-CRL   0.5 × max(0.0, 1.0) = 0.50
     *                   TRL-BRL   0.5 × max(0.0, 1.0) = 0.50
     *                   CRL-BRL   aceptable           = 0.00
     *                   TmRL-FRL  0.5 × max(0.0, 0.5) = 0.25
     *                   BRL-IPRL  0.5 × max(1.0, 0.5) = 0.50
     *                   TRL-IPRL  1.0 × max(0.0, 0.5) = 0.50   = 2.25
     *   afinidad etapa  validación ∈ {validación, crecimiento} = 0.80
     *   penalización    promedio 3.5 < nivel_min 4             = −2.00
     *                                                    total =  5.55
     */
    it('puntúa Consultoría en 5.55, con el breakdown término a término esperado', () => {
      const { rankingPre } = evaluar(FACTS_AGROCONECTA);
      const consultoria = rankingPre.find(
        (c) => c.serviceName === 'Consultoría',
      );

      expect(consultoria).toBeDefined();
      expect(consultoria!.contributions.bottleneck.value).toBeCloseTo(1.5, 3);
      expect(consultoria!.contributions.gaps.value).toBeCloseTo(3.0, 3);
      expect(consultoria!.contributions.imbalances.value).toBeCloseTo(2.25, 3);
      expect(consultoria!.contributions.stageAffinity.value).toBeCloseTo(0.8, 3);
      expect(consultoria!.contributions.rangePenalty.value).toBeCloseTo(2.0, 3);
      expect(consultoria!.contributions.rangePenalty.applied).toBe(true);
      expect(consultoria!.total).toBeCloseTo(5.55, 3);
    });

    it('produce el ranking pre-excepción esperado', () => {
      const { rankingPre } = evaluar(FACTS_AGROCONECTA);

      expect(
        rankingPre.map((c) => [c.serviceName, c.total] as const),
      ).toEqual([
        ['Consultoría', 5.55],
        ['Mentoría', 3.8],
        ['Proyectos Integradores', 3.05],
        ['Formación', 3.0],
        ['Retos en el Aula', 2.9],
      ]);
    });

    it('conserva la label ordinal de origen junto a cada contribution', () => {
      const { rankingPre } = evaluar(FACTS_AGROCONECTA);
      const consultoria = rankingPre.find(
        (c) => c.serviceName === 'Consultoría',
      )!;

      // Es lo que permite explicar "es secundario en IPRL" en vez de
      // exponer el 0.5 de la calibración.
      expect(consultoria.contributions.bottleneck.details).toEqual([
        { dimension: 'IPRL', sourceLabel: 'secondary', value: 0.5 },
      ]);
    });
  });

  describe('capa 3 · ajustes puntuales', () => {
    it('activa E-01 y descarta E-02 y E-03, en ese order de prioridad', () => {
      const { applied, discarded } = evaluar(FACTS_AGROCONECTA);

      expect(applied.map((e) => e.code)).toEqual(['E-01']);
      expect(discarded.map((e) => e.code)).toEqual(['E-02', 'E-03']);
    });

    it('E-01 fuerza Consultoría y deja constancia de que era una decisión, no un cálculo', () => {
      const { applied } = evaluar(FACTS_AGROCONECTA);
      const e01 = applied[0];

      expect(e01.action).toBe('FORCE');
      expect(e01.targetService).toBe('Consultoría');
      expect(e01.declaredReason).toContain('riesgo legal crítico');
      // Consultoría ya era primera por cálculo; la traza tiene que decir
      // que además se fijó explícitamente, porque para la auditoría no es
      // lo mismo "ganó" que "se decidió que ganara".
      expect(e01.effect).toContain('ya ocupaba el puesto 1');
      expect(e01.rankingBefore[0].serviceName).toBe('Consultoría');
      expect(e01.rankingAfter[0].serviceName).toBe('Consultoría');
    });

    it('descarta E-02 porque el cuello de botella es IPRL', () => {
      const { discarded } = evaluar(FACTS_AGROCONECTA);
      // brechas.conteo >= 3 se cumple, pero NOT(cuelloBotella contiene IPRL)
      // no: el guard es justamente lo que impide que un ajuste pensado para
      // perfiles difusos desplace a un servicio elegido por una urgencia
      // concreta.
      expect(discarded.find((e) => e.code === 'E-02')?.reason).toContain(
        'no se cumple',
      );
    });
  });

  describe('resultado final', () => {
    it('recomienda Consultoría, con Mentoría y Proyectos Integradores como alternatives', () => {
      const { rankingPost } = evaluar(FACTS_AGROCONECTA);
      const aboveThreshold = rankingPost.filter(
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
      const { rankingPost } = evaluar(FACTS_AGROCONECTA);

      expect(
        rankingPost.every((c) => c.total >= SCORING_PARAMETERS.minimumThreshold),
      ).toBe(true);
    });
  });

  describe('sensibilidad del caso', () => {
    /**
     * Contraprueba del guard de E-02. Si el cuello de botella no fuera
     * IPRL, E-01 no se activaría y E-02 sí, promoviendo Retos en el Aula
     * dos positions. Verificarlo es lo que demuestra que el guard hace
     * algo y que la cascada de prioridades no es decorativa.
     */
    it('sin cuello de botella en IPRL, E-01 calla y E-02 promueve Retos en el Aula', () => {
      const sinIprl: DiagnosticFacts = {
        ...FACTS_AGROCONECTA,
        levelByDimension: { ...NIVELES, IPRL: 5, BRL: 1 },
        bottlenecks: ['BRL'],
        gaps: ['BRL', 'FRL', 'CRL'],
        imbalances: FACTS_AGROCONECTA.imbalances.map((d) =>
          d.left === 'TRL' && d.right === 'IPRL'
            ? { ...d, difference: 1, classification: 'ACEPTABLE' as const }
            : d,
        ),
      };

      const { applied, discarded } = evaluar(sinIprl);

      expect(discarded.map((e) => e.code)).toContain('E-01');
      expect(applied.map((e) => e.code)).toContain('E-02');

      const e02 = applied.find((e) => e.code === 'E-02')!;
      expect(e02.action).toBe('PROMOTE');
      expect(e02.targetService).toBe('Retos en el Aula');

      const antes = e02.rankingBefore.findIndex(
        (c) => c.serviceName === 'Retos en el Aula',
      );
      const despues = e02.rankingAfter.findIndex(
        (c) => c.serviceName === 'Retos en el Aula',
      );
      expect(despues).toBe(Math.max(0, antes - 2));
    });
  });
});

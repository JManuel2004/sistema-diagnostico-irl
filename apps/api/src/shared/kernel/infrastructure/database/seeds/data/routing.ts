/**
 * Initial configuration of the portfolio routing engine.
 *
 * ⚠ ALL THESE VALUES ARE HYPOTHETICAL AND PROVISIONAL.
 *
 * They come from the approaches document applied to the AgroConecta case,
 * not from INNLAB. The SRS (SA-03) states that the real routing table "must
 * be delivered by INNLAB before the implementation of RF-15 starts" and
 * that "its absence blocks that module". Until it arrives, this
 * configuration exists so the system starts with a live configuration and
 * the acceptance test has a reproducible case.
 *
 * Before production, replace: the six services, the 36 ordinal
 * intensities, the level ranges, the relevant stages, the eight weights,
 * and the eligibility and exception rules. The structure can stay; the
 * numbers cannot.
 *
 * It follows the precedent of `statements.ts`, which documents itself as
 * provisional text pending stakeholder approval.
 */

// ─────────────────────────────────────────────────────────────────────────
// Portfolio services
// ─────────────────────────────────────────────────────────────────────────
//
// The six named by the SRS in SA-02. Note that SA-03 lists only five: it
// leaves out "retos en el aula". The contradiction is in the SRS and is not
// resolved here; the six of SA-02 are seeded because the case uses them.

export interface ServiceSeed {
  readonly name: string;
  readonly description: string;
}

export const SERVICES: readonly ServiceSeed[] = [
  {
    name: 'Formación',
    description:
      'Programas formativos abiertos para cerrar vacíos de conocimiento del equipo.',
  },
  {
    name: 'Mentoría',
    description:
      'Acompañamiento 1:1 con un mentor especializado en la dimensión más débil.',
  },
  {
    name: 'Consultoría',
    description:
      'Asesoría experta focalizada en un frente concreto: legal, comercial o de modelo de negocio.',
  },
  {
    name: 'Retos en el Aula',
    description:
      'Vinculación de la iniciativa a cursos de pregrado como reto real para estudiantes.',
  },
  {
    name: 'Proyectos Integradores',
    description:
      'Desarrollo técnico guiado por equipos de estudiantes en proyectos de curso integrador.',
  },
  {
    name: 'Proyectos de Grado',
    description:
      'Trabajo de grado dirigido sobre un problema específico de la iniciativa.',
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Initiative stages
// ─────────────────────────────────────────────────────────────────────────

export interface StageSeed {
  readonly code: string;
  readonly name: string;
  readonly order: number;
}

export const STAGES: readonly StageSeed[] = [
  { code: 'idea', name: 'Idea', order: 1 },
  { code: 'validacion', name: 'Validación', order: 2 },
  { code: 'crecimiento', name: 'Crecimiento', order: 3 },
];

// ─────────────────────────────────────────────────────────────────────────
// Calibration scale
// ─────────────────────────────────────────────────────────────────────────
//
// `order` expresses the monotonicity: 1 is the highest step. The values
// must be strictly decreasing in that order, an invariant
// `CalibrationScale.create()` checks because it is a property of the set
// and no row constraint can express it.

export interface ScaleTierSeed {
  readonly label: string;
  readonly value: number;
  readonly order: number;
}

export const CALIBRATION_SCALE: readonly ScaleTierSeed[] = [
  { label: 'primary', value: 1.0, order: 1 },
  { label: 'secondary', value: 0.5, order: 2 },
  { label: 'marginal', value: 0.2, order: 3 },
  { label: 'not_applicable', value: 0.0, order: 4 },
];

// ─────────────────────────────────────────────────────────────────────────
// Global weights
// ─────────────────────────────────────────────────────────────────────────

export const SCORING_PARAMETERS = {
  /** The sharpest problem weighs three times an ordinary gap. */
  bottleneckWeight: 3.0,
  /** Each dimension in gap adds in proportion to the intensity. */
  gapWeight: 1.5,
  /** Imbalances of 2–3 levels: misalignment, not a block. */
  moderateImbalanceWeight: 0.5,
  /** Imbalances of more than 3 levels: they block progress. */
  criticalImbalanceWeight: 1.0,
  /** The stage refines the recommendation; it does not decide it. */
  stageAffinityWeight: 0.8,
  /** Operating outside the service's maturity band costs 2 points. */
  outOfRangePenalty: 2.0,
  /** Below this, the system prefers not to recommend. */
  minimumThreshold: 2.5,
  /** How many alternatives accompany the main recommendation. */
  alternativesCount: 2,
} as const;

// ─────────────────────────────────────────────────────────────────────────
// Ordinal profiles — 6 services × 6 dimensions
// ─────────────────────────────────────────────────────────────────────────

export type OrdinalLabel =
  | 'primary'
  | 'secondary'
  | 'marginal'
  | 'not_applicable';

export interface OrdinalProfileSeed {
  readonly service: string;
  readonly minLevel: number;
  readonly maxLevel: number;
  readonly relevantStages: readonly string[];
  readonly intensities: Readonly<Record<string, OrdinalLabel>>;
}

export const ORDINAL_PROFILES: readonly OrdinalProfileSeed[] = [
  {
    service: 'Formación',
    minLevel: 1,
    maxLevel: 5,
    relevantStages: ['idea', 'validacion'],
    intensities: {
      TRL: 'marginal',
      CRL: 'secondary',
      BRL: 'secondary',
      IPRL: 'not_applicable',
      TmRL: 'primary',
      FRL: 'not_applicable',
    },
  },
  {
    service: 'Mentoría',
    minLevel: 1,
    maxLevel: 6,
    relevantStages: ['idea', 'validacion'],
    intensities: {
      TRL: 'not_applicable',
      CRL: 'primary',
      BRL: 'secondary',
      IPRL: 'not_applicable',
      TmRL: 'primary',
      FRL: 'secondary',
    },
  },
  {
    // High range: strategic advisory needs some prior maturity to be
    // useful.
    service: 'Consultoría',
    minLevel: 4,
    maxLevel: 9,
    relevantStages: ['validacion', 'crecimiento'],
    intensities: {
      TRL: 'not_applicable',
      CRL: 'primary',
      BRL: 'primary',
      IPRL: 'secondary',
      TmRL: 'not_applicable',
      FRL: 'secondary',
    },
  },
  {
    service: 'Retos en el Aula',
    minLevel: 2,
    maxLevel: 8,
    relevantStages: ['validacion', 'crecimiento'],
    intensities: {
      TRL: 'secondary',
      CRL: 'secondary',
      BRL: 'secondary',
      IPRL: 'not_applicable',
      TmRL: 'marginal',
      FRL: 'not_applicable',
    },
  },
  {
    // Most suitable early on, while the initiative still needs guided
    // technical development.
    service: 'Proyectos Integradores',
    minLevel: 1,
    maxLevel: 5,
    relevantStages: ['idea', 'validacion'],
    intensities: {
      TRL: 'primary',
      CRL: 'not_applicable',
      BRL: 'not_applicable',
      IPRL: 'not_applicable',
      TmRL: 'secondary',
      FRL: 'not_applicable',
    },
  },
  {
    // They cover almost the whole range because they adapt: early
    // research, feasibility validation or acceleration.
    service: 'Proyectos de Grado',
    minLevel: 1,
    maxLevel: 7,
    relevantStages: ['idea', 'validacion', 'crecimiento'],
    intensities: {
      TRL: 'not_applicable',
      CRL: 'marginal',
      BRL: 'not_applicable',
      IPRL: 'not_applicable',
      TmRL: 'primary',
      FRL: 'not_applicable',
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Layer 1 — eligibility rules (pure booleans)
// ─────────────────────────────────────────────────────────────────────────
//
// They express impossibility, not preference. That is why they cannot
// compare `averageLevel` or magnitudes: the compiler in BOOLEAN mode
// rejects the order operators, so a degree condition cannot slip into
// this filter even by accident.

export interface EligibilityRuleSeed {
  readonly code: string;
  readonly service: string;
  readonly predicate: unknown;
  readonly exclusionMessage: string;
}

export const ELIGIBILITY_RULES: readonly EligibilityRuleSeed[] = [
  {
    code: 'ELG-01',
    service: 'Proyectos de Grado',
    predicate: {
      field: 'characterization.academicLinkage',
      op: '=',
      value: false,
    },
    exclusionMessage:
      'Proyectos de Grado requieren vinculación académica confirmada con la universidad.',
  },
  {
    code: 'ELG-02',
    service: 'Retos en el Aula',
    predicate: { field: 'characterization.teamSize', op: '=', value: 1 },
    exclusionMessage:
      'Retos en el Aula requiere al menos 2 personas en el equipo para dinámicas colaborativas.',
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Layer 3 — manual adjustments
// ─────────────────────────────────────────────────────────────────────────
//
// The order matters and is total: `priorityOrder` is unique by database
// constraint. E-01 is evaluated first and can force a service into first
// place; E-02 and E-03 are still evaluated afterwards, but over the ranking
// E-01 already left.

export interface ExceptionRuleSeed {
  readonly code: string;
  readonly priorityOrder: number;
  readonly predicate: unknown;
  readonly action: 'FORCE' | 'VETO' | 'PROMOTE' | 'DEMOTE';
  readonly targetService: string;
  readonly positions: number | null;
  readonly declaredReason: string;
}

export const EXCEPTION_RULES: readonly ExceptionRuleSeed[] = [
  {
    code: 'E-01',
    priorityOrder: 1,
    predicate: {
      op: 'and',
      operands: [
        { field: 'bottleneck', op: 'contains', value: 'IPRL' },
        { field: 'criticalImbalances', op: 'contains', value: 'TRL-IPRL' },
      ],
    },
    action: 'FORCE',
    targetService: 'Consultoría',
    positions: null,
    declaredReason:
      'Un riesgo legal crítico en paralelo con desequilibrio tecnológico requiere ' +
      'asesoría legal especializada como primer paso, antes de cualquier intervención ' +
      'de otra naturaleza.',
  },
  {
    code: 'E-02',
    priorityOrder: 2,
    predicate: {
      op: 'and',
      operands: [
        { field: 'gaps', op: 'count>=', value: 3 },
        {
          op: 'not',
          operands: [
            { field: 'bottleneck', op: 'contains', value: 'IPRL' },
          ],
        },
      ],
    },
    action: 'PROMOTE',
    targetService: 'Retos en el Aula',
    positions: 2,
    declaredReason:
      'Un perfil débil de forma generalizada en múltiples dimensiones se beneficia de ' +
      'exposición amplia a estudiantes, pero cede ante urgencias legales o técnicas puntuales.',
  },
  {
    code: 'E-03',
    priorityOrder: 3,
    predicate: {
      op: 'and',
      operands: [
        { field: 'criticalImbalances', op: 'contains', value: 'CRL-BRL' },
        { field: 'averageLevel', op: '<', value: 3 },
      ],
    },
    action: 'PROMOTE',
    targetService: 'Mentoría',
    positions: 1,
    declaredReason:
      'Cuando la separación cliente-modelo es crítica en una iniciativa muy temprana, ' +
      'mentoría 1:1 abre el diálogo antes que servicios masivos.',
  },
];

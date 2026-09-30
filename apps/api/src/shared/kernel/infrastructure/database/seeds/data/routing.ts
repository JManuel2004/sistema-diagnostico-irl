/**
 * Configuration of the portfolio routing engine.
 *
 * The services are INNLAB's official portfolio (`innlab-portfolio.xlsx`,
 * one row per service). Everything else the engine needs is not in that
 * file, so it is simulated:
 *
 * ⚠ SIMULATED AND PROVISIONAL, pending INNLAB: the 72 ordinal intensities,
 * the relevant stages of each service, the calibration scale, the eight
 * weights, and every eligibility and exception rule.
 *
 * Taken from the portfolio: each service's name, its description (with the
 * sub-formats of the row) and its level band — the «Madurez (IRL)» column,
 * read as the band of the initiative's global average IRL level when it
 * enters the service. The other columns (level Descubre/Co-crea/Profundiza/
 * Alíate, time, dedication, team, expert, investment, what students receive,
 * payment) are commercial data the engine does not use.
 *
 * A service is either **scored** — it goes through the exclusions and the
 * score — or **adjustment-only**: it takes no part in either, and only
 * enters the ranking when an `INCLUDE` adjustment puts it at the position
 * the rule sets, without a score and exempt from the threshold. The four whose band the portfolio gives as «No aplica» or «Según
 * el proyecto» are adjustment-only, and so is Alianza Residente, whose band
 * (1–9) covers everything and therefore discriminates nothing.
 */

// ─────────────────────────────────────────────────────────────────────────
// Portfolio services
// ─────────────────────────────────────────────────────────────────────────
//
// The name is the one that covers the whole row; the sub-formats and
// variants go in the description. The two Células de Grado are two rows of
// the portfolio, so two services; the Reto en el Aula of undergraduate and
// graduate programs is one row, so one service.

export interface ServiceSeed {
  readonly name: string;
  readonly description: string;
  /** Only an `INCLUDE` adjustment puts it into the ranking. */
  readonly adjustmentOnly: boolean;
}

export const SERVICES: readonly ServiceSeed[] = [
  {
    name: 'Chispa',
    description:
      'Un experto de la Universidad llega a tu organización, o tu equipo viene al campus, con una charla o conferencia de sensibilización sobre tendencias, design thinking, innovación y futuros. Formatos: charlas y conferencias, en una sesión única. Deja inspiración y un lenguaje común de innovación instalado en tu equipo.',
    adjustmentOnly: true,
  },
  {
    name: 'Reto Express',
    description:
      'Tu organización plantea un reto y equipos de estudiantes lo atacan en formato intensivo, desde una tarde de ideación hasta un sprint de cinco días. Formatos: hackatón, design sprint y challenge, abiertos a toda la comunidad universitaria o cerrados a un curso o grupo. Entrega un banco de ideas, conceptos y prototipos tempranos (TRL 3–5) y un informe síntesis.',
    adjustmentOnly: false,
  },
  {
    name: 'Academia a la Medida',
    description:
      'Formación empresarial basada en proyectos, adaptada a tu reto real: tu equipo aprende resolviendo sus propios desafíos. Formatos: cursos cortos, seminarios de 36 a 48 horas, diplomados y cohortes exclusivas de maestría. Deja capacidades de innovación, diseño o UX instaladas en tu equipo y proyectos internos desarrollados durante la formación.',
    adjustmentOnly: true,
  },
  {
    name: 'Reto en el Aula',
    description:
      'Tu reto entra como proyecto oficial de una materia: todos los equipos del curso trabajan sobre él, guiados por el profesor. En pregrado (4 a 18 semanas) exploran y prototipan; en posgrado (5 a 7 semanas, con estudiantes de maestría) lo abordan con mirada estratégica. Entrega un banco amplio de ideas y prototipos (TRL 4–6) con varios caminos de solución.',
    adjustmentOnly: false,
  },
  {
    name: 'Semillero con Propósito',
    description:
      'Estudiantes de semilleros de innovación e investigación (Co.seeds), acompañados por un experto mentor, trabajan tu reto en paralelo a sus estudios durante 6 a 12 meses, con dedicación semanal constante. Entrega prototipos avanzados y pruebas con usuarios (TRL 6–7), con entregas periódicas, y una cantera temprana de talento.',
    adjustmentOnly: false,
  },
  {
    name: 'Célula de Grado · Pregrado',
    description:
      'Equipos de estudiantes de últimos semestres dedican su proyecto de grado (PdG) a tu desafío: medio año de investigación y medio de implementación, con tutor y asesores expertos. Entrega un informe de investigación y un prototipo avanzado (TRL 6–7), listo para la comprobación de mercado.',
    adjustmentOnly: false,
  },
  {
    name: 'Célula de Grado · Posgrado',
    description:
      'Estudiantes de las maestrías en Gestión de la Innovación y Experiencia de Usuario convierten tu reto en su trabajo de grado (TdG), con análisis de profundidad profesional, marcos estratégicos y validación. Perfil senior, con experiencia liderando equipos. Entrega diagnóstico, estrategia y conceptos validados (TRL 3–5) con calidad de consultoría.',
    adjustmentOnly: false,
  },
  {
    name: 'Práctica de Innovación',
    description:
      'Un estudiante de último semestre se integra a tu organización en práctica profesional (vía CEDEP), dedicado a proyectos de innovación y diseño, con un asesor de práctica de la Universidad. Aporta capacidad de ejecución continua sobre las metas que define tu organización y una vía de reclutamiento temprano.',
    adjustmentOnly: true,
  },
  {
    name: 'Talento In-House',
    description:
      'Una célula de 2 a 5 practicantes con un experto de la Universidad (InHouse Internship) se instala en tu organización para desarrollar proyectos de innovación de forma continua, con estándar académico y ritmo de industria. Lleva los proyectos hasta prototipo avanzado y validación (TRL 6–7) dentro de tu operación.',
    adjustmentOnly: false,
  },
  {
    name: 'Consultoría Experta',
    description:
      'Consultoría colaborativa: los profesionales de la Universidad, con estudiantes monitores, desarrollan soluciones con calidad lista para el mercado en productos, servicios, experiencias digitales, analítica y culturas de innovación. Entrega un desarrollo profesional listo para el mercado (TRL 7–9).',
    adjustmentOnly: false,
  },
  {
    name: 'Célula Dedicada · Co.LAB',
    description:
      'Alianza Co.LAB: una célula estable de expertos y talento Icesi trabaja durante un año como el laboratorio de innovación de tu organización, con backlog conjunto y ciclos continuos de desarrollo. Entrega un portafolio continuo de soluciones de alta madurez (TRL 7–8).',
    adjustmentOnly: false,
  },
  {
    name: 'Alianza Residente',
    description:
      'Alianza estratégica con presencia en el campus (modelo Banco W): tu organización se instala en la Universidad, con oficina o espacio propio y una bolsa de horas canjeable por todo el portafolio: asesorías, consultorías, retos con estudiantes, células y formación. Da acceso al ecosistema completo de talento, expertos, laboratorios, eventos y marca compartida.',
    adjustmentOnly: true,
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
// Ordinal profiles — 12 services × 6 dimensions
// ─────────────────────────────────────────────────────────────────────────
//
// The band is the portfolio's; the stages and the intensities are
// SIMULATED. Adjustment-only services keep their intensities and stages as
// part of their profile even though the score does not read them.

export type OrdinalLabel =
  | 'primary'
  | 'secondary'
  | 'marginal'
  | 'not_applicable';

export interface OrdinalProfileSeed {
  readonly service: string;
  /** `null` only for an adjustment-only service the portfolio gives no band. */
  readonly minLevel: number | null;
  readonly maxLevel: number | null;
  readonly relevantStages: readonly string[];
  readonly intensities: Readonly<Record<string, OrdinalLabel>>;
}

export const ORDINAL_PROFILES: readonly OrdinalProfileSeed[] = [
  {
    // Inspiration for the team, not development: only the team's readiness
    // to innovate is touched, and lightly. An opening format, so idea stage.
    service: 'Chispa',
    minLevel: null,
    maxLevel: null,
    relevantStages: ['idea'],
    intensities: {
      TRL: 'not_applicable',
      CRL: 'marginal',
      BRL: 'marginal',
      IPRL: 'not_applicable',
      TmRL: 'secondary',
      FRL: 'not_applicable',
    },
  },
  {
    // Early prototypes (TRL 3–5) are its deliverable, over a concrete
    // problem: technology first, the customer problem second.
    service: 'Reto Express',
    minLevel: 3,
    maxLevel: 5,
    relevantStages: ['idea', 'validacion'],
    intensities: {
      TRL: 'primary',
      CRL: 'secondary',
      BRL: 'marginal',
      IPRL: 'not_applicable',
      TmRL: 'marginal',
      FRL: 'not_applicable',
    },
  },
  {
    // Installs capabilities in the organization's own team; innovation,
    // design and UX content reach the customer and the business model.
    service: 'Academia a la Medida',
    minLevel: null,
    maxLevel: null,
    relevantStages: ['idea', 'validacion', 'crecimiento'],
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
    // Prototypes TRL 4–6 across many teams; the graduate variant adds a
    // strategic view of the customer and the business.
    service: 'Reto en el Aula',
    minLevel: 4,
    maxLevel: 6,
    relevantStages: ['validacion'],
    intensities: {
      TRL: 'primary',
      CRL: 'secondary',
      BRL: 'secondary',
      IPRL: 'not_applicable',
      TmRL: 'not_applicable',
      FRL: 'not_applicable',
    },
  },
  {
    // Advanced prototypes and user tests over months, plus an early pool of
    // talent for the organization.
    service: 'Semillero con Propósito',
    minLevel: 6,
    maxLevel: 7,
    relevantStages: ['validacion', 'crecimiento'],
    intensities: {
      TRL: 'primary',
      CRL: 'secondary',
      BRL: 'marginal',
      IPRL: 'not_applicable',
      TmRL: 'secondary',
      FRL: 'not_applicable',
    },
  },
  {
    // Research and an advanced prototype ahead of market validation; the
    // research may surface what is worth protecting, hence marginal IPRL.
    service: 'Célula de Grado · Pregrado',
    minLevel: 6,
    maxLevel: 7,
    relevantStages: ['validacion', 'crecimiento'],
    intensities: {
      TRL: 'primary',
      CRL: 'secondary',
      BRL: 'marginal',
      IPRL: 'marginal',
      TmRL: 'not_applicable',
      FRL: 'not_applicable',
    },
  },
  {
    // Diagnosis, strategy and validated concepts by innovation and UX
    // master's students: customer and business model first.
    service: 'Célula de Grado · Posgrado',
    minLevel: 3,
    maxLevel: 5,
    relevantStages: ['idea', 'validacion'],
    intensities: {
      TRL: 'marginal',
      CRL: 'primary',
      BRL: 'primary',
      IPRL: 'not_applicable',
      TmRL: 'secondary',
      FRL: 'marginal',
    },
  },
  {
    // One intern adds execution capacity to the team, mostly on building.
    service: 'Práctica de Innovación',
    minLevel: null,
    maxLevel: null,
    relevantStages: ['validacion', 'crecimiento'],
    intensities: {
      TRL: 'secondary',
      CRL: 'marginal',
      BRL: 'marginal',
      IPRL: 'not_applicable',
      TmRL: 'primary',
      FRL: 'not_applicable',
    },
  },
  {
    // A dedicated innovation team inside the operation, taking projects to
    // an advanced prototype and validation.
    service: 'Talento In-House',
    minLevel: 6,
    maxLevel: 7,
    relevantStages: ['crecimiento'],
    intensities: {
      TRL: 'primary',
      CRL: 'secondary',
      BRL: 'marginal',
      IPRL: 'not_applicable',
      TmRL: 'primary',
      FRL: 'not_applicable',
    },
  },
  {
    // Market-ready development by professionals: products and digital
    // experiences first, services and innovation culture after.
    service: 'Consultoría Experta',
    minLevel: 7,
    maxLevel: 9,
    relevantStages: ['crecimiento'],
    intensities: {
      TRL: 'primary',
      CRL: 'secondary',
      BRL: 'secondary',
      IPRL: 'marginal',
      TmRL: 'marginal',
      FRL: 'not_applicable',
    },
  },
  {
    // A year-long laboratory: continuous development with a shared backlog,
    // and the organization's team working alongside it.
    service: 'Célula Dedicada · Co.LAB',
    minLevel: 7,
    maxLevel: 8,
    relevantStages: ['crecimiento'],
    intensities: {
      TRL: 'primary',
      CRL: 'secondary',
      BRL: 'secondary',
      IPRL: 'marginal',
      TmRL: 'secondary',
      FRL: 'not_applicable',
    },
  },
  {
    // Access to the whole portfolio: broad and even, with no primary focus.
    service: 'Alianza Residente',
    minLevel: 1,
    maxLevel: 9,
    relevantStages: ['crecimiento'],
    intensities: {
      TRL: 'secondary',
      CRL: 'secondary',
      BRL: 'secondary',
      IPRL: 'marginal',
      TmRL: 'secondary',
      FRL: 'marginal',
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Layer 1 — eligibility rules (pure booleans) — SIMULATED
// ─────────────────────────────────────────────────────────────────────────
//
// They express impossibility, not preference. That is why they cannot
// compare `averageLevel` or magnitudes: the compiler in BOOLEAN mode
// rejects the order operators, so a degree condition cannot slip into
// this filter even by accident. They only apply to scored services; the
// database refuses one on an adjustment-only service.
//
// A rule excludes one service; a condition that applies to several is one
// rule per service (ELG-01A, ELG-01B).

export interface EligibilityRuleSeed {
  readonly code: string;
  readonly service: string;
  readonly predicate: unknown;
  readonly exclusionMessage: string;
}

const WITHOUT_ACADEMIC_LINKAGE = {
  field: 'characterization.academicLinkage',
  op: '=',
  value: false,
} as const;

export const ELIGIBILITY_RULES: readonly EligibilityRuleSeed[] = [
  {
    code: 'ELG-01A',
    service: 'Célula de Grado · Pregrado',
    predicate: WITHOUT_ACADEMIC_LINKAGE,
    exclusionMessage:
      'La Célula de Grado de pregrado requiere vinculación académica confirmada con la universidad.',
  },
  {
    code: 'ELG-01B',
    service: 'Célula de Grado · Posgrado',
    predicate: WITHOUT_ACADEMIC_LINKAGE,
    exclusionMessage:
      'La Célula de Grado de posgrado requiere vinculación académica confirmada con la universidad.',
  },
  {
    code: 'ELG-02',
    service: 'Reto en el Aula',
    predicate: { field: 'characterization.teamSize', op: '=', value: 1 },
    exclusionMessage:
      'Reto en el Aula requiere al menos 2 personas en el equipo para dinámicas colaborativas.',
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Layer 3 — adjustments — SIMULATED
// ─────────────────────────────────────────────────────────────────────────
//
// The order is total: `priorityOrder` is unique by database constraint.
// INCLUDE puts an adjustment-only service into the ranking at the position
// `positions` names (1 = first), without a score and exempt from the
// threshold; the database refuses it on a scored service. FORCE, VETO,
// PROMOTE and DEMOTE move any place of the ranking, an included one too.
//
// The inclusions put the service in position 2, as the first alternative:
// the calculation keeps deciding the recommendation, and the center's
// suggestion is always shown next to it. SIMULATED, like the conditions.
//
// Removed: E-01, which forced Consultoría into first place for a critical
// legal risk (bottleneck in IPRL with a critical TRL–IPRL imbalance). The
// portfolio gives Consultoría Experta the band IRL 7–9, so forcing it onto
// an early initiative contradicts the portfolio itself, and no service of
// the portfolio covers intellectual property or legal advice to move the
// rule to.

export interface ExceptionRuleSeed {
  readonly code: string;
  readonly priorityOrder: number;
  readonly predicate: unknown;
  readonly action: 'FORCE' | 'VETO' | 'PROMOTE' | 'DEMOTE' | 'INCLUDE';
  readonly targetService: string;
  readonly positions: number | null;
  readonly declaredReason: string;
}

export const EXCEPTION_RULES: readonly ExceptionRuleSeed[] = [
  {
    code: 'E-02',
    priorityOrder: 1,
    predicate: {
      op: 'and',
      operands: [
        { field: 'gaps', op: 'count>=', value: 3 },
        {
          op: 'not',
          operands: [{ field: 'bottleneck', op: 'contains', value: 'IPRL' }],
        },
      ],
    },
    action: 'PROMOTE',
    targetService: 'Reto en el Aula',
    positions: 2,
    declaredReason:
      'Un perfil débil de forma generalizada en múltiples dimensiones se beneficia de ' +
      'exposición amplia a estudiantes, pero cede ante urgencias legales o técnicas puntuales.',
  },
  {
    // Was Mentoría, which is not in the portfolio. The graduate cell keeps
    // the intent: an experienced, strategic look at the customer and the
    // business model, in the portfolio's band for early initiatives (3–5).
    code: 'E-03',
    priorityOrder: 2,
    predicate: {
      op: 'and',
      operands: [
        { field: 'criticalImbalances', op: 'contains', value: 'CRL-BRL' },
        { field: 'averageLevel', op: '<', value: 3 },
      ],
    },
    action: 'PROMOTE',
    targetService: 'Célula de Grado · Posgrado',
    positions: 1,
    declaredReason:
      'Cuando la separación entre cliente y modelo de negocio es crítica en una iniciativa muy ' +
      'temprana, una mirada estratégica y experimentada sobre ambos abre el camino antes que ' +
      'los servicios de desarrollo.',
  },
  {
    code: 'INC-01',
    priorityOrder: 3,
    predicate: { field: 'averageLevel', op: '<', value: 3 },
    action: 'INCLUDE',
    targetService: 'Chispa',
    positions: 2,
    declaredReason:
      'En una iniciativa muy temprana, una charla de sensibilización ayuda a que el equipo ' +
      'comparta un lenguaje común de innovación antes de desarrollar.',
  },
  {
    code: 'INC-02',
    priorityOrder: 4,
    predicate: { field: 'gaps', op: 'count>=', value: 3 },
    action: 'INCLUDE',
    targetService: 'Academia a la Medida',
    positions: 2,
    declaredReason:
      'Con brechas en tres o más dimensiones, formar al propio equipo deja capacidades ' +
      'instaladas para cerrarlas más allá de un proyecto puntual.',
  },
  {
    code: 'INC-03',
    priorityOrder: 5,
    predicate: { field: 'characterization.teamSize', op: '<=', value: 2 },
    action: 'INCLUDE',
    targetService: 'Práctica de Innovación',
    positions: 2,
    declaredReason:
      'Un equipo de una o dos personas gana capacidad de ejecución inmediata con un ' +
      'practicante dedicado a sus proyectos de innovación.',
  },
  {
    code: 'INC-04',
    priorityOrder: 6,
    predicate: {
      op: 'and',
      operands: [
        { field: 'characterization.stage', op: '=', value: 'crecimiento' },
        { field: 'averageLevel', op: '>=', value: 7 },
      ],
    },
    action: 'INCLUDE',
    targetService: 'Alianza Residente',
    positions: 2,
    declaredReason:
      'Una iniciativa madura y en crecimiento puede hacer de la innovación abierta parte de ' +
      'su estrategia, con acceso permanente al talento, los expertos y los laboratorios del campus.',
  },
];

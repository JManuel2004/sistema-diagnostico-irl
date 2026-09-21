/**
 * Configuración inicial del motor de enrutamiento de portafolio.
 *
 * ⚠ TODOS ESTOS VALORES SON HIPOTÉTICOS Y PROVISIONALES.
 *
 * Provienen del documento de enfoques aplicado al caso AgroConecta, no de
 * INNLAB. El SRS (SA-03) declara que la tabla de enrutamiento real "debe
 * ser entregada por INNLAB antes del inicio de la implementación de
 * RF-15" y que "su ausencia bloquea ese módulo". Hasta que llegue, esta
 * configuración existe para que el sistema arranque con una versión
 * vigente y para que la prueba de aceptación tenga un caso reproducible.
 *
 * Antes de producción hay que reemplazar: los seis servicios, las 36
 * intensities ordinales, los rangos de nivel, las etapas pertinentes,
 * los ocho pesos, y las reglas de elegibilidad y excepción. La estructura
 * puede quedarse; los números no.
 *
 * Se sigue el precedente de `statements.ts`, que se autodocumenta como
 * texto provisional pendiente de aprobación de stakeholders.
 */

// ─────────────────────────────────────────────────────────────────────────
// Servicios del portafolio
// ─────────────────────────────────────────────────────────────────────────
//
// Los seis que nombra el SRS en SA-02. Nótese que SA-03 lista solo cinco:
// omite "retos en el aula". La contradicción está en el SRS y no se
// resuelve aquí; se siembran los seis de SA-02 porque el caso los usa.

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
// Etapas de iniciativa
// ─────────────────────────────────────────────────────────────────────────

export interface EtapaSeed {
  readonly codigo: string;
  readonly nombre: string;
  readonly orden: number;
}

export const ETAPAS: readonly EtapaSeed[] = [
  { codigo: 'idea', nombre: 'Idea', orden: 1 },
  { codigo: 'validacion', nombre: 'Validación', orden: 2 },
  { codigo: 'crecimiento', nombre: 'Crecimiento', orden: 3 },
];

// ─────────────────────────────────────────────────────────────────────────
// Escala de calibración
// ─────────────────────────────────────────────────────────────────────────
//
// `orden` expresa la monotonía: 1 es el peldaño más alto. Los valores
// deben ser estrictamente decrecientes en ese orden, invariante que
// comprueba `CalibrationScale.create()` porque es una propiedad del
// conjunto y ninguna restricción de fila puede expresarla.

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
// Pesos globales
// ─────────────────────────────────────────────────────────────────────────

export const SCORING_PARAMETERS = {
  /** El problema más agudo pesa el triple que una brecha ordinaria. */
  bottleneckWeight: 3.0,
  /** Cada dimensión en brecha suma proporcionalmente a la intensidad. */
  gapWeight: 1.5,
  /** Desequilibrios de 2–3 niveles: desalineación, no bloqueo. */
  moderateImbalanceWeight: 0.5,
  /** Desequilibrios de más de 3 niveles: bloquean el avance. */
  criticalImbalanceWeight: 1.0,
  /** La etapa refina la recomendación, no la decide. */
  stageAffinityWeight: 0.8,
  /** Operar fuera de la banda de madurez del servicio cuesta 2 puntos. */
  outOfRangePenalty: 2.0,
  /** Por debajo de esto, el sistema prefiere no recomendar. */
  minimumThreshold: 2.5,
  /** Cuántas alternatives acompañan a la recomendación principal. */
  alternativesCount: 2,
} as const;

// ─────────────────────────────────────────────────────────────────────────
// Fichas ordinales — 6 servicios × 6 dimensiones
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
    // Rango alto: la asesoría estratégica requiere cierta madurez previa
    // para ser útil.
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
    // Más apropiados temprano, cuando la iniciativa aún necesita
    // desarrollo técnico guiado.
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
    // Cubren casi todo el rango porque se adaptan: investigación
    // temprana, validación de viabilidad o aceleración.
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
// Capa 1 — reglas de elegibilidad (booleanas puras)
// ─────────────────────────────────────────────────────────────────────────
//
// Expresan imposibilidad, no preferencia. Por eso no pueden comparar
// `averageLevel` ni magnitudes: el compilador en modo BOOLEAN rechaza
// los operadores de orden, así que una condición de grado no puede
// colarse a este filtro ni por descuido.

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
// Capa 3 — ajustes puntuales
// ─────────────────────────────────────────────────────────────────────────
//
// El orden importa y es total: `priorityOrder` es único dentro de una
// versión por restricción de base de datos. E-01 se evalúa primero y
// puede forzar un servicio al puesto 1; E-02 y E-03 siguen evaluándose
// después, pero sobre el ranking que E-01 ya dejó.

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

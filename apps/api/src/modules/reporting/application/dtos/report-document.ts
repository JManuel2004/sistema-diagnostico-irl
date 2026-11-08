import type {
  DimensionCode,
  ImbalanceClassification,
  ImbalancePairResult,
  RoadmapDimensionTarget,
} from '@innlab/contracts';
import {
  imbalanceRisk,
  LIKERT_LABELS,
  type DiagnosticReport,
} from '@innlab/contracts';

/**
 * What the downloadable report says, block by block, before anyone draws
 * it (HU-24). Deciding the content here — a pure function of the
 * `DiagnosticReport` — keeps the renderer a drawing of blocks, and lets the
 * tests read the file's text without parsing a PDF.
 *
 * The text is the one the leader reads: Spanish, no codes, every level with
 * its meaning, the same order as the report on screen.
 */
export type ReportBlock =
  | { readonly kind: 'heading'; readonly text: string }
  | { readonly kind: 'subheading'; readonly text: string }
  | { readonly kind: 'paragraph'; readonly text: string }
  | { readonly kind: 'field'; readonly label: string; readonly value: string }
  | { readonly kind: 'bullet'; readonly text: string }
  | { readonly kind: 'alert'; readonly text: string }
  /**
   * An imbalanced pair, as on screen: its two dimensions with their level,
   * how far apart they are, what to do and what the initiative risks.
   */
  | {
      readonly kind: 'pair';
      readonly title: string;
      readonly severity: string;
      readonly critical: boolean;
      readonly dimensions: readonly {
        readonly dimensionCode: DimensionCode;
        readonly label: string;
        readonly level: number;
      }[];
      readonly headline: string;
      readonly advice: string;
      readonly risk: string | null;
    }
  /** Each dimension today and at the end of the route, on the 1–9 scale. */
  | {
      readonly kind: 'route';
      readonly rows: readonly {
        readonly dimensionCode: DimensionCode;
        readonly label: string;
        readonly today: number;
        readonly end: number;
      }[];
    }
  /**
   * The first page: the key indicators (the service, the bottleneck and the
   * critical dimensions first), the profile as a radar and as level bars, the
   * recommended service and how the report is organized.
   */
  | { readonly kind: 'summary'; readonly summary: ReportSummary }
  /** The route as a line of phases: each with its service and its rises. */
  | { readonly kind: 'timeline'; readonly phases: readonly TimelinePhase[] }
  /** What follows starts on a new page. */
  | { readonly kind: 'pageBreak' }
  /** The statements of one dimension with the 1–5 value the user gave. */
  | {
      readonly kind: 'answers';
      readonly dimensionCode: DimensionCode;
      readonly title: string;
      readonly rows: readonly {
        readonly sequence: number;
        readonly text: string;
        readonly value: number;
        readonly valueLabel: string;
        readonly justification: string | null;
      }[];
    };

/** One of the four indicators at the top of the summary. */
export interface ReportIndicator {
  readonly label: string;
  readonly value: string;
  readonly caption: string;
  readonly detail: string;
  /** Needs attention first: drawn with the attention tone and a mark. */
  readonly attention: boolean;
  /** The maturity band that colors the value, as the global level on screen. */
  readonly band?: MaturityBandKey;
}

/** The maturity band of a level, as the application reads it (1–3, 4–5, 6–7, 8–9). */
export type MaturityBandKey = 'low' | 'developing' | 'advanced' | 'mature';

const BAND_LABEL: Readonly<Record<MaturityBandKey, string>> = {
  low: 'Madurez inicial',
  developing: 'Madurez en desarrollo',
  advanced: 'Madurez avanzada',
  mature: 'Madurez alta',
};

/** A decimal average is read by its rounded level, as on screen. */
function maturityBand(level: number): MaturityBandKey {
  const whole = Math.round(level);
  if (whole <= 3) return 'low';
  if (whole <= 5) return 'developing';
  if (whole <= 7) return 'advanced';
  return 'mature';
}

export interface ReportSummary {
  readonly indicators: readonly ReportIndicator[];
  readonly levels: readonly {
    readonly dimensionCode: DimensionCode;
    readonly label: string;
    readonly level: number;
    /** Why it stands out, in words; null when it does not. */
    readonly tag: string | null;
    readonly attention: boolean;
  }[];
  readonly recommendation: {
    readonly name: string;
    readonly subtitle: string;
    readonly tier: string;
    readonly scope: string;
    readonly alternatives: readonly string[];
  } | null;
  /** Said when there is no recommendation. */
  readonly noRecommendation: string | null;
  /**
   * «Cómo leer este reporte»: the report's sections in the order they
   * appear, one line each on what they hold (usability test P03). Built from
   * the headings of the document itself, so none is missing or extra.
   */
  readonly sections: readonly {
    readonly title: string;
    readonly text: string;
  }[];
}

export interface TimelinePhase {
  readonly order: number;
  readonly service: string | null;
  readonly tier: string | null;
  readonly approximate: boolean;
  readonly steps: readonly {
    readonly dimensionCode: DimensionCode;
    readonly label: string;
    readonly from: number;
    readonly to: number;
  }[];
}

export interface ReportDocumentModel {
  /** The document's title (also its PDF metadata). */
  readonly title: string;
  readonly subtitle: string;
  /** The band at the top of the first page. */
  readonly banner: {
    readonly heading: string;
    readonly initiative: string;
    /** The recommended service, named in the band (usability test P02). */
    readonly service: string;
    readonly meta: string;
  };
  readonly blocks: readonly ReportBlock[];
  /** The attribution of the KTH framework, at the foot of every page (RNF-09). */
  readonly footer: string;
}

const LOCALE = 'es-CO';

/**
 * An imbalanced pair as the results screen tells it (`PairCard`): which one
 * goes ahead and by how much, what to do and, unless both are in gap, what
 * the initiative risks (the same texts as the screen, from the contracts).
 */
function pairBlock(
  pair: ImbalancePairResult,
  levelOf: ReadonlyMap<DimensionCode, number>,
  nameOf: (code: DimensionCode) => string,
  gapCodes: ReadonlySet<DimensionCode>,
): Extract<ReportBlock, { kind: 'pair' }> {
  const leftLevel = levelOf.get(pair.left) ?? 0;
  const rightLevel = levelOf.get(pair.right) ?? 0;
  const [ahead, behind] =
    leftLevel >= rightLevel ? [pair.left, pair.right] : [pair.right, pair.left];
  const bothInGap = gapCodes.has(pair.left) && gapCodes.has(pair.right);
  const critical = pair.classification === 'critical';
  const advice = bothInGap
    ? `Las dos están en la parte baja de la escala. Lo que toca es subir ${nameOf(pair.left)} y ${nameOf(pair.right)} en paralelo, no compararlas entre sí.`
    : critical
      ? `La distancia es muy grande. Conviene atender ${nameOf(behind)} antes de seguir avanzando en ${nameOf(ahead)}.`
      : `La distancia es importante. Vale la pena acercar ${nameOf(behind)} a ${nameOf(ahead)} pronto.`;
  return {
    kind: 'pair',
    title: listNames([nameOf(pair.left), nameOf(pair.right)]),
    severity: CLASSIFICATION_LABEL[pair.classification],
    critical,
    dimensions: [pair.left, pair.right].map((code) => ({
      dimensionCode: code,
      label: nameOf(code),
      level: levelOf.get(code) ?? 0,
    })),
    headline: `${nameOf(ahead)} va ${levelWord(pair.difference)} por delante de ${nameOf(behind)}.`,
    advice,
    risk:
      bothInGap || pair.difference === 0 ? null : imbalanceRisk(ahead, behind),
  };
}

/**
 * What each section of the report holds, in one line, for «Cómo leer este
 * reporte». Keyed by the section's heading: a heading without a line here
 * fails the unit test, so the map never drifts from the document.
 */
export const SECTION_TEXT: Readonly<Record<string, string>> = {
  'Datos de la iniciativa':
    'lo que registraste: sector, etapa, equipo, mercado y financiamiento.',
  'Perfil de seis dimensiones':
    'el nivel de cada dimensión, de 1 a 9, y qué significa.',
  'Brechas, alertas y desequilibrios':
    'las dimensiones más bajas, las críticas y los pares que avanzan a ritmos distintos.',
  'Recomendación del portafolio INNLAB':
    'el servicio que mejor encaja hoy y por qué.',
  'Ruta de escalamiento':
    'las fases, el servicio de cada una y hasta qué nivel sube cada dimensión.',
  'Respuestas al cuestionario':
    'tus 48 respuestas, con las justificaciones que escribiste.',
  'Términos del reporte': 'qué significa cada término técnico.',
  'Marco de referencia':
    'el marco IRL en el que se basa el diagnóstico y su licencia.',
};
const TIME_ZONE = 'America/Bogota';

const CLASSIFICATION_LABEL: Readonly<Record<ImbalanceClassification, string>> =
  {
    critical: 'desequilibrio crítico',
    moderate: 'desequilibrio moderado',
    acceptable: 'equilibrado',
  };

const SEVERITY_ORDER: Readonly<Record<ImbalanceClassification, number>> = {
  critical: 0,
  moderate: 1,
  acceptable: 2,
};

/** «8 de septiembre de 2026, 5:00 a. m.», in Colombia's time. */
export function formatReportDate(iso: string): string {
  return new Date(iso).toLocaleString(LOCALE, {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: TIME_ZONE,
  });
}

function oneDecimal(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString(LOCALE, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
}

function listNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

function levelWord(n: number): string {
  return `${String(n)} ${n === 1 ? 'nivel' : 'niveles'}`;
}

function inclusionSentence(d: RoadmapDimensionTarget): string {
  if (d.inclusionReason === 'BELOW_EXPECTED_MINIMUM') {
    return `está por debajo de lo esperado: debería llegar al menos al nivel ${String(d.expectedMinimum)}.`;
  }
  if (d.inclusionReason === 'BALANCE') {
    return d.targetDrivenBy
      ? `sube para no quedar muy lejos de ${d.targetDrivenBy.shortName} al final de la ruta.`
      : 'sube para que al final de la ruta no quede un desequilibrio.';
  }
  const dependents = d.enables.map((e) => e.shortName);
  return `${listNames(dependents)} ${dependents.length === 1 ? 'necesita' : 'necesitan'} que suba para poder avanzar.`;
}

/**
 * «3 personas. Fundadora y dos ingenieros», unless the description already
 * starts with the count («3 personas — …»): then it is said once.
 */
function teamText(size: number, description: string): string {
  const count = `${String(size)} ${size === 1 ? 'persona' : 'personas'}`;
  return description.trim().toLowerCase().startsWith(count)
    ? description
    : `${count}. ${description}`;
}

export function buildReportDocument(
  report: DiagnosticReport,
): ReportDocumentModel {
  const { initiative, profile, recommendation, roadmap, attribution } = report;
  const names: Partial<Record<DimensionCode, string>> = Object.fromEntries(
    profile.dimensionResults.map((r) => [r.dimensionCode, r.shortName]),
  );
  const nameOf = (code: DimensionCode): string => names[code] ?? code;
  const namesOf = (codes: readonly DimensionCode[]): string =>
    listNames(codes.map(nameOf));

  const blocks: ReportBlock[] = [];
  const push = (...items: ReportBlock[]): void => {
    blocks.push(...items);
  };

  // Summary page: what a reader needs first.
  const critical = new Set(profile.criticalState.dimensions);
  const bottleneck = new Set(profile.bottleneck.dimensions);
  const gaps = new Set(profile.gaps.dimensions);
  const gapCount = profile.gaps.dimensions.length;
  push(
    {
      kind: 'summary',
      summary: {
        // The service, the bottleneck and the critical dimensions go first, with
        // the names the application uses: a reader of the first page alone can
        // tell them (usability test P02).
        indicators: [
          recommendation.primary
            ? {
                label: 'Servicio recomendado',
                value: recommendation.primary.name,
                caption: `nivel ${recommendation.primary.tier.name}`,
                detail: 'Del portafolio de INNLAB',
                attention: false,
              }
            : {
                label: 'Servicio recomendado',
                value: 'Sin recomendación',
                caption: 'por ahora',
                detail: 'La ruta propone un servicio por fase',
                attention: false,
              },
          {
            label: 'Cuello de botella',
            value: namesOf(profile.bottleneck.dimensions),
            caption: `nivel ${String(profile.bottleneck.level)}`,
            detail: 'Lo que más frena el avance',
            attention: false,
          },
          critical.size > 0
            ? {
                label: 'Dimensiones críticas',
                value: namesOf([...critical]),
                caption: 'estado crítico',
                detail: `${String(gapCount)} ${gapCount === 1 ? 'dimensión' : 'dimensiones'} en brecha`,
                attention: true,
              }
            : {
                label: 'Dimensiones críticas',
                value: 'Ninguna',
                caption: 'sin estado crítico',
                detail: `${String(gapCount)} ${gapCount === 1 ? 'dimensión' : 'dimensiones'} en brecha`,
                attention: false,
              },
          {
            label: 'Nivel IRL global',
            value: oneDecimal(profile.globalAverage),
            caption: `de 9 · ${BAND_LABEL[maturityBand(profile.globalAverage)]}`,
            band: maturityBand(profile.globalAverage),
            detail: `Más fuerte: ${namesOf(profile.strength.dimensions)}`,
            attention: false,
          },
        ],
        levels: profile.dimensionResults.map((r) => ({
          dimensionCode: r.dimensionCode,
          label: r.shortName,
          level: r.irlLevel,
          tag: critical.has(r.dimensionCode)
            ? 'dimensión crítica'
            : bottleneck.has(r.dimensionCode)
              ? 'cuello de botella'
              : gaps.has(r.dimensionCode)
                ? 'en brecha'
                : null,
          attention: critical.has(r.dimensionCode),
        })),
        recommendation: recommendation.primary
          ? {
              name: recommendation.primary.name,
              subtitle: recommendation.primary.subtitle,
              tier: recommendation.primary.tier.name,
              scope: recommendation.primary.scope,
              alternatives: recommendation.alternatives.map((a) => a.name),
            }
          : null,
        noRecommendation: recommendation.primary
          ? null
          : (recommendation.noRecommendationReason ??
            'Ningún servicio del portafolio corresponde a este perfil.'),
        sections: [],
      },
    },
    { kind: 'pageBreak' },
  );

  // Initiative.
  push(
    { kind: 'heading', text: 'Datos de la iniciativa' },
    { kind: 'field', label: 'Nombre', value: initiative.name },
    { kind: 'field', label: 'Sector', value: sectorLabel(initiative) },
    {
      kind: 'field',
      label: 'Producto o servicio',
      value: initiative.productType,
    },
    {
      kind: 'field',
      label: 'Etapa',
      value: `${initiative.stage.name}. ${initiative.declaredStage}`,
    },
    {
      kind: 'field',
      label: 'Equipo',
      value: teamText(initiative.teamSize, initiative.teamDescription),
    },
    {
      kind: 'field',
      label: 'Mercado objetivo',
      value: initiative.targetMarket,
    },
    {
      kind: 'field',
      label: 'Financiamiento actual',
      value: initiative.currentFunding,
    },
  );

  // Profile of six dimensions.
  push(
    // The numbers, the radar, the strongest dimension and the bottleneck
    // are on the summary page; here, what each level means.
    { kind: 'heading', text: 'Perfil de seis dimensiones' },
  );
  if (profile.globalLevel.description) {
    push({
      kind: 'field',
      label: `Qué significa el nivel global ${oneDecimal(profile.globalAverage)}`,
      value: profile.globalLevel.description,
    });
  }
  for (const r of profile.dimensionResults) {
    push(
      {
        kind: 'subheading',
        text: `${r.name}: nivel ${String(r.irlLevel)} de 9`,
      },
      {
        kind: 'paragraph',
        text: `${r.levelDescription ?? 'Sin descripción para este nivel.'} (Promedio de respuestas: ${oneDecimal(r.averageLikert)} de 5.)`,
      },
    );
  }

  // Gaps, alerts and imbalances.
  push(
    { kind: 'heading', text: 'Brechas, alertas y desequilibrios' },
    { kind: 'subheading', text: 'Brechas' },
    {
      kind: 'paragraph',
      text:
        profile.gaps.dimensions.length === 0
          ? `Ninguna dimensión está en brecha (nivel ${String(profile.gaps.threshold)} o menos).`
          : `${namesOf(profile.gaps.dimensions)} ${profile.gaps.dimensions.length === 1 ? 'está' : 'están'} en brecha: nivel ${String(profile.gaps.threshold)} o menos.`,
    },
    { kind: 'subheading', text: 'Alertas de estado crítico' },
  );
  if (profile.criticalState.dimensions.length === 0) {
    push({
      kind: 'paragraph',
      text: 'Ninguna dimensión clave (cliente, negocio o equipo) está en estado crítico.',
    });
  } else {
    for (const code of profile.criticalState.dimensions) {
      push({
        kind: 'alert',
        text: `${nameOf(code)} está en estado crítico. Es una dimensión clave y está en brecha: necesita atención primero.`,
      });
    }
  }
  const pairs = [...(profile.imbalances ?? [])].sort(
    (a, b) =>
      SEVERITY_ORDER[a.classification] - SEVERITY_ORDER[b.classification],
  );
  if (pairs.length > 0) {
    push(
      { kind: 'subheading', text: 'Desequilibrios entre dimensiones' },
      {
        kind: 'paragraph',
        text: 'Seis pares de dimensiones deben avanzar juntas. Una diferencia de 2 o 3 niveles es un desequilibrio moderado; una de 4 o más, crítico.',
      },
    );
    const levelOf = new Map(
      profile.dimensionResults.map((r) => [r.dimensionCode, r.irlLevel]),
    );
    const gapCodes = new Set(profile.gaps.dimensions);
    // Each pair with an alert as on screen; the balanced ones in one line.
    for (const pair of pairs.filter((p) => p.classification !== 'acceptable')) {
      push(pairBlock(pair, levelOf, nameOf, gapCodes));
    }
    const balanced = pairs.filter((p) => p.classification === 'acceptable');
    if (balanced.length > 0) {
      push({
        kind: 'paragraph',
        text: `Sin alerta, avanzan a un ritmo parecido: ${listNames(balanced.map((p) => `${listNames([nameOf(p.left), nameOf(p.right)])} (${levelWord(p.difference)})`))}.`,
      });
    }
  }

  // Recommendation.
  // The service, its level, what it achieves and the alternatives are on
  // the summary page; here, what it is about and why it was chosen.
  if (recommendation.primary) {
    const s = recommendation.primary;
    push({ kind: 'heading', text: 'Recomendación del portafolio INNLAB' });
    if (s.description) {
      push({ kind: 'field', label: 'De qué se trata', value: s.description });
    }
    if (recommendation.justification) {
      push({
        kind: 'field',
        label: 'Por qué este servicio',
        value: recommendation.justification,
      });
    }
    if (s.adjustmentReason) {
      push({
        kind: 'paragraph',
        text: `El centro lo sugiere: ${s.adjustmentReason}`,
      });
    }
  } else if (recommendation.alternatives.length > 0) {
    // Without a recommendation the summary says why; the options are only here.
    push(
      { kind: 'heading', text: 'Recomendación del portafolio INNLAB' },
      {
        kind: 'field',
        label: 'Otras opciones del portafolio',
        value: `${listNames(recommendation.alternatives.map((a) => a.name))}.`,
      },
    );
  }

  // Roadmap.
  push({ kind: 'heading', text: 'Ruta de escalamiento' });
  if (roadmap.phases.length === 0) {
    push({
      kind: 'paragraph',
      text: 'Todas las dimensiones alcanzan el nivel que se espera de ellas: no hace falta una ruta de escalamiento.',
    });
  }
  if (roadmap.phases.length > 0) {
    push({
      kind: 'timeline',
      phases: roadmap.phases.map((phase) => ({
        order: phase.order,
        service: phase.service?.name ?? null,
        tier: phase.service?.tier.name ?? null,
        approximate: phase.service?.approximate ?? false,
        steps: phase.dimensions.map((d) => ({
          dimensionCode: d.dimensionCode,
          label: d.shortName,
          from: d.currentLevel,
          to: d.targetLevel,
        })),
      })),
    });
  }
  for (const phase of roadmap.phases) {
    // The service and the levels of each phase are on the line of phases
    // above; here, why each dimension is worked.
    push({ kind: 'subheading', text: `Fase ${String(phase.order)}` });
    if (phase.service?.approximate) {
      push({
        kind: 'paragraph',
        text: 'Ningún servicio alcanza el mínimo para esta fase: se propone el más cercano disponible.',
      });
    }
    for (const d of phase.dimensions) {
      const continues =
        d.targetLevel < d.finalTargetLevel
          ? ` Sigue en la próxima fase hasta el nivel ${String(d.finalTargetLevel)}.`
          : '';
      push({
        kind: 'bullet',
        text: `${d.shortName}: ${inclusionSentence(d)}${continues}`,
      });
    }
  }
  if (roadmap.dimensionsWithoutIntervention.length > 0) {
    push({
      kind: 'paragraph',
      text: `Sin intervención: ${listNames(roadmap.dimensionsWithoutIntervention.map((d) => d.shortName))} ${roadmap.dimensionsWithoutIntervention.length === 1 ? 'ya alcanza' : 'ya alcanzan'} lo esperado.`,
    });
  }
  if (roadmap.phases.length > 0) {
    push(
      { kind: 'subheading', text: 'Al terminar la ruta' },
      {
        kind: 'route',
        rows: profile.dimensionResults.map((r) => ({
          dimensionCode: r.dimensionCode,
          label: r.shortName,
          today: r.irlLevel,
          end: roadmap.finalLevels[r.dimensionCode] ?? r.irlLevel,
        })),
      },
    );
    push({
      kind: 'paragraph',
      text: roadmap.balanced
        ? 'Al terminar, ningún par de dimensiones queda con un desequilibrio con alerta.'
        : 'Al terminar, todavía queda algún par de dimensiones con un desequilibrio con alerta.',
    });
  }

  // Answers to the questionnaire.
  if (report.answers.some((d) => d.answers.length > 0)) {
    push(
      { kind: 'heading', text: 'Respuestas al cuestionario' },
      {
        kind: 'paragraph',
        text: 'Lo que respondiste a cada afirmación, de 1 (totalmente en desacuerdo) a 5 (totalmente de acuerdo), con tu justificación cuando la diste.',
      },
    );
    for (const d of report.answers) {
      push({
        kind: 'answers',
        dimensionCode: d.dimensionCode,
        title: d.name,
        rows: d.answers.map((a) => ({
          sequence: a.sequence,
          text: a.text,
          value: a.value,
          valueLabel: LIKERT_LABELS[a.value] ?? String(a.value),
          justification: a.justification,
        })),
      });
    }
  }

  // The technical terms, for whoever reads the report without the application.
  const GLOSSARY_TERMS: readonly { term: string; text: string }[] = [
    {
      term: 'Nivel IRL',
      text: 'madurez de 1 (idea) a 9 (lista para escalar) en cada dimensión.',
    },
    {
      term: 'Cuello de botella',
      text: 'la dimensión con el nivel más bajo: la que más frena.',
    },
    {
      term: 'Brecha',
      text: `una dimensión en nivel ${String(profile.gaps.threshold)} o menos.`,
    },
    {
      term: 'Desequilibrio',
      text: 'diferencia de niveles entre dos dimensiones que deberían avanzar juntas.',
    },
    {
      term: 'Dimensión crítica',
      text: `una dimensión clave (cliente, negocio o equipo) en nivel ${String(profile.gaps.threshold)} o menos: el estado crítico.`,
    },
  ];
  push({ kind: 'heading', text: 'Términos del reporte' });
  for (const g of GLOSSARY_TERMS) {
    push({ kind: 'paragraph', text: `${g.term}: ${g.text}` });
  }

  // Attribution.
  push(
    { kind: 'heading', text: 'Marco de referencia' },
    {
      kind: 'paragraph',
      text: `Este diagnóstico aplica el marco ${attribution.framework}, de ${attribution.owner} (versión ${report.frameworkVersion}).`,
    },
    // The completion date is in the band, and the notice at the foot of
    // every page: here, only the license's address.
    {
      kind: 'field',
      label: `Licencia ${attribution.license}`,
      value: attribution.licenseUrl,
    },
  );

  const headings = [
    ...new Set(blocks.flatMap((b) => (b.kind === 'heading' ? [b.text] : []))),
  ];
  const sections = headings.map((title) => ({
    title,
    text: SECTION_TEXT[title] ?? '',
  }));
  const withSections = blocks.map((b) =>
    b.kind === 'summary' ? { ...b, summary: { ...b.summary, sections } } : b,
  );
  const service = recommendation.primary
    ? `Servicio recomendado: ${recommendation.primary.name}`
    : 'Sin servicio recomendado por ahora';

  return {
    title: `Reporte del diagnóstico IRL: ${initiative.name}`,
    subtitle: `Análisis profundo completado el ${formatReportDate(report.completedAt)}`,
    banner: {
      heading: 'Reporte del diagnóstico IRL',
      initiative: initiative.name,
      service,
      meta: `Análisis profundo completado el ${formatReportDate(report.completedAt)}`,
    },
    blocks: withSections,
    footer: attribution.notice,
  };
}

/**
 * The file name: what it is and whose, with no characters a file system or
 * a mail client would mangle. «reporte-irl-agroconecta-2026-09-08.pdf».
 */
export function reportFileName(report: DiagnosticReport): string {
  const slug = report.initiative.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const day = new Date(report.completedAt).toLocaleDateString('en-CA', {
    timeZone: TIME_ZONE,
  });
  return `reporte-irl-${slug || 'iniciativa'}-${day}.pdf`;
}

/**
 * The sector as the report names it: the CIIU section with its code
 * («A. Agricultura, …»), or the user's own sector when they chose «Otro».
 */
function sectorLabel(initiative: DiagnosticReport['initiative']): string {
  const { sector, customSector } = initiative;
  if (sector.isOther)
    return `Otro sector: ${customSector ?? 'sin especificar'}`;
  return sector.code ? `${sector.code}. ${sector.name}` : sector.name;
}

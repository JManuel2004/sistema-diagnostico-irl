import type {
  DimensionCode,
  ImbalanceClassification,
  RoadmapDimensionTarget,
} from '@innlab/contracts';
import { LIKERT_LABELS, type DiagnosticReport } from '@innlab/contracts';

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
  /** The six levels on the 1–9 scale, as a radar; each point named. */
  | {
      readonly kind: 'radar';
      readonly points: readonly {
        readonly dimensionCode: DimensionCode;
        readonly label: string;
        readonly level: number;
      }[];
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

export interface ReportDocumentModel {
  /** The document's title (also its PDF metadata). */
  readonly title: string;
  readonly subtitle: string;
  readonly blocks: readonly ReportBlock[];
  /** The attribution of the KTH framework, at the foot of every page (RNF-09). */
  readonly footer: string;
}

const LOCALE = 'es-CO';
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

  // Initiative.
  push(
    { kind: 'heading', text: 'Datos de la iniciativa' },
    { kind: 'field', label: 'Nombre', value: initiative.name },
    { kind: 'field', label: 'Sector', value: initiative.sector.name },
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
      value: `${String(initiative.teamSize)} ${initiative.teamSize === 1 ? 'persona' : 'personas'}. ${initiative.teamDescription}`,
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
    { kind: 'heading', text: 'Perfil de seis dimensiones' },
    {
      kind: 'paragraph',
      text: 'El nivel de madurez de la iniciativa en cada dimensión del marco IRL, en una escala de 1 a 9.',
    },
    {
      kind: 'field',
      label: 'Nivel IRL global',
      value: `${oneDecimal(profile.globalAverage)} de 9${profile.globalLevel.description ? `. ${profile.globalLevel.description}` : ''}`,
    },
    {
      kind: 'field',
      label: 'Dimensión más fuerte',
      value: `${namesOf(profile.strength.dimensions)}, nivel ${String(profile.strength.level)}`,
    },
    {
      kind: 'field',
      label: 'Cuello de botella',
      value: `${namesOf(profile.bottleneck.dimensions)}, nivel ${String(profile.bottleneck.level)}`,
    },
    {
      kind: 'radar',
      points: profile.dimensionResults.map((r) => ({
        dimensionCode: r.dimensionCode,
        label: r.shortName,
        level: r.irlLevel,
      })),
    },
  );
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
    push({ kind: 'subheading', text: 'Desequilibrios entre dimensiones' });
    for (const pair of pairs) {
      push({
        kind: 'bullet',
        text: `${listNames([nameOf(pair.left), nameOf(pair.right)])}: ${levelWord(pair.difference)} de diferencia, ${CLASSIFICATION_LABEL[pair.classification]}.`,
      });
    }
  }

  // Recommendation.
  push({ kind: 'heading', text: 'Recomendación del portafolio INNLAB' });
  if (recommendation.primary) {
    const s = recommendation.primary;
    push(
      { kind: 'subheading', text: s.name },
      { kind: 'paragraph', text: s.subtitle },
      { kind: 'field', label: 'Nivel', value: s.tier.name },
    );
    if (s.description) {
      push({ kind: 'field', label: 'De qué se trata', value: s.description });
    }
    push({ kind: 'field', label: 'Qué puede lograr', value: s.scope });
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
  } else {
    push({
      kind: 'paragraph',
      text:
        recommendation.noRecommendationReason ??
        'Ningún servicio del portafolio corresponde a este perfil.',
    });
  }
  if (recommendation.alternatives.length > 0) {
    push({
      kind: 'field',
      label: 'Otras opciones del portafolio',
      value: `${listNames(recommendation.alternatives.map((a) => a.name))}.`,
    });
  }

  // Roadmap.
  push({ kind: 'heading', text: 'Roadmap de escalamiento' });
  if (roadmap.phases.length === 0) {
    push({
      kind: 'paragraph',
      text: 'Todas las dimensiones alcanzan el nivel que se espera de ellas: no hace falta una ruta de escalamiento.',
    });
  }
  for (const phase of roadmap.phases) {
    push({ kind: 'subheading', text: `Fase ${String(phase.order)}` });
    push({
      kind: 'field',
      label: 'Servicio',
      value: phase.service
        ? `${phase.service.name} (${phase.service.tier.name})${phase.service.approximate ? '. Es el más cercano disponible: ninguno alcanza el mínimo para esta fase.' : ''}`
        : 'Ninguno del portafolio corresponde a esta fase.',
    });
    for (const d of phase.dimensions) {
      const continues =
        d.targetLevel < d.finalTargetLevel
          ? ` Sigue en la próxima fase hasta el nivel ${String(d.finalTargetLevel)}.`
          : '';
      push({
        kind: 'bullet',
        text: `${d.shortName}: del nivel ${String(d.currentLevel)} al ${String(d.targetLevel)}; ${inclusionSentence(d)}${continues}`,
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

  // Attribution.
  push(
    { kind: 'heading', text: 'Marco de referencia' },
    {
      kind: 'paragraph',
      text: `Este diagnóstico aplica el marco ${attribution.framework}, de ${attribution.owner} (versión ${report.frameworkVersion}).`,
    },
    {
      kind: 'field',
      label: 'Análisis profundo completado',
      value: formatReportDate(report.completedAt),
    },
    { kind: 'paragraph', text: attribution.notice },
    {
      kind: 'field',
      label: `Licencia ${attribution.license}`,
      value: attribution.licenseUrl,
    },
  );

  return {
    title: `Reporte del diagnóstico IRL: ${initiative.name}`,
    subtitle: `Análisis profundo completado el ${formatReportDate(report.completedAt)}`,
    blocks,
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

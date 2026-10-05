import type {
  Diagnostic,
  DimensionAnswers,
  Initiative,
  MaturityProfileResponse,
  RecommendationResponse,
  RoadmapResponse,
  ServiceDetail,
} from '@innlab/contracts';

/**
 * The saved results of the AgroConecta diagnostic, as each owning module
 * serves them: the sections the report gathers. Valid against their
 * contracts, so a report built from them parses as one.
 */
export const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const INITIATIVE_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
const SNAPSHOT_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

export function aDiagnostic(overrides: Partial<Diagnostic> = {}): Diagnostic {
  return {
    id: DIAGNOSTIC_ID,
    userId: 'user-1',
    state: 'DEEP_ANALYSIS_COMPLETE',
    completed: true,
    deepAnalysisAccepted: true,
    deepAnalysisCompleted: true,
    frameworkVersion: 'KTH-IRL-1.0',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function anInitiative(): Initiative {
  return {
    id: SNAPSHOT_ID,
    initiativeId: INITIATIVE_ID,
    diagnosticId: DIAGNOSTIC_ID,
    name: 'AgroConecta',
    sector: { id: '1', name: 'Agroindustria' },
    productType: 'Plataforma de trazabilidad y comercialización de café',
    stage: { id: '2', code: 'validacion', name: 'Validación' },
    declaredStage: 'Piloto completado',
    teamSize: 3,
    teamDescription: 'Fundadora, coordinadora y desarrollador externo',
    targetMarket: 'Productores de café del suroccidente',
    currentFunding: 'Ahorros de la fundadora',
    recordedAt: '2026-01-01T00:00:00.000Z',
  };
}

const LEVELS = { TRL: 6, CRL: 4, BRL: 3, IPRL: 1, TmRL: 5, FRL: 2 } as const;
const NAMES = {
  TRL: ['Nivel de Madurez Tecnológica', 'Tecnología'],
  CRL: ['Nivel de Madurez del Cliente', 'Cliente'],
  BRL: ['Nivel de Madurez del Modelo de Negocio', 'Negocio'],
  IPRL: [
    'Nivel de Madurez de la Propiedad Intelectual',
    'Propiedad intelectual',
  ],
  TmRL: ['Nivel de Madurez del Equipo', 'Equipo'],
  FRL: ['Nivel de Madurez de la Financiación', 'Financiación'],
} as const;
const CODES = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'] as const;

export function aProfile(): MaturityProfileResponse {
  const scale = Array.from({ length: 9 }, (_, i) => `Nivel ${String(i + 1)}`);
  return {
    diagnosticId: DIAGNOSTIC_ID,
    computedAt: '2026-01-01T00:00:00.000Z',
    dimensionResults: CODES.map((code) => ({
      dimensionCode: code,
      name: NAMES[code][0],
      shortName: NAMES[code][1],
      averageLikert: 1 + LEVELS[code] / 3,
      irlLevel: LEVELS[code],
      levelDescription: `Nivel ${String(LEVELS[code])}`,
    })),
    globalAverage: 3.5,
    bottleneck: { dimensions: ['IPRL'], level: 1 },
    strength: { dimensions: ['TRL'], level: 6 },
    asymmetry: { difference: 5, classification: 'critical' },
    gaps: { dimensions: ['BRL', 'IPRL', 'FRL'], threshold: 3 },
    criticalState: { dimensions: ['BRL'] },
    globalLevel: { level: 4, description: 'Nivel global 4' },
    levelScale: {
      TRL: scale,
      CRL: scale,
      BRL: scale,
      IPRL: scale,
      TmRL: scale,
      FRL: scale,
    },
    imbalances: [
      { left: 'TRL', right: 'CRL', difference: 2, classification: 'moderate' },
      { left: 'TRL', right: 'BRL', difference: 3, classification: 'moderate' },
      {
        left: 'CRL',
        right: 'BRL',
        difference: 1,
        classification: 'acceptable',
      },
      { left: 'TmRL', right: 'FRL', difference: 3, classification: 'moderate' },
      { left: 'BRL', right: 'IPRL', difference: 2, classification: 'moderate' },
      { left: 'TRL', right: 'IPRL', difference: 5, classification: 'critical' },
    ],
  };
}

function aService(): ServiceDetail {
  return {
    idService: 7,
    name: 'Célula de Grado · Posgrado',
    subtitle: 'Proyecto de grado de posgrado',
    description: 'Un equipo de posgrado trabaja sobre la iniciativa.',
    scope: 'Un entregable aplicado a la iniciativa.',
    band: { minLevel: 3, maxLevel: 6 },
    tier: {
      code: 'profundiza',
      name: 'Profundiza',
      order: 3,
      tagline: 'Vamos a fondo',
      description: 'Servicios de acompañamiento profundo.',
    },
  };
}

export function aRecommendation(
  generatedAt = '2026-01-02T10:00:00.000Z',
): RecommendationResponse {
  return {
    diagnosticId: DIAGNOSTIC_ID,
    resultType: 'RECOMMENDATION',
    primary: {
      ...aService(),
      position: 1,
      score: 0.82,
      adjustmentReason: null,
    },
    justification:
      'Negocio y Propiedad intelectual son las dimensiones más rezagadas.',
    noRecommendationReason: null,
    alternatives: [],
    generatedAt,
  };
}

export function aRoadmap(
  generatedAt = '2026-01-02T10:00:01.000Z',
): RoadmapResponse {
  return {
    diagnosticId: DIAGNOSTIC_ID,
    generatedAt,
    phases: [
      {
        order: 1,
        dimensions: [
          {
            dimensionCode: 'CRL',
            name: NAMES.CRL[0],
            shortName: NAMES.CRL[1],
            currentLevel: 4,
            targetLevel: 5,
            finalTargetLevel: 5,
            enables: [],
            inclusionReason: 'BELOW_EXPECTED_MINIMUM',
            expectedMinimum: 5,
            targetReason: 'EXPECTED_MINIMUM',
            targetDrivenBy: null,
          },
        ],
        service: { ...aService(), approximate: false },
        serviceTrace: {
          mode: 'RECOMMENDATION',
          projectedLevels: { ...LEVELS },
          averageLevel: 3.5,
          excluded: [],
          skipped: [],
          ranking: [],
          appliedAdjustments: [],
        },
      },
    ],
    finalLevels: { ...LEVELS, CRL: 5 },
    balanced: true,
    dimensionsWithoutIntervention: [
      { code: 'TRL', name: NAMES.TRL[0], shortName: NAMES.TRL[1] },
    ],
  };
}

/** The 48 answers: each dimension's statements, its value and a justification on the first. */
export function someAnswers(): DimensionAnswers[] {
  return CODES.map((code, d) => ({
    dimensionCode: code,
    name: NAMES[code][0],
    answers: Array.from({ length: 8 }, (_, i) => ({
      statementId: String(d * 8 + i + 1),
      sequence: i + 1,
      text: `Afirmación ${String(i + 1)} de ${NAMES[code][1]}`,
      value: ((i + d) % 5) + 1,
      justification: i === 0 ? `Justificación de ${NAMES[code][1]}` : null,
    })),
  }));
}

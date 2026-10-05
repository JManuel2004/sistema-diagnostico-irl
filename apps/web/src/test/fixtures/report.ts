import {
  DIMENSION_CODES,
  IRL_ATTRIBUTION,
  type DiagnosticReport,
  type DimensionCode,
  type MaturityProfileResponse,
  type RecommendationResponse,
} from '@innlab/contracts';
import { dimensionResultFixture, globalLevelFixture, levelScaleFixture } from './dimensions';
import { initiativeFixture } from './initiative';
import { agroconectaRoadmapFixture } from './roadmap';
import { serviceDetailFixture } from './services';

const ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
// AgroConecta: TRL 6, CRL 4, BRL 3, IPRL 1, TmRL 5, FRL 2.
const LEVELS: Record<DimensionCode, number> = { TRL: 6, CRL: 4, BRL: 3, IPRL: 1, TmRL: 5, FRL: 2 };

export function agroconectaProfileFixture(): MaturityProfileResponse {
  return {
    diagnosticId: ID,
    computedAt: '2026-03-05T15:30:00.000Z',
    globalAverage: 3.5,
    globalLevel: globalLevelFixture(3.5),
    levelScale: levelScaleFixture(),
    dimensionResults: DIMENSION_CODES.map((c) => dimensionResultFixture(c, LEVELS[c])),
    bottleneck: { dimensions: ['IPRL'], level: 1 },
    strength: { dimensions: ['TRL'], level: 6 },
    asymmetry: { difference: 5, classification: 'critical' },
    gaps: { dimensions: ['BRL', 'IPRL', 'FRL'], threshold: 3 },
    criticalState: { dimensions: ['BRL'] },
    imbalances: [
      { left: 'TRL', right: 'CRL', difference: 2, classification: 'moderate' },
      { left: 'TRL', right: 'BRL', difference: 3, classification: 'moderate' },
      { left: 'CRL', right: 'BRL', difference: 1, classification: 'acceptable' },
      { left: 'TmRL', right: 'FRL', difference: 3, classification: 'moderate' },
      { left: 'BRL', right: 'IPRL', difference: 2, classification: 'moderate' },
      { left: 'TRL', right: 'IPRL', difference: 5, classification: 'critical' },
    ],
  };
}

function recommendation(): RecommendationResponse {
  return {
    diagnosticId: ID,
    resultType: 'RECOMMENDATION',
    primary: {
      ...serviceDetailFixture(2, 'Reto Express'),
      position: 1,
      score: 5.55,
      adjustmentReason: null,
    },
    justification: 'Atiende primero a Negocio, la dimensión clave más rezagada.',
    noRecommendationReason: null,
    alternatives: [
      {
        ...serviceDetailFixture(4, 'Reto en el Aula'),
        position: 2,
        score: 3.8,
        adjustmentReason: null,
      },
    ],
    generatedAt: '2026-09-08T10:00:00.000Z',
  };
}

/** The full report of the AgroConecta diagnostic, as `GET /report` serves it. */
export function agroconectaReportFixture(): DiagnosticReport {
  return {
    diagnosticId: ID,
    frameworkVersion: 'KTH-IRL-1.0',
    completedAt: '2026-09-08T10:00:01.000Z',
    initiative: initiativeFixture(),
    profile: agroconectaProfileFixture(),
    recommendation: recommendation(),
    roadmap: agroconectaRoadmapFixture(),
    attribution: { ...IRL_ATTRIBUTION },
  };
}

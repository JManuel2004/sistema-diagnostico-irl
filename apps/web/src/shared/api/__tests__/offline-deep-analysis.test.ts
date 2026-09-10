import { describe, expect, it } from 'vitest';
import type { MaturityProfileResponse } from '@innlab/contracts';
import { buildOfflineRoadmap } from '../offline-roadmap';
import { buildOfflineRecommendation } from '../offline-recommendation';

const DIAG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const CODES = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'] as const;

function profile(levels: Record<(typeof CODES)[number], number>): MaturityProfileResponse {
  const dimensionResults = CODES.map((code) => ({
    dimensionCode: code,
    name: code,
    averageLikert: 3,
    irlLevel: levels[code],
  }));
  const min = Math.min(...dimensionResults.map((r) => r.irlLevel));
  return {
    diagnosticId: DIAG_ID,
    computedAt: '2026-09-10T21:34:54.523Z',
    dimensionResults,
    bottleneck: {
      dimensions: dimensionResults.filter((r) => r.irlLevel === min).map((r) => r.dimensionCode),
      level: min,
    },
    strength: { dimensions: ['TRL'], level: 9 },
    asymmetry: { difference: 0, classification: 'acceptable' },
    gaps: {
      dimensions: dimensionResults.filter((r) => r.irlLevel <= 3).map((r) => r.dimensionCode),
      threshold: 3,
    },
  };
}

describe('buildOfflineRoadmap', () => {
  it('no propone fases cuando todas las dimensiones cumplen el mínimo', () => {
    const roadmap = buildOfflineRoadmap(
      profile({ TRL: 6, CRL: 6, BRL: 6, IPRL: 6, TmRL: 6, FRL: 6 }),
    );
    expect(roadmap.phases).toEqual([]);
    expect(roadmap.dimensionsWithoutIntervention).toHaveLength(6);
  });

  it('incluye IPRL cuando está por debajo del mínimo esperado', () => {
    const roadmap = buildOfflineRoadmap(
      profile({ TRL: 6, CRL: 6, BRL: 6, IPRL: 1, TmRL: 6, FRL: 6 }),
    );
    expect(roadmap.phases.flatMap((p) => p.dimensions.map((d) => d.dimensionCode))).toEqual([
      'IPRL',
    ]);
  });
});

describe('buildOfflineRecommendation', () => {
  it('recomienda Consultoría cuando el cuello es IPRL', () => {
    const rec = buildOfflineRecommendation(
      profile({ TRL: 6, CRL: 6, BRL: 6, IPRL: 1, TmRL: 6, FRL: 6 }),
    );
    expect(rec.resultadoTipo).toBe('RECOMENDACION');
    expect(rec.principal?.nombre).toBe('Consultoría');
  });
});

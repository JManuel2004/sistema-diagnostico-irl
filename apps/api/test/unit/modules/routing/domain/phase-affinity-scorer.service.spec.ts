import { describe, expect, it } from '@jest/globals';
import type { DimensionCode } from '@innlab/contracts';
import { PhaseAffinityScorerService } from '../../../../../src/modules/routing/domain/services/phase-affinity-scorer.service.js';
import { factsFromLevels } from '../../../../../src/modules/routing/domain/services/projected-facts.js';
import type { NumericProfile } from '../../../../../src/modules/routing/domain/value-objects/ordinal-profile.vo.js';

const PARAMETERS = {
  bottleneckWeight: 3,
  gapWeight: 1.5,
  moderateImbalanceWeight: 0.5,
  criticalImbalanceWeight: 1,
  stageAffinityWeight: 0.8,
  outOfRangePenalty: 2,
  minimumThreshold: 2.5,
  alternativesCount: 2,
};
const PHASE = { coverageWeight: 1.5, minimumThreshold: 1 };

function profile(over: Partial<NumericProfile> = {}): NumericProfile {
  const labels = new Map<DimensionCode, string>([
    ['TRL', 'primary'],
    ['CRL', 'secondary'],
    ['BRL', 'secondary'],
    ['IPRL', 'not_applicable'],
    ['TmRL', 'not_applicable'],
    ['FRL', 'not_applicable'],
  ]);
  const value = {
    primary: 1,
    secondary: 0.5,
    marginal: 0.2,
    not_applicable: 0,
  } as const;
  return {
    idService: 4,
    serviceName: 'Reto en el Aula',
    minLevel: 4,
    maxLevel: 6,
    relevantStages: ['validacion'],
    labels,
    intensities: new Map(
      [...labels].map(([d, l]) => [d, value[l as keyof typeof value]]),
    ),
    ...over,
  };
}

const facts = (
  stage: string | null,
  levels = { TRL: 6, CRL: 5, BRL: 3, IPRL: 3, TmRL: 5, FRL: 2 },
) =>
  factsFromLevels('diag', levels, {
    stage,
    sector: null,
    teamSize: 3,
    academicLinkage: false,
  });

describe('PhaseAffinityScorerService — how a service works the dimensions of a phase', () => {
  const scorer = new PhaseAffinityScorerService();

  it('adds intensity × levels the phase raises, per dimension of the phase, plus the stage', () => {
    // Negocio 3→5 (secondary: 0.5 × 2 levels) and PI 3→5 (not applicable).
    const [candidate] = scorer.score(
      [profile()],
      [
        { dimension: 'BRL', fromLevel: 3, toLevel: 5 },
        { dimension: 'IPRL', fromLevel: 3, toLevel: 5 },
      ],
      facts('validacion'),
      PARAMETERS,
      PHASE,
    );

    expect(candidate.coverage.details).toEqual([
      { dimension: 'BRL', sourceLabel: 'secondary', levels: 2, value: 1.5 },
      { dimension: 'IPRL', sourceLabel: 'not_applicable', levels: 2, value: 0 },
    ]);
    expect(candidate.contributions.stageAffinity).toEqual({
      value: 0.8,
      matches: true,
    });
    // The average 4.0 is inside the band 4–6: no penalty.
    expect(candidate.contributions.rangePenalty.applied).toBe(false);
    expect(candidate.total).toBe(2.3);
  });

  it('checks the band against the average projected to the start of the phase', () => {
    const [candidate] = scorer.score(
      [profile({ minLevel: 6, maxLevel: 7 })],
      [{ dimension: 'BRL', fromLevel: 3, toLevel: 5 }],
      facts(null),
      PARAMETERS,
      PHASE,
    );

    expect(candidate.contributions.rangePenalty).toEqual({
      value: 2,
      applied: true,
    });
    expect(candidate.contributions.stageAffinity.matches).toBe(false);
    expect(candidate.total).toBe(1.5 - 2);
  });

  it('a service that works none of the phase dimensions only gets its stage and band', () => {
    const [candidate] = scorer.score(
      [profile()],
      [{ dimension: 'FRL', fromLevel: 2, toLevel: 4 }],
      facts('validacion'),
      PARAMETERS,
      PHASE,
    );

    expect(candidate.coverage.value).toBe(0);
    expect(candidate.total).toBe(0.8);
  });
});

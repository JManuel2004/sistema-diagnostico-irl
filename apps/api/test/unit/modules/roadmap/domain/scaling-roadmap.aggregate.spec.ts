import { describe, expect, it } from '@jest/globals';
import { ScalingRoadmap } from '../../../../../src/modules/roadmap/domain/entities/scaling-roadmap.aggregate.js';
import { RoadmapCalculationError } from '../../../../../src/modules/roadmap/domain/exceptions/roadmap.errors.js';
import { Uuid } from '../../../../../src/shared/kernel/domain/value-objects/uuid.vo.js';

const DIAG = Uuid.create('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
const NOW = new Date('2026-09-08T10:00:00.000Z');

const buildRoadmap = (phases: Parameters<typeof ScalingRoadmap.create>[0]['phases']) =>
  ScalingRoadmap.create({ diagnosticId: DIAG, phases, generatedAt: NOW });

describe('ScalingRoadmap', () => {
  it('deriva las dimensions sin intervención a partir de las que sí la tienen', () => {
    // Make explicit that all six were considered: without this field, the
    // absence of a dimension would read as an oversight.
    const r = buildRoadmap([
      {
        order: 1,
        dimensions: [
          { dimensionCode: 'BRL', currentLevel: 3, targetLevel: 4, enables: ['FRL'], inclusionReason: 'BELOW_EXPECTED_MINIMUM' as const, expectedMinimum: 4, targetDrivenBy: null },
          { dimensionCode: 'IPRL', currentLevel: 1, targetLevel: 4, enables: ['FRL'], inclusionReason: 'BELOW_EXPECTED_MINIMUM' as const, expectedMinimum: 4, targetDrivenBy: null },
        ],
      },
      {
        order: 2,
        dimensions: [
          { dimensionCode: 'FRL', currentLevel: 2, targetLevel: 4, enables: [], inclusionReason: 'BELOW_EXPECTED_MINIMUM' as const, expectedMinimum: 4, targetDrivenBy: null },
        ],
      },
    ]);

    expect(r.dimensionsWithoutIntervention).toEqual(['TRL', 'CRL', 'TmRL']);
    expect(r.isEmpty()).toBe(false);
  });

  it('un roadmap sin fases es válido: la iniciativa cumple en las seis', () => {
    const r = buildRoadmap([]);
    expect(r.isEmpty()).toBe(true);
    expect(r.dimensionsWithoutIntervention).toHaveLength(6);
  });

  it('rechaza que una dimensión aparezca en dos fases', () => {
    expect(() =>
      buildRoadmap([
        {
          order: 1,
          dimensions: [
            { dimensionCode: 'BRL', currentLevel: 3, targetLevel: 4, enables: [], inclusionReason: 'BELOW_EXPECTED_MINIMUM' as const, expectedMinimum: 4, targetDrivenBy: null },
          ],
        },
        {
          order: 2,
          dimensions: [
            { dimensionCode: 'BRL', currentLevel: 3, targetLevel: 4, enables: [], inclusionReason: 'BELOW_EXPECTED_MINIMUM' as const, expectedMinimum: 4, targetDrivenBy: null },
          ],
        },
      ]),
    ).toThrow(/más de una fase/);
  });

  it('rechaza una meta que no supera el nivel actual', () => {
    // It would mean the closure took in a dimension that did not need
    // it: there would be a phase with nothing to do.
    expect(() =>
      buildRoadmap([
        {
          order: 1,
          dimensions: [
            { dimensionCode: 'BRL', currentLevel: 4, targetLevel: 4, enables: [], inclusionReason: 'BELOW_EXPECTED_MINIMUM' as const, expectedMinimum: 4, targetDrivenBy: null },
          ],
        },
      ]),
    ).toThrow(RoadmapCalculationError);
  });

  it('rechaza fases numeradas fuera de secuencia', () => {
    expect(() =>
      buildRoadmap([
        {
          order: 2,
          dimensions: [
            { dimensionCode: 'BRL', currentLevel: 3, targetLevel: 4, enables: [], inclusionReason: 'BELOW_EXPECTED_MINIMUM' as const, expectedMinimum: 4, targetDrivenBy: null },
          ],
        },
      ]),
    ).toThrow(/consecutivamente/);
  });

  it('conserva el diagnóstico y el instante de generación', () => {
    const r = buildRoadmap([]);
    expect(r.diagnosticId.value).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    expect(r.generatedAt).toEqual(NOW);
  });
});

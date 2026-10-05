import { describe, expect, it } from '@jest/globals';
import type { DimensionCode } from '@innlab/contracts';
import {
  ScalingRoadmap,
  type RoadmapDimensionTarget,
  type RoadmapPhase,
} from '../../../../../src/modules/roadmap/domain/entities/scaling-roadmap.aggregate.js';
import { RoadmapCalculationError } from '../../../../../src/modules/roadmap/domain/exceptions/roadmap.errors.js';
import { Uuid } from '../../../../../src/shared/kernel/domain/value-objects/uuid.vo.js';

const DIAG = Uuid.create('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
const NOW = new Date('2026-09-08T10:00:00.000Z');
const FINAL = { TRL: 6, CRL: 4, BRL: 4, IPRL: 4, TmRL: 5, FRL: 4 };

const dim = (
  dimensionCode: DimensionCode,
  currentLevel: number,
  targetLevel: number,
  finalTargetLevel = targetLevel,
): RoadmapDimensionTarget => ({
  dimensionCode,
  currentLevel,
  targetLevel,
  finalTargetLevel,
  enables: [],
  inclusionReason: 'BELOW_EXPECTED_MINIMUM',
  expectedMinimum: 4,
  targetReason: 'EXPECTED_MINIMUM',
  targetDrivenBy: null,
});

const phase = (
  order: number,
  dimensions: RoadmapDimensionTarget[],
): RoadmapPhase => ({
  order,
  dimensions,
  service: null,
  serviceTrace: {
    mode: 'PHASE',
    projectedLevels: FINAL,
    averageLevel: 4.5,
    excluded: [],
    skipped: [],
    ranking: [],
    appliedAdjustments: [],
  },
});

const buildRoadmap = (phases: RoadmapPhase[]) =>
  ScalingRoadmap.create({
    diagnosticId: DIAG,
    phases,
    finalLevels: FINAL,
    balanced: false,
    generatedAt: NOW,
  });

describe('ScalingRoadmap', () => {
  it('deriva las dimensiones sin intervención a partir de las que sí la tienen', () => {
    // Make explicit that all six were considered: without this field, the
    // absence of a dimension would read as an oversight.
    const r = buildRoadmap([
      phase(1, [dim('BRL', 3, 4), dim('IPRL', 1, 3, 4)]),
      phase(2, [dim('IPRL', 3, 4), dim('FRL', 2, 4)]),
    ]);

    expect(r.dimensionsWithoutIntervention).toEqual(['TRL', 'CRL', 'TmRL']);
    expect(r.isEmpty()).toBe(false);
  });

  it('un roadmap sin fases es válido: la iniciativa cumple en las seis', () => {
    const r = buildRoadmap([]);
    expect(r.isEmpty()).toBe(true);
    expect(r.dimensionsWithoutIntervention).toHaveLength(6);
  });

  it('una subida grande se reparte en fases que continúan donde la dejó la anterior', () => {
    const r = buildRoadmap([
      phase(1, [dim('IPRL', 1, 3, 5)]),
      phase(2, [dim('IPRL', 3, 5, 5)]),
    ]);

    expect(
      r.phases.flatMap((p) =>
        p.dimensions.map((d) => [d.currentLevel, d.targetLevel]),
      ),
    ).toEqual([
      [1, 3],
      [3, 5],
    ]);
  });

  it('rechaza que una dimensión aparezca dos veces en la misma fase', () => {
    expect(() =>
      buildRoadmap([phase(1, [dim('BRL', 3, 4), dim('BRL', 3, 4)])]),
    ).toThrow(/dos veces en la fase 1/);
  });

  it('rechaza que una fase retome una dimensión en un nivel distinto del que dejó la anterior', () => {
    expect(() =>
      buildRoadmap([
        phase(1, [dim('IPRL', 1, 3, 5)]),
        phase(2, [dim('IPRL', 2, 5, 5)]),
      ]),
    ).toThrow(/la fase anterior la dejó en 3/);
  });

  it('rechaza una ruta que no lleva la dimensión a su meta final', () => {
    expect(() => buildRoadmap([phase(1, [dim('IPRL', 1, 3, 5)])])).toThrow(
      /meta final/,
    );
  });

  it('rechaza una meta que no supera el nivel actual', () => {
    // It would be a phase with nothing to do.
    expect(() => buildRoadmap([phase(1, [dim('BRL', 4, 4)])])).toThrow(
      RoadmapCalculationError,
    );
  });

  it('rechaza fases numeradas fuera de secuencia', () => {
    expect(() => buildRoadmap([phase(2, [dim('BRL', 3, 4)])])).toThrow(
      /consecutivamente/,
    );
  });

  it('conserva el diagnóstico, el perfil final, si quedó equilibrado y el instante de generación', () => {
    const r = buildRoadmap([]);
    expect(r.diagnosticId.value).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    expect(r.finalLevels).toEqual(FINAL);
    expect(r.balanced).toBe(false);
    expect(r.generatedAt).toEqual(NOW);
  });
});

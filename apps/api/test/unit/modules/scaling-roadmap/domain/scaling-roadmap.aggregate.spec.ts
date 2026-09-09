import { describe, expect, it } from '@jest/globals';
import { ScalingRoadmap } from '../../../../../src/modules/scaling-roadmap/domain/entities/scaling-roadmap.aggregate.js';
import { RoadmapCalculationError } from '../../../../../src/modules/scaling-roadmap/domain/errors/roadmap.errors.js';
import { Uuid } from '../../../../../src/shared-kernel/domain/value-objects/uuid.vo.js';

const DIAG = Uuid.create('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
const AHORA = new Date('2026-09-08T10:00:00.000Z');

const crear = (phases: Parameters<typeof ScalingRoadmap.create>[0]['phases']) =>
  ScalingRoadmap.create({ diagnosticId: DIAG, phases, generatedAt: AHORA });

describe('ScalingRoadmap', () => {
  it('deriva las dimensiones sin intervención a partir de las que sí la tienen', () => {
    // Hacer explícito que las seis se consideraron: sin este campo, la
    // ausencia de una dimensión se leería como un olvido.
    const r = crear([
      {
        order: 1,
        dimensions: [
          { dimensionCode: 'BRL', currentLevel: 3, targetLevel: 4, enables: ['FRL'] },
          { dimensionCode: 'IPRL', currentLevel: 1, targetLevel: 4, enables: ['FRL'] },
        ],
      },
      {
        order: 2,
        dimensions: [
          { dimensionCode: 'FRL', currentLevel: 2, targetLevel: 4, enables: [] },
        ],
      },
    ]);

    expect(r.dimensionsWithoutIntervention).toEqual(['TRL', 'CRL', 'TmRL']);
    expect(r.isEmpty()).toBe(false);
  });

  it('un roadmap sin fases es válido: la iniciativa cumple en las seis', () => {
    const r = crear([]);
    expect(r.isEmpty()).toBe(true);
    expect(r.dimensionsWithoutIntervention).toHaveLength(6);
  });

  it('rechaza que una dimensión aparezca en dos fases', () => {
    expect(() =>
      crear([
        {
          order: 1,
          dimensions: [
            { dimensionCode: 'BRL', currentLevel: 3, targetLevel: 4, enables: [] },
          ],
        },
        {
          order: 2,
          dimensions: [
            { dimensionCode: 'BRL', currentLevel: 3, targetLevel: 4, enables: [] },
          ],
        },
      ]),
    ).toThrow(/más de una fase/);
  });

  it('rechaza una meta que no supera el nivel actual', () => {
    // Indicaría que el cierre incorporó una dimensión que no lo
    // necesitaba: habría una fase sin nada que hacer.
    expect(() =>
      crear([
        {
          order: 1,
          dimensions: [
            { dimensionCode: 'BRL', currentLevel: 4, targetLevel: 4, enables: [] },
          ],
        },
      ]),
    ).toThrow(RoadmapCalculationError);
  });

  it('rechaza fases numeradas fuera de secuencia', () => {
    expect(() =>
      crear([
        {
          order: 2,
          dimensions: [
            { dimensionCode: 'BRL', currentLevel: 3, targetLevel: 4, enables: [] },
          ],
        },
      ]),
    ).toThrow(/consecutivamente/);
  });

  it('conserva el diagnóstico y el instante de generación', () => {
    const r = crear([]);
    expect(r.diagnosticId.value).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    expect(r.generatedAt).toEqual(AHORA);
  });
});

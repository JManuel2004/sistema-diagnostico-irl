import { describe, expect, it } from '@jest/globals';
import type { DimensionCode } from '@innlab/contracts';
import { OrdinalTranslatorService } from '../../../../../src/modules/routing/domain/services/ordinal-translator.service.js';
import { CalibrationScale } from '../../../../../src/modules/routing/domain/value-objects/calibration-scale.vo.js';
import type { OrdinalProfile } from '../../../../../src/modules/routing/domain/value-objects/ordinal-profile.vo.js';

const scale = CalibrationScale.create([
  { label: 'primary', value: 1.0, order: 1 },
  { label: 'secondary', value: 0.5, order: 2 },
  { label: 'not_applicable', value: 0.0, order: 3 },
]);

const profile: OrdinalProfile = {
  idService: 1,
  serviceName: 'Consultoría',
  minLevel: 4,
  maxLevel: 9,
  relevantStages: ['validacion'],
  intensities: new Map<DimensionCode, string>([
    ['CRL', 'primary'],
    ['IPRL', 'secondary'],
    ['TRL', 'not_applicable'],
  ]),
};

const translator = new OrdinalTranslatorService();

describe('OrdinalTranslatorService', () => {
  it('resuelve cada label a su value numérico', () => {
    const [resultado] = translator.translate([profile], scale);
    expect(resultado.intensities.get('CRL')).toBe(1.0);
    expect(resultado.intensities.get('IPRL')).toBe(0.5);
    expect(resultado.intensities.get('TRL')).toBe(0.0);
  });

  it('conserva la label original junto al value', () => {
    // Sin esto la explicación al usuario tendría que hablar en números,
    // que es exactamente lo que la escala ordinal existe para evitar.
    const [resultado] = translator.translate([profile], scale);
    expect(resultado.labels.get('CRL')).toBe('primary');
  });

  it('es determinista: dos traducciones iguales producen lo mismo', () => {
    const a = translator.translate([profile], scale);
    const b = translator.translate([profile], scale);
    expect([...a[0].intensities]).toEqual([...b[0].intensities]);
  });

  it('propaga el fallo si una profile usa una label ausente en la scale', () => {
    const rota: OrdinalProfile = {
      ...profile,
      intensities: new Map<DimensionCode, string>([['CRL', 'critico']]),
    };
    expect(() => translator.translate([rota], scale)).toThrow(
      /no existe en la scale/,
    );
  });

  it('conserva rango y etapas sin alterarlos', () => {
    const [resultado] = translator.translate([profile], scale);
    expect(resultado.minLevel).toBe(4);
    expect(resultado.maxLevel).toBe(9);
    expect(resultado.relevantStages).toEqual(['validacion']);
  });
});

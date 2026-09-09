import { describe, expect, it } from '@jest/globals';
import type { DimensionCode } from '@innlab/contracts';
import { OrdinalTranslatorService } from '../../../../../src/modules/portfolio-routing/domain/services/ordinal-translator.service.js';
import { EscalaCalibracion } from '../../../../../src/modules/portfolio-routing/domain/value-objects/escala-calibracion.vo.js';
import type { FichaOrdinal } from '../../../../../src/modules/portfolio-routing/domain/value-objects/ficha-ordinal.vo.js';

const escala = EscalaCalibracion.create([
  { etiqueta: 'principal', valor: 1.0, orden: 1 },
  { etiqueta: 'secundario', valor: 0.5, orden: 2 },
  { etiqueta: 'no_aplica', valor: 0.0, orden: 3 },
]);

const ficha: FichaOrdinal = {
  idServicio: 1,
  nombreServicio: 'Consultoría',
  nivelMin: 4,
  nivelMax: 9,
  etapasPertinentes: ['validacion'],
  intensidades: new Map<DimensionCode, string>([
    ['CRL', 'principal'],
    ['IPRL', 'secundario'],
    ['TRL', 'no_aplica'],
  ]),
};

const translator = new OrdinalTranslatorService();

describe('OrdinalTranslatorService', () => {
  it('resuelve cada etiqueta a su valor numérico', () => {
    const [resultado] = translator.translate([ficha], escala);
    expect(resultado.intensidades.get('CRL')).toBe(1.0);
    expect(resultado.intensidades.get('IPRL')).toBe(0.5);
    expect(resultado.intensidades.get('TRL')).toBe(0.0);
  });

  it('conserva la etiqueta original junto al valor', () => {
    // Sin esto la explicación al usuario tendría que hablar en números,
    // que es exactamente lo que la escala ordinal existe para evitar.
    const [resultado] = translator.translate([ficha], escala);
    expect(resultado.etiquetas.get('CRL')).toBe('principal');
  });

  it('es determinista: dos traducciones iguales producen lo mismo', () => {
    const a = translator.translate([ficha], escala);
    const b = translator.translate([ficha], escala);
    expect([...a[0].intensidades]).toEqual([...b[0].intensidades]);
  });

  it('propaga el fallo si una ficha usa una etiqueta ausente en la escala', () => {
    const rota: FichaOrdinal = {
      ...ficha,
      intensidades: new Map<DimensionCode, string>([['CRL', 'critico']]),
    };
    expect(() => translator.translate([rota], escala)).toThrow(
      /no existe en la escala/,
    );
  });

  it('conserva rango y etapas sin alterarlos', () => {
    const [resultado] = translator.translate([ficha], escala);
    expect(resultado.nivelMin).toBe(4);
    expect(resultado.nivelMax).toBe(9);
    expect(resultado.etapasPertinentes).toEqual(['validacion']);
  });
});

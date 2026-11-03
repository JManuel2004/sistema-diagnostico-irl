import { describe, expect, it } from 'vitest';
import tailwindConfig from '../../../../tailwind.config';
import { maturityBand, maturitySegmentClass } from '../maturity-scale';
import { PALETTE } from '../palette';

/**
 * The global IRL level reads as a thermometer, like the framework's
 * material: red for the gap levels, then orange, yellow and green.
 */
describe('maturity scale', () => {
  it('pinta de rojo los niveles en brecha (3 o menos) y de verde los más altos', () => {
    expect(maturityBand(1).bg).toBe('bg-maturity-low');
    expect(maturityBand(3).bg).toBe('bg-maturity-low');
    expect(maturityBand(4).bg).toBe('bg-maturity-developing');
    expect(maturityBand(5).bg).toBe('bg-maturity-developing');
    expect(maturityBand(6).bg).toBe('bg-maturity-advanced');
    expect(maturityBand(7).bg).toBe('bg-maturity-advanced');
    expect(maturityBand(8).bg).toBe('bg-maturity-mature');
    expect(maturityBand(9).bg).toBe('bg-maturity-mature');
  });

  it('lee un promedio con decimales por su nivel redondeado: 3,5 es naranja', () => {
    expect(maturityBand(3.4).label).toBe('Madurez inicial');
    expect(maturityBand(3.5).label).toBe('Madurez en desarrollo');
  });

  it('cada segmento de la barra toma el color de su propio nivel', () => {
    expect([1, 4, 6, 9].map(maturitySegmentClass)).toEqual([
      'bg-maturity-low',
      'bg-maturity-developing',
      'bg-maturity-advanced',
      'bg-maturity-mature',
    ]);
  });

  it('Tailwind genera los colores de la escala desde PALETTE', () => {
    const colors = tailwindConfig.theme?.extend?.colors as Record<string, unknown>;
    expect(colors.maturity).toEqual(PALETTE.maturity);
  });
});

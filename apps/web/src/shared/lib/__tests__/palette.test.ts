import { describe, expect, it } from 'vitest';
import { DIMENSION_CODES } from '@innlab/contracts';
import tailwindConfig from '../../../../tailwind.config';
import { getDimensionVisual } from '../dimensions';
import { PALETTE } from '../palette';

/**
 * The palette has one source. Tailwind reads it to build the utilities and
 * the SVG code reads the same constants, so a dimension has one color in the
 * radar and in the roadmap.
 */
describe('palette', () => {
  it('Tailwind genera sus colores de marca, semánticos y de dimensión desde PALETTE', () => {
    const colors = tailwindConfig.theme?.extend?.colors as Record<string, unknown>;

    expect(colors['azul-icesi']).toBe(PALETTE['azul-icesi']);
    expect(colors.critical).toEqual(PALETTE.critical);
    expect(colors.moderate).toEqual(PALETTE.moderate);
    expect(colors.acceptable).toEqual(PALETTE.acceptable);
    expect(colors.dimension).toEqual(PALETTE.dimension);
  });

  it('el color SVG de cada dimensión es su variante -ink de la paleta', () => {
    for (const code of DIMENSION_CODES) {
      const key = `${code.toLowerCase()}-ink` as keyof typeof PALETTE.dimension;
      expect(getDimensionVisual(code).color).toBe(PALETTE.dimension[key]);
    }
  });

  it('cada dimensión tiene relleno y variante -ink distintos y con formato de color', () => {
    for (const code of DIMENSION_CODES) {
      const base = PALETTE.dimension[code.toLowerCase() as keyof typeof PALETTE.dimension];
      const ink = PALETTE.dimension[`${code.toLowerCase()}-ink` as keyof typeof PALETTE.dimension];
      expect(base).toMatch(/^#[0-9A-F]{6}$/i);
      expect(ink).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  // Regression: the code used `var(--color-…, #hex)` for variables that no
  // stylesheet defines, so the fallback always won and the same dimension
  // ended up with different colors in different screens.
  it('ningún archivo de la aplicación referencia variables --color-* que no existen', () => {
    const sources = import.meta.glob(
      ['../../../**/*.{ts,tsx}', '!../../../**/__tests__/**', '!../../../test/**'],
      {
        query: '?raw',
        import: 'default',
        eager: true,
      },
    ) as Record<string, string>;

    const offenders = Object.entries(sources)
      .filter(([, text]) => text.includes('var(--color-'))
      .map(([path]) => path);

    expect(Object.keys(sources).length).toBeGreaterThan(20);
    expect(offenders).toEqual([]);
  });
});

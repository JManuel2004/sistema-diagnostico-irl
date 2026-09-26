import { describe, expect, it } from '@jest/globals';
import { CalibrationScale } from '../../../../../src/modules/routing/domain/value-objects/calibration-scale.vo.js';
import { CalibrationNotMonotonicError } from '../../../../../src/modules/routing/domain/exceptions/routing.errors.js';

const VALID = [
  { label: 'primary', value: 1.0, order: 1 },
  { label: 'secondary', value: 0.5, order: 2 },
  { label: 'marginal', value: 0.2, order: 3 },
  { label: 'not_applicable', value: 0.0, order: 4 },
];

describe('CalibrationScale', () => {
  it('acepta una scale estrictamente decreciente', () => {
    const scale = CalibrationScale.create(VALID);
    expect(scale.valueFor('primary')).toBe(1.0);
    expect(scale.valueFor('not_applicable')).toBe(0.0);
  });

  it('acepta los peldaños en cualquier order de entrada y los normaliza', () => {
    const scale = CalibrationScale.create([...VALID].reverse());
    expect(scale.tiers.map((p) => p.label)).toEqual([
      'primary',
      'secondary',
      'marginal',
      'not_applicable',
    ]);
  });

  it('rechaza una scale no monótona', () => {
    // If `secondary` were worth more than `primary`, the whole vocabulary
    // would be silently inverted and every profile built on it would mean
    // the opposite of what it says.
    expect(() =>
      CalibrationScale.create([
        { label: 'primary', value: 0.4, order: 1 },
        { label: 'secondary', value: 0.9, order: 2 },
      ]),
    ).toThrow(CalibrationNotMonotonicError);
  });

  it('rechaza dos peldaños con el mismo value', () => {
    expect(() =>
      CalibrationScale.create([
        { label: 'primary', value: 0.5, order: 1 },
        { label: 'secondary', value: 0.5, order: 2 },
      ]),
    ).toThrow(/no es\s+estrictamente menor/);
  });

  it('rechaza una scale vacía', () => {
    expect(() => CalibrationScale.create([])).toThrow(
      CalibrationNotMonotonicError,
    );
  });

  it('`tiene` permite comprobar pertenencia sin lanzar', () => {
    const scale = CalibrationScale.create(VALID);
    expect(scale.has('marginal')).toBe(true);
    expect(scale.has('critico')).toBe(false);
  });

  it('lanza al pedir una label que no existe, en vez de devolver cero', () => {
    // A silent zero would leave an orphan profile working as if it
    // contributed nothing, and nobody would notice it had been disconnected
    // by a change of calibration.
    const scale = CalibrationScale.create(VALID);
    expect(() => scale.valueFor('critico')).toThrow(/no existe en la escala/);
  });
});

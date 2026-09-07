import { describe, expect, it } from '@jest/globals';
import { EscalaCalibracion } from '../../../../../src/modules/portfolio-routing/domain/value-objects/escala-calibracion.vo.js';
import { CalibrationNotMonotonicError } from '../../../../../src/modules/portfolio-routing/domain/errors/portfolio-routing.errors.js';

const VALIDA = [
  { etiqueta: 'principal', valor: 1.0, orden: 1 },
  { etiqueta: 'secundario', valor: 0.5, orden: 2 },
  { etiqueta: 'marginal', valor: 0.2, orden: 3 },
  { etiqueta: 'no_aplica', valor: 0.0, orden: 4 },
];

describe('EscalaCalibracion', () => {
  it('acepta una escala estrictamente decreciente', () => {
    const escala = EscalaCalibracion.create(VALIDA);
    expect(escala.valorDe('principal')).toBe(1.0);
    expect(escala.valorDe('no_aplica')).toBe(0.0);
  });

  it('acepta los peldaños en cualquier orden de entrada y los normaliza', () => {
    const escala = EscalaCalibracion.create([...VALIDA].reverse());
    expect(escala.peldanos.map((p) => p.etiqueta)).toEqual([
      'principal',
      'secundario',
      'marginal',
      'no_aplica',
    ]);
  });

  it('rechaza una escala no monótona', () => {
    // Si `secundario` valiera más que `principal`, todo el vocabulario
    // quedaría invertido en silencio y cada ficha construida sobre él
    // significaría lo contrario de lo que dice.
    expect(() =>
      EscalaCalibracion.create([
        { etiqueta: 'principal', valor: 0.4, orden: 1 },
        { etiqueta: 'secundario', valor: 0.9, orden: 2 },
      ]),
    ).toThrow(CalibrationNotMonotonicError);
  });

  it('rechaza dos peldaños con el mismo valor', () => {
    expect(() =>
      EscalaCalibracion.create([
        { etiqueta: 'principal', valor: 0.5, orden: 1 },
        { etiqueta: 'secundario', valor: 0.5, orden: 2 },
      ]),
    ).toThrow(/no es\s+estrictamente menor/);
  });

  it('rechaza una escala vacía', () => {
    expect(() => EscalaCalibracion.create([])).toThrow(
      CalibrationNotMonotonicError,
    );
  });

  it('lanza al pedir una etiqueta que no existe, en vez de devolver cero', () => {
    // Un cero silencioso dejaría una ficha huérfana funcionando como si
    // no aportara nada, y nadie se enteraría de que quedó desconectada al
    // republicar la calibración.
    const escala = EscalaCalibracion.create(VALIDA);
    expect(() => escala.valorDe('critico')).toThrow(/no existe en la escala/);
  });
});

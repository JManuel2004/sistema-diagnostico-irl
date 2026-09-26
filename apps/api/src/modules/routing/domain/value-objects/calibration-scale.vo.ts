import { CalibrationNotMonotonicError } from '../exceptions/routing.errors.js';

/**
 * The ordinal scale: the bridge between the vocabulary the business team
 * uses and the numbers the engine multiplies.
 *
 * It exists so that configuring a profile never requires writing a number.
 * Whoever defines the portfolio says a service is `primary` in Business
 * Model; how much `primary` is worth is a separate technical decision that
 * lives here.
 *
 * Monotonicity invariant: the labels sorted by `order` must have strictly
 * decreasing values. If `secondary` were worth more than `primary`, the
 * vocabulary would stop meaning what it says and all the configuration
 * built on it would be silently inverted. It is checked on construction
 * because it is a property of the set and not of a row, so no database
 * constraint can express it.
 */
export interface ScaleTier {
  readonly label: string;
  readonly value: number;
  readonly order: number;
}

export class CalibrationScale {
  private readonly byLabel: ReadonlyMap<string, number>;

  private constructor(public readonly tiers: readonly ScaleTier[]) {
    this.byLabel = new Map(tiers.map((p) => [p.label, p.value]));
  }

  static create(tiers: readonly ScaleTier[]): CalibrationScale {
    if (tiers.length === 0) {
      throw new CalibrationNotMonotonicError(
        'La escala de calibración no puede estar vacía',
      );
    }

    const sorted = [...tiers].sort((a, b) => a.order - b.order);

    for (let i = 1; i < sorted.length; i += 1) {
      const previous = sorted[i - 1];
      const current = sorted[i];
      if (current.value >= previous.value) {
        throw new CalibrationNotMonotonicError(
          `La escala no es monótona: '${current.label}' (${current.value}) no es ` +
            `estrictamente menor que '${previous.label}' (${previous.value})`,
          {
            previousLabel: previous.label,
            previousValue: previous.value,
            currentLabel: current.label,
            currentValue: current.value,
          },
        );
      }
    }

    return new CalibrationScale(sorted);
  }

  /**
   * Numeric value of a label.
   *
   * A missing label is a configuration error, not a zero: if a profile
   * references a step the live scale does not define, a silent calculation
   * would give 0 and nobody would notice the profile had been orphaned by a
   * change of calibration.
   */
  valueFor(label: string): number {
    const value = this.byLabel.get(label);
    if (value === undefined) {
      throw new CalibrationNotMonotonicError(
        `La etiqueta '${label}' no existe en la escala de calibración vigente`,
        { label, available: [...this.byLabel.keys()] },
      );
    }
    return value;
  }

  has(label: string): boolean {
    return this.byLabel.has(label);
  }
}

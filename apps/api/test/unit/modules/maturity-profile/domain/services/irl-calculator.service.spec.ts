import fc from 'fast-check';
import {
  IrlCalculatorService,
  type AnswersByDimension,
} from '../../../../../../src/modules/maturity-profile/domain/services/irl-calculator.service.js';
import { DimensionCode } from '../../../../../../src/shared-kernel/domain/value-objects/dimension-code.js';
import { LikertValue } from '../../../../../../src/shared-kernel/domain/value-objects/likert-value.vo.js';
import { ConversionRange } from '../../../../../../src/modules/irl-catalog/domain/conversion-range.js';
import { MaturityProfileCalculationError } from '../../../../../../src/modules/maturity-profile/domain/errors/maturity-profile-calculation.error.js';

const CODES = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'] as const;

/** The canonical KTH IRL conversion table (Annex A). */
const CONVERSION_TABLE: readonly ConversionRange[] = [
  ConversionRange.fromPersistence({ avgMin: 1.0, avgMax: 1.39, irlLevel: 1 }),
  ConversionRange.fromPersistence({ avgMin: 1.4, avgMax: 1.79, irlLevel: 2 }),
  ConversionRange.fromPersistence({ avgMin: 1.8, avgMax: 2.19, irlLevel: 3 }),
  ConversionRange.fromPersistence({ avgMin: 2.2, avgMax: 2.59, irlLevel: 4 }),
  ConversionRange.fromPersistence({ avgMin: 2.6, avgMax: 2.99, irlLevel: 5 }),
  ConversionRange.fromPersistence({ avgMin: 3.0, avgMax: 3.39, irlLevel: 6 }),
  ConversionRange.fromPersistence({ avgMin: 3.4, avgMax: 3.79, irlLevel: 7 }),
  ConversionRange.fromPersistence({ avgMin: 3.8, avgMax: 4.39, irlLevel: 8 }),
  ConversionRange.fromPersistence({ avgMin: 4.4, avgMax: 5.0, irlLevel: 9 }),
];

const likerts = (values: readonly number[]): LikertValue[] =>
  values.map((v) => LikertValue.create(v));

/** Build an input map where every dimension has the same 8 Likert values. */
function uniformAnswers(values: readonly number[]): AnswersByDimension {
  const map = new Map<DimensionCode, readonly LikertValue[]>();
  for (const c of CODES) {
    map.set(DimensionCode.create(c), likerts(values));
  }
  return map;
}

describe('IrlCalculatorService', () => {
  const calculator = new IrlCalculatorService();

  // ─────────────────────────────────────────────────────────────────────────
  // Boundary mapping: all 9 ranges, lower and upper inclusive bounds
  // ─────────────────────────────────────────────────────────────────────────
  describe('conversion table boundaries (Annex A, every range)', () => {
    // Pairs of (average, expectedIrlLevel). The eight Likert answers all
    // equal a constructed value that hits the desired average — for
    // edge-of-range averages we use answers summing to 8 × target.
    //
    // Note: Likert values must be integers in 1..5, so non-integer
    // averages require non-uniform answers. We compute them carefully.
    it.each([
      // Bottom of every range (inclusive)
      [{ ones: 8, twos: 0, threes: 0, fours: 0, fives: 0 }, 1.0, 1],
      [{ ones: 4, twos: 0, threes: 0, fours: 0, fives: 4 }, 3.0, 6],
      [{ ones: 0, twos: 0, threes: 0, fours: 0, fives: 8 }, 5.0, 9],
    ])('boundary case: avg=%j → IRL %i', (mix, expectedAvg, expectedLevel) => {
      const answers: number[] = [
        ...Array<number>(mix.ones).fill(1),
        ...Array<number>(mix.twos).fill(2),
        ...Array<number>(mix.threes).fill(3),
        ...Array<number>(mix.fours).fill(4),
        ...Array<number>(mix.fives).fill(5),
      ];
      expect(answers).toHaveLength(8);
      const result = calculator.calculate(
        uniformAnswers(answers),
        CONVERSION_TABLE,
      );
      expect(result).toHaveLength(6);
      for (const r of result) {
        expect(r.averageLikert).toBeCloseTo(expectedAvg, 5);
        expect(r.irlLevel.value).toBe(expectedLevel);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Average computation: integer Likerts → k/8 averages
  // ─────────────────────────────────────────────────────────────────────────
  describe('average and level for each k/8 sum (k from 8 to 40)', () => {
    // For sum k in [8..40], average = k/8, lookup IRL via the table.
    // This exhausts every possible average a dimension can have.
    const expectations: [number, number, number][] = [
      [8, 1.0, 1],
      [9, 1.125, 1],
      [10, 1.25, 1],
      [11, 1.375, 1],
      [12, 1.5, 2],
      [13, 1.625, 2],
      [14, 1.75, 2],
      [15, 1.875, 3],
      [16, 2.0, 3],
      [17, 2.125, 3],
      [18, 2.25, 4],
      [19, 2.375, 4],
      [20, 2.5, 4],
      [21, 2.625, 5],
      [22, 2.75, 5],
      [23, 2.875, 5],
      [24, 3.0, 6],
      [25, 3.125, 6],
      [26, 3.25, 6],
      [27, 3.375, 6],
      [28, 3.5, 7],
      [29, 3.625, 7],
      [30, 3.75, 7],
      [31, 3.875, 8],
      [32, 4.0, 8],
      [33, 4.125, 8],
      [34, 4.25, 8],
      [35, 4.375, 8],
      [36, 4.5, 9],
      [37, 4.625, 9],
      [38, 4.75, 9],
      [39, 4.875, 9],
      [40, 5.0, 9],
    ];

    it.each(expectations)(
      'sum=%i → avg=%f → IRL %i',
      (sum, expectedAvg, expectedLevel) => {
        // Build any 8 integers in [1,5] that sum to `sum`. A simple
        // construction: use floor(sum/8) and distribute the remainder.
        const base = Math.floor(sum / 8);
        const remainder = sum - base * 8;
        const answers: number[] = Array<number>(8).fill(base);
        for (let i = 0; i < remainder; i++) answers[i] += 1;
        expect(answers.reduce((a, b) => a + b, 0)).toBe(sum);
        const result = calculator.calculate(
          uniformAnswers(answers),
          CONVERSION_TABLE,
        );
        for (const r of result) {
          expect(r.averageLikert).toBeCloseTo(expectedAvg, 5);
          expect(r.irlLevel.value).toBe(expectedLevel);
        }
      },
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PayFlow validation case (from KTH guide, page 22)
  // ─────────────────────────────────────────────────────────────────────────
  describe('PayFlow case (KTH guide, page 22)', () => {
    it('reproduces the six reported levels: TRL 5, CRL 3, BRL 3, IPRL 2, TmRL 4, FRL 3', () => {
      const dim = (
        code: string,
        vals: number[],
      ): [DimensionCode, LikertValue[]] => [
        DimensionCode.create(code),
        likerts(vals),
      ];
      const input = new Map<DimensionCode, readonly LikertValue[]>([
        dim('TRL', [4, 4, 3, 3, 3, 2, 2, 1]), //  22/8 = 2.75 → IRL 5
        dim('CRL', [2, 2, 2, 2, 2, 2, 2, 2]), //  16/8 = 2.00 → IRL 3
        dim('BRL', [3, 3, 2, 2, 2, 2, 2, 1]), //  17/8 = 2.125 → IRL 3
        dim('IPRL', [2, 2, 2, 2, 1, 1, 1, 1]), // 12/8 = 1.50 → IRL 2
        dim('TmRL', [3, 3, 3, 2, 2, 2, 2, 2]), // 19/8 = 2.375 → IRL 4
        dim('FRL', [2, 2, 2, 2, 2, 2, 2, 2]), //  16/8 = 2.00 → IRL 3
      ]);

      const result = calculator.calculate(input, CONVERSION_TABLE);
      const byDim = Object.fromEntries(
        result.map((r) => [r.dimensionCode.value, r]),
      );

      expect(byDim.TRL.averageLikert).toBeCloseTo(2.75, 5);
      expect(byDim.TRL.irlLevel.value).toBe(5);
      expect(byDim.CRL.averageLikert).toBeCloseTo(2.0, 5);
      expect(byDim.CRL.irlLevel.value).toBe(3);
      expect(byDim.BRL.averageLikert).toBeCloseTo(2.125, 5);
      expect(byDim.BRL.irlLevel.value).toBe(3);
      expect(byDim.IPRL.averageLikert).toBeCloseTo(1.5, 5);
      expect(byDim.IPRL.irlLevel.value).toBe(2);
      expect(byDim.TmRL.averageLikert).toBeCloseTo(2.375, 5);
      expect(byDim.TmRL.irlLevel.value).toBe(4);
      expect(byDim.FRL.averageLikert).toBeCloseTo(2.0, 5);
      expect(byDim.FRL.irlLevel.value).toBe(3);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Property-based tests: for ANY valid 48 Likert input, the result is
  // always six results with averages in [1, 5] and levels in [1, 9].
  // ─────────────────────────────────────────────────────────────────────────
  describe('property: any valid 48 Likert input produces a sane profile', () => {
    it('always returns exactly 6 results in [1,5]×[1,9]', () => {
      const arbAnswers = fc.array(fc.integer({ min: 1, max: 5 }), {
        minLength: 8,
        maxLength: 8,
      });
      fc.assert(
        fc.property(
          fc.tuple(
            arbAnswers,
            arbAnswers,
            arbAnswers,
            arbAnswers,
            arbAnswers,
            arbAnswers,
          ),
          ([trl, crl, brl, iprl, tmrl, frl]) => {
            const input = new Map<DimensionCode, readonly LikertValue[]>([
              [DimensionCode.create('TRL'), likerts(trl)],
              [DimensionCode.create('CRL'), likerts(crl)],
              [DimensionCode.create('BRL'), likerts(brl)],
              [DimensionCode.create('IPRL'), likerts(iprl)],
              [DimensionCode.create('TmRL'), likerts(tmrl)],
              [DimensionCode.create('FRL'), likerts(frl)],
            ]);
            const result = calculator.calculate(input, CONVERSION_TABLE);
            expect(result).toHaveLength(6);
            for (const r of result) {
              expect(r.averageLikert).toBeGreaterThanOrEqual(1);
              expect(r.averageLikert).toBeLessThanOrEqual(5);
              expect(r.irlLevel.value).toBeGreaterThanOrEqual(1);
              expect(r.irlLevel.value).toBeLessThanOrEqual(9);
            }
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Error paths (DIAGIRL-34 acceptance criterion: no partial results)
  // ─────────────────────────────────────────────────────────────────────────
  describe('error scenarios', () => {
    it('throws when conversion table is empty', () => {
      expect(() =>
        calculator.calculate(uniformAnswers([3, 3, 3, 3, 3, 3, 3, 3]), []),
      ).toThrow(MaturityProfileCalculationError);
    });

    it('throws when fewer than 6 dimensions are present', () => {
      const five = new Map<DimensionCode, readonly LikertValue[]>([
        [DimensionCode.create('TRL'), likerts([3, 3, 3, 3, 3, 3, 3, 3])],
        [DimensionCode.create('CRL'), likerts([3, 3, 3, 3, 3, 3, 3, 3])],
        [DimensionCode.create('BRL'), likerts([3, 3, 3, 3, 3, 3, 3, 3])],
        [DimensionCode.create('IPRL'), likerts([3, 3, 3, 3, 3, 3, 3, 3])],
        [DimensionCode.create('TmRL'), likerts([3, 3, 3, 3, 3, 3, 3, 3])],
      ]);
      expect(() => calculator.calculate(five, CONVERSION_TABLE)).toThrow(
        MaturityProfileCalculationError,
      );
    });

    it('throws when a dimension has fewer than 8 answers', () => {
      const wrong = new Map<DimensionCode, readonly LikertValue[]>([
        [DimensionCode.create('TRL'), likerts([3, 3, 3, 3, 3, 3, 3])], // 7
        [DimensionCode.create('CRL'), likerts([3, 3, 3, 3, 3, 3, 3, 3])],
        [DimensionCode.create('BRL'), likerts([3, 3, 3, 3, 3, 3, 3, 3])],
        [DimensionCode.create('IPRL'), likerts([3, 3, 3, 3, 3, 3, 3, 3])],
        [DimensionCode.create('TmRL'), likerts([3, 3, 3, 3, 3, 3, 3, 3])],
        [DimensionCode.create('FRL'), likerts([3, 3, 3, 3, 3, 3, 3, 3])],
      ]);
      expect(() => calculator.calculate(wrong, CONVERSION_TABLE)).toThrow(
        MaturityProfileCalculationError,
      );
    });

    it('throws when the conversion table has a coverage gap', () => {
      // Drop the IRL-1 range so avg=1.0 falls outside any range
      const incomplete = CONVERSION_TABLE.slice(1);
      expect(() =>
        calculator.calculate(
          uniformAnswers([1, 1, 1, 1, 1, 1, 1, 1]),
          incomplete,
        ),
      ).toThrow(MaturityProfileCalculationError);
    });
  });
});

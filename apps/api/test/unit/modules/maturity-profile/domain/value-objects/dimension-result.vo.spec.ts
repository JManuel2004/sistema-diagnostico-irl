import { DimensionResult } from '../../../../../../src/modules/maturity-profile/domain/value-objects/dimension-result.vo.js';
import { DimensionCode } from '../../../../../../src/shared-kernel/domain/value-objects/dimension-code.js';
import { IrlLevel } from '../../../../../../src/shared-kernel/domain/value-objects/irl-level.vo.js';
import { InvariantViolationError } from '../../../../../../src/shared-kernel/domain/errors/invariant-violation.error.js';

describe('DimensionResult (maturity-profile)', () => {
  const trl = DimensionCode.create('TRL');
  const level5 = IrlLevel.create(5);

  describe('factory create', () => {
    it('builds with valid inputs', () => {
      const r = DimensionResult.create({
        dimensionCode: trl,
        averageLikert: 2.75,
        irlLevel: level5,
      });
      expect(r.dimensionCode.value).toBe('TRL');
      expect(r.averageLikert).toBe(2.75);
      expect(r.irlLevel.value).toBe(5);
    });

    it.each([1.0, 1.125, 2.75, 4.5, 5.0])(
      'accepts averageLikert = %f (boundary or k/8 value)',
      (avg) => {
        const r = DimensionResult.create({
          dimensionCode: trl,
          averageLikert: avg,
          irlLevel: level5,
        });
        expect(r.averageLikert).toBe(avg);
      },
    );

    describe('rejects invalid averageLikert', () => {
      it.each([0.99, 5.01, -1, 10, Number.NaN, Number.POSITIVE_INFINITY])(
        'throws InvariantViolationError for %s',
        (avg) => {
          expect(() =>
            DimensionResult.create({
              dimensionCode: trl,
              averageLikert: avg,
              irlLevel: level5,
            }),
          ).toThrow(InvariantViolationError);
        },
      );
    });
  });

  describe('persistence round-trip', () => {
    it('toPersistence + fromPersistence preserve the data', () => {
      const original = DimensionResult.create({
        dimensionCode: trl,
        averageLikert: 2.875,
        irlLevel: IrlLevel.create(5),
      });
      const snapshot = original.toPersistence();
      const restored = DimensionResult.fromPersistence(snapshot);
      expect(restored.equals(original)).toBe(true);
    });

    it('fromPersistence rejects an invalid dimension code', () => {
      expect(() =>
        DimensionResult.fromPersistence({
          dimensionCode: 'XXX',
          averageLikert: 3,
          irlLevel: 5,
        }),
      ).toThrow(InvariantViolationError);
    });

    it('fromPersistence rejects an invalid IRL level', () => {
      expect(() =>
        DimensionResult.fromPersistence({
          dimensionCode: 'TRL',
          averageLikert: 3,
          irlLevel: 10,
        }),
      ).toThrow(InvariantViolationError);
    });
  });

  describe('equality', () => {
    it('two results with identical fields are equal', () => {
      const a = DimensionResult.create({
        dimensionCode: trl,
        averageLikert: 3.0,
        irlLevel: IrlLevel.create(6),
      });
      const b = DimensionResult.create({
        dimensionCode: DimensionCode.create('TRL'),
        averageLikert: 3.0,
        irlLevel: IrlLevel.create(6),
      });
      expect(a.equals(b)).toBe(true);
    });

    it('different dimensions are not equal', () => {
      const a = DimensionResult.create({
        dimensionCode: trl,
        averageLikert: 3.0,
        irlLevel: IrlLevel.create(6),
      });
      const b = DimensionResult.create({
        dimensionCode: DimensionCode.create('CRL'),
        averageLikert: 3.0,
        irlLevel: IrlLevel.create(6),
      });
      expect(a.equals(b)).toBe(false);
    });

    it('different averages are not equal even with same level', () => {
      const a = DimensionResult.create({
        dimensionCode: trl,
        averageLikert: 3.0,
        irlLevel: IrlLevel.create(6),
      });
      const b = DimensionResult.create({
        dimensionCode: trl,
        averageLikert: 3.25,
        irlLevel: IrlLevel.create(6),
      });
      expect(a.equals(b)).toBe(false);
    });
  });
});

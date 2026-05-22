import { DimensionCode } from '../../../../../src/shared-kernel/domain/value-objects/dimension-code.js';
import { InvariantViolationError } from '../../../../../src/shared-kernel/domain/errors/invariant-violation.error.js';

describe('DimensionCode', () => {
  describe('create', () => {
    it.each(['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'])(
      'accepts valid code %s',
      (code) => {
        const dc = DimensionCode.create(code);
        expect(dc.value).toBe(code);
      },
    );

    it.each(['trl', 'xrl', '', 'TRL1', 'TMRL'])(
      'throws for invalid code %s',
      (code) => {
        expect(() => DimensionCode.create(code)).toThrow(InvariantViolationError);
      },
    );
  });

  describe('equals', () => {
    it('returns true for same code', () => {
      expect(DimensionCode.create('TRL').equals(DimensionCode.create('TRL'))).toBe(true);
    });

    it('returns false for different codes', () => {
      expect(DimensionCode.create('TRL').equals(DimensionCode.create('CRL'))).toBe(false);
    });
  });
});

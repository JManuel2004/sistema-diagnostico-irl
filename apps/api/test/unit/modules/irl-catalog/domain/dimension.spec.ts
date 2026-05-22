import { Dimension } from '../../../../../src/modules/irl-catalog/domain/dimension.js';
import { InvariantViolationError } from '../../../../../src/shared-kernel/domain/errors/invariant-violation.error.js';

const VALID_ROW = {
  id: 1,
  code: 'TRL',
  name: 'Technology Readiness Level',
  description: 'Madurez tecnológica de la solución.',
  sequence: 1,
};

describe('Dimension', () => {
  describe('fromPersistence', () => {
    it('creates a valid dimension', () => {
      const dim = Dimension.fromPersistence(VALID_ROW);
      expect(dim.id).toBe(1);
      expect(dim.code.value).toBe('TRL');
      expect(dim.name).toBe(VALID_ROW.name);
      expect(dim.sequence).toBe(1);
    });

    it.each([0, 7, -1, 1.5])('throws for sequence %s', (seq) => {
      expect(() =>
        Dimension.fromPersistence({ ...VALID_ROW, sequence: seq }),
      ).toThrow(InvariantViolationError);
    });

    it('accepts sequence 6 (max)', () => {
      const dim = Dimension.fromPersistence({ ...VALID_ROW, sequence: 6 });
      expect(dim.sequence).toBe(6);
    });

    it('throws for invalid dimension code', () => {
      expect(() =>
        Dimension.fromPersistence({ ...VALID_ROW, code: 'XYZ' }),
      ).toThrow(InvariantViolationError);
    });

    it.each(['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'])(
      'accepts valid code %s',
      (code) => {
        const dim = Dimension.fromPersistence({ ...VALID_ROW, code });
        expect(dim.code.value).toBe(code);
      },
    );
  });
});

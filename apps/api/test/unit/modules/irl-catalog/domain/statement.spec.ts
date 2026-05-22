import { Statement } from '../../../../../src/modules/irl-catalog/domain/statement.js';
import { InvariantViolationError } from '../../../../../src/shared-kernel/domain/errors/invariant-violation.error.js';

const VALID_ROW = {
  id: '1',
  dimensionId: 1,
  dimensionCode: 'TRL',
  sequence: 1,
  text: 'El principio científico ha sido observado.',
};

describe('Statement', () => {
  describe('fromPersistence', () => {
    it('creates a valid statement', () => {
      const stmt = Statement.fromPersistence(VALID_ROW);
      expect(stmt.dimensionCode.value).toBe('TRL');
      expect(stmt.sequence).toBe(1);
      expect(stmt.text).toBe(VALID_ROW.text);
      expect(stmt.id).toBe('1');
    });

    it.each([0, 9, -1, 1.5])('throws for sequence %s', (seq) => {
      expect(() =>
        Statement.fromPersistence({ ...VALID_ROW, sequence: seq }),
      ).toThrow(InvariantViolationError);
    });

    it('throws for empty text', () => {
      expect(() =>
        Statement.fromPersistence({ ...VALID_ROW, text: '' }),
      ).toThrow(InvariantViolationError);
    });

    it('throws for whitespace-only text', () => {
      expect(() =>
        Statement.fromPersistence({ ...VALID_ROW, text: '   ' }),
      ).toThrow(InvariantViolationError);
    });

    it('accepts sequence 8 (max)', () => {
      const stmt = Statement.fromPersistence({ ...VALID_ROW, sequence: 8 });
      expect(stmt.sequence).toBe(8);
    });
  });
});

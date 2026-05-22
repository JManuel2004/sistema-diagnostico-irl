import { Uuid } from '../../../../../src/shared-kernel/domain/value-objects/uuid.vo.js';
import { InvariantViolationError } from '../../../../../src/shared-kernel/domain/errors/invariant-violation.error.js';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('Uuid', () => {
  describe('create', () => {
    it('accepts a valid UUID', () => {
      const uuid = Uuid.create(VALID_UUID);
      expect(uuid.value).toBe(VALID_UUID);
    });

    it.each(['not-a-uuid', '', '1234', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'])(
      'throws for invalid UUID %s',
      (input) => {
        expect(() => Uuid.create(input)).toThrow(InvariantViolationError);
      },
    );
  });

  describe('generate', () => {
    it('produces a valid UUID', () => {
      const uuid = Uuid.generate();
      expect(() => Uuid.create(uuid.value)).not.toThrow();
    });

    it('produces unique values', () => {
      expect(Uuid.generate().value).not.toBe(Uuid.generate().value);
    });
  });

  describe('equals', () => {
    it('returns true for same UUID', () => {
      expect(Uuid.create(VALID_UUID).equals(Uuid.create(VALID_UUID))).toBe(true);
    });

    it('returns false for different UUIDs', () => {
      expect(Uuid.create(VALID_UUID).equals(Uuid.generate())).toBe(false);
    });
  });

  describe('toString', () => {
    it('returns the raw string', () => {
      expect(Uuid.create(VALID_UUID).toString()).toBe(VALID_UUID);
    });
  });
});

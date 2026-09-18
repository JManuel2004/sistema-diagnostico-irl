import { Consent } from '../../../../../../src/modules/initiative/domain/entities/consent.entity.js';
import { Uuid } from '../../../../../../src/shared/kernel/domain/value-objects/uuid.vo.js';
import { InvariantViolationError } from '../../../../../../src/shared/kernel/domain/errors/invariant-violation.error.js';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('Consent', () => {
  describe('accept', () => {
    it('is always accepted=true — there is no decline path to model', () => {
      const consent = Consent.accept({
        id: Uuid.generate(),
        diagnosticId: Uuid.create(DIAGNOSTIC_ID),
        keycloakUserId: 'user-1',
        termsVersion: 'v1',
      });

      expect(consent.accepted).toBe(true);
    });

    it('defaults acceptedAt to now when not given', () => {
      const before = Date.now();
      const consent = Consent.accept({
        id: Uuid.generate(),
        diagnosticId: Uuid.create(DIAGNOSTIC_ID),
        keycloakUserId: 'user-1',
        termsVersion: 'v1',
      });
      const after = Date.now();

      expect(consent.acceptedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(consent.acceptedAt.getTime()).toBeLessThanOrEqual(after);
    });

    it.each(['v1', 'v2', 'v2.1', 'v10.3.2'])(
      'accepts a well-formed terms version %s',
      (termsVersion) => {
        expect(() =>
          Consent.accept({
            id: Uuid.generate(),
            diagnosticId: Uuid.create(DIAGNOSTIC_ID),
            keycloakUserId: 'user-1',
            termsVersion,
          }),
        ).not.toThrow();
      },
    );

    it.each(['1', 'version-1', 'v', 'v1.', ''])(
      'rejects a malformed terms version %s',
      (termsVersion) => {
        expect(() =>
          Consent.accept({
            id: Uuid.generate(),
            diagnosticId: Uuid.create(DIAGNOSTIC_ID),
            keycloakUserId: 'user-1',
            termsVersion,
          }),
        ).toThrow(InvariantViolationError);
      },
    );
  });

  describe('fromPersistence / toPersistence', () => {
    it('round-trips', () => {
      const acceptedAt = new Date('2026-01-01T00:00:00.000Z');
      const row = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
        diagnosticId: DIAGNOSTIC_ID,
        keycloakUserId: 'user-1',
        accepted: true,
        acceptedAt,
        termsVersion: 'v1',
      };

      const consent = Consent.fromPersistence(row);

      expect(consent.toPersistence()).toEqual(row);
    });
  });
});

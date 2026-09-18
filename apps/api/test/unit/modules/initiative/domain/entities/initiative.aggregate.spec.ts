import { Initiative } from '../../../../../../src/modules/initiative/domain/entities/initiative.aggregate.js';
import { Uuid } from '../../../../../../src/shared/kernel/domain/value-objects/uuid.vo.js';
import { InvariantViolationError } from '../../../../../../src/shared/kernel/domain/errors/invariant-violation.error.js';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('Initiative', () => {
  describe('register', () => {
    it('creates an initiative with no characterization yet', () => {
      const initiative = Initiative.register({
        id: Uuid.generate(),
        diagnosticId: Uuid.create(DIAGNOSTIC_ID),
        sectorId: '1',
        name: 'AgroConecta',
        shortDescription: 'Trazabilidad y comercialización de café.',
      });

      expect(initiative.name).toBe('AgroConecta');
      expect(initiative.stageId).toBeNull();
      expect(initiative.teamSize).toBeNull();
      expect(initiative.academicLinkage).toBeNull();
    });

    it('trims name and short description', () => {
      const initiative = Initiative.register({
        id: Uuid.generate(),
        diagnosticId: Uuid.create(DIAGNOSTIC_ID),
        sectorId: '1',
        name: '  AgroConecta  ',
        shortDescription: '  Trazabilidad.  ',
      });

      expect(initiative.name).toBe('AgroConecta');
      expect(initiative.shortDescription).toBe('Trazabilidad.');
    });

    it.each([
      ['too short', 'ab'],
      ['too long', 'x'.repeat(121)],
    ])('rejects a name that is %s', (_label, name) => {
      expect(() =>
        Initiative.register({
          id: Uuid.generate(),
          diagnosticId: Uuid.create(DIAGNOSTIC_ID),
          sectorId: '1',
          name,
          shortDescription: 'Valid description.',
        }),
      ).toThrow(InvariantViolationError);
    });

    it('rejects an empty short description', () => {
      expect(() =>
        Initiative.register({
          id: Uuid.generate(),
          diagnosticId: Uuid.create(DIAGNOSTIC_ID),
          sectorId: '1',
          name: 'AgroConecta',
          shortDescription: '   ',
        }),
      ).toThrow(InvariantViolationError);
    });

    it('rejects a short description over 1000 characters', () => {
      expect(() =>
        Initiative.register({
          id: Uuid.generate(),
          diagnosticId: Uuid.create(DIAGNOSTIC_ID),
          sectorId: '1',
          name: 'AgroConecta',
          shortDescription: 'x'.repeat(1001),
        }),
      ).toThrow(InvariantViolationError);
    });
  });

  describe('fromPersistence / toPersistence', () => {
    it('round-trips including characterization fields', () => {
      const row = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
        diagnosticId: DIAGNOSTIC_ID,
        sectorId: '3',
        name: 'AgroConecta',
        shortDescription: 'Trazabilidad.',
        stageId: '2',
        teamSize: 4,
        academicLinkage: true,
      };

      const initiative = Initiative.fromPersistence(row);

      expect(initiative.toPersistence()).toEqual(row);
    });
  });
});

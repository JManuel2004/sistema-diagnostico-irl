import { Initiative } from '../../../../../../src/modules/initiative/domain/entities/initiative.aggregate.js';
import { Uuid } from '../../../../../../src/shared/kernel/domain/value-objects/uuid.vo.js';
import { InvariantViolationError } from '../../../../../../src/shared/kernel/domain/errors/invariant-violation.error.js';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function input(over: Record<string, unknown> = {}) {
  return {
    id: Uuid.generate(),
    diagnosticId: Uuid.create(DIAGNOSTIC_ID),
    sectorId: '1',
    name: 'AgroConecta',
    productType: 'Aplicación web',
    stageId: '2',
    declaredStage: 'Piloto completado',
    teamSize: 3,
    teamDescription: 'Fundadora, coordinadora y desarrollador externo',
    targetMarket: 'Productores de café del suroccidente',
    currentFunding: 'Ahorros de la fundadora',
    ...over,
  };
}

describe('Initiative', () => {
  describe('register', () => {
    it('creates an initiative with the whole profile', () => {
      const initiative = Initiative.register(input());

      expect(initiative.name).toBe('AgroConecta');
      expect(initiative.productType).toBe('Aplicación web');
      expect(initiative.stageId).toBe('2');
      expect(initiative.declaredStage).toBe('Piloto completado');
      expect(initiative.teamSize).toBe(3);
      expect(initiative.teamDescription).toContain('Fundadora');
      expect(initiative.targetMarket).toContain('café');
      expect(initiative.currentFunding).toBe('Ahorros de la fundadora');
      // Not collected by the registration form.
      expect(initiative.academicLinkage).toBeNull();
    });

    it('trims every text field', () => {
      const initiative = Initiative.register(
        input({ name: '  AgroConecta  ', productType: '  App  ', currentFunding: '  Ahorros  ' }),
      );

      expect(initiative.name).toBe('AgroConecta');
      expect(initiative.productType).toBe('App');
      expect(initiative.currentFunding).toBe('Ahorros');
    });

    it.each([
      ['too short', 'ab'],
      ['too long', 'x'.repeat(121)],
    ])('rejects a name that is %s', (_label, name) => {
      expect(() => Initiative.register(input({ name }))).toThrow(InvariantViolationError);
    });

    it.each(['productType', 'declaredStage', 'teamDescription', 'targetMarket', 'currentFunding'])(
      'requires %s: rejects blank and over 500 characters',
      (field) => {
        expect(() => Initiative.register(input({ [field]: '   ' }))).toThrow(
          InvariantViolationError,
        );
        expect(() => Initiative.register(input({ [field]: 'x'.repeat(501) }))).toThrow(
          InvariantViolationError,
        );
        expect(Initiative.register(input({ [field]: 'x'.repeat(500) }))).toBeDefined();
      },
    );

    it.each([0, -1, 1.5, Number.NaN])('rejects a team size of %s', (teamSize) => {
      expect(() => Initiative.register(input({ teamSize }))).toThrow(InvariantViolationError);
    });
  });

  describe('fromPersistence / toPersistence', () => {
    it('round-trips the whole profile', () => {
      const row = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
        diagnosticId: DIAGNOSTIC_ID,
        sectorId: '3',
        name: 'AgroConecta',
        productType: 'Aplicación web',
        stageId: '2',
        declaredStage: 'Piloto completado',
        teamSize: 4,
        teamDescription: 'Fundadora y equipo',
        academicLinkage: true,
        targetMarket: 'Productores',
        currentFunding: 'Ahorros',
      };

      expect(Initiative.fromPersistence(row).toPersistence()).toEqual(row);
    });
  });
});

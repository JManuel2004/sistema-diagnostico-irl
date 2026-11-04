import { InitiativeProfile } from '../../../../../../src/modules/initiative/domain/entities/initiative-profile.aggregate.js';
import { Uuid } from '../../../../../../src/shared/kernel/domain/value-objects/uuid.vo.js';
import { InvariantViolationError } from '../../../../../../src/shared/kernel/domain/errors/invariant-violation.error.js';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const INITIATIVE_ID = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';

function input(over: Record<string, unknown> = {}) {
  return {
    id: Uuid.generate(),
    initiativeId: Uuid.create(INITIATIVE_ID),
    diagnosticId: Uuid.create(DIAGNOSTIC_ID),
    sectorId: '1',
    sectorIsOther: false,
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

describe('InitiativeProfile', () => {
  describe('register — the sector', () => {
    it('with the «Otro» sector keeps the user’s own sector, trimmed', () => {
      const profile = InitiativeProfile.register(
        input({ sectorIsOther: true, customSector: '  Industria aeroespacial ' }),
      );

      expect(profile.customSector).toBe('Industria aeroespacial');
    });

    it('with the «Otro» sector requires the user’s own sector', () => {
      for (const customSector of [undefined, null, '', '   ']) {
        expect(() =>
          InitiativeProfile.register(input({ sectorIsOther: true, customSector })),
        ).toThrow(InvariantViolationError);
      }
    });

    it('rejects an own sector longer than 120 characters', () => {
      expect(() =>
        InitiativeProfile.register(input({ sectorIsOther: true, customSector: 'x'.repeat(121) })),
      ).toThrow(InvariantViolationError);
    });

    it('with a CIIU section discards any own sector left from «Otro»', () => {
      const profile = InitiativeProfile.register(
        input({ sectorIsOther: false, customSector: 'Nanotecnología' }),
      );

      expect(profile.customSector).toBeNull();
    });
  });

  describe('register', () => {
    it('creates an initiative with the whole profile', () => {
      const initiative = InitiativeProfile.register(input());

      expect(initiative.name).toBe('AgroConecta');
      expect(initiative.productType).toBe('Aplicación web');
      expect(initiative.stageId).toBe('2');
      expect(initiative.declaredStage).toBe('Piloto completado');
      expect(initiative.teamSize).toBe(3);
      expect(initiative.teamDescription).toContain('Fundadora');
      expect(initiative.targetMarket).toContain('café');
      expect(initiative.currentFunding).toBe('Ahorros de la fundadora');
    });

    it('trims every text field', () => {
      const initiative = InitiativeProfile.register(
        input({
          name: '  AgroConecta  ',
          productType: '  App  ',
          currentFunding: '  Ahorros  ',
        }),
      );

      expect(initiative.name).toBe('AgroConecta');
      expect(initiative.productType).toBe('App');
      expect(initiative.currentFunding).toBe('Ahorros');
    });

    it.each([
      ['too short', 'ab'],
      ['too long', 'x'.repeat(121)],
    ])('rejects a name that is %s', (_label, name) => {
      expect(() => InitiativeProfile.register(input({ name }))).toThrow(
        InvariantViolationError,
      );
    });

    it.each([
      'productType',
      'declaredStage',
      'teamDescription',
      'targetMarket',
      'currentFunding',
    ])('requires %s: rejects blank and over 500 characters', (field) => {
      expect(() =>
        InitiativeProfile.register(input({ [field]: '   ' })),
      ).toThrow(InvariantViolationError);
      expect(() =>
        InitiativeProfile.register(input({ [field]: 'x'.repeat(501) })),
      ).toThrow(InvariantViolationError);
      expect(
        InitiativeProfile.register(input({ [field]: 'x'.repeat(500) })),
      ).toBeDefined();
    });

    it.each([0, -1, 1.5, Number.NaN])(
      'rejects a team size of %s',
      (teamSize) => {
        expect(() => InitiativeProfile.register(input({ teamSize }))).toThrow(
          InvariantViolationError,
        );
      },
    );
  });

  describe('fromPersistence / toPersistence', () => {
    it('round-trips the whole profile', () => {
      const row = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
        initiativeId: INITIATIVE_ID,
        diagnosticId: DIAGNOSTIC_ID,
        sectorId: '3',
        customSector: null,
        name: 'AgroConecta',
        productType: 'Aplicación web',
        stageId: '2',
        declaredStage: 'Piloto completado',
        teamSize: 4,
        teamDescription: 'Fundadora y equipo',
        targetMarket: 'Productores',
        currentFunding: 'Ahorros',
        recordedAt: new Date('2026-09-25T00:00:00.000Z'),
      };

      expect(InitiativeProfile.fromPersistence(row).toPersistence()).toEqual(
        row,
      );
    });
  });
});

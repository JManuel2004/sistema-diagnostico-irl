import { Initiative } from '../../../../../../src/modules/initiative/domain/entities/initiative.aggregate.js';

describe('Initiative', () => {
  it('is created with an identity of its own, owned by the user who creates it', () => {
    const initiative = Initiative.create('user-1');

    expect(initiative.id.value).toMatch(/^[0-9a-f-]{36}$/);
    expect(initiative.isOwnedBy('user-1')).toBe(true);
    expect(initiative.isOwnedBy('user-2')).toBe(false);
  });

  it('round-trips its persistence shape', () => {
    const row = {
      id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
      ownerId: 'user-1',
      createdAt: new Date('2026-09-25T00:00:00.000Z'),
    };

    expect(Initiative.fromPersistence(row).toPersistence()).toEqual(row);
  });
});

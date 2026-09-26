import { initiativeSummarySchema } from '@innlab/contracts';
import { CreateInitiativeUseCase } from '../../../../../../src/modules/initiative/application/use-cases/create-initiative.use-case.js';
import { ConflictError } from '../../../../../../src/shared/kernel/domain/errors/conflict.error.js';
import { FakeInitiatives, termsAt } from '../../support/fakes.js';

describe('CreateInitiativeUseCase', () => {
  it('creates the initiative together with the acceptance of the current consent text', async () => {
    const store = new FakeInitiatives();
    const useCase = new CreateInitiativeUseCase(store, termsAt('v1'));

    const result = await useCase.execute({ userId: 'user-1', termsVersion: 'v1' });

    if (!result.ok) throw new Error('expected ok result');
    expect(() => initiativeSummarySchema.parse(result.value)).not.toThrow();
    expect(result.value.consentCurrent).toBe(true);
    expect(store.initiatives).toHaveLength(1);
    expect(store.initiatives[0].isOwnedBy('user-1')).toBe(true);
    expect(store.consents.map((c) => c.termsVersion)).toEqual(['v1']);
  });

  it('refuses a version that is not the current one and stores nothing', async () => {
    const store = new FakeInitiatives();
    const useCase = new CreateInitiativeUseCase(store, termsAt('v2'));

    const result = await useCase.execute({ userId: 'user-1', termsVersion: 'v1' });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(ConflictError);
    expect(store.initiatives).toHaveLength(0);
  });
});

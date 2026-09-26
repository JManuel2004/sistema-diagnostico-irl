import { initiativeSummarySchema } from '@innlab/contracts';
import { ListMyInitiativesUseCase } from '../../../../../../src/modules/initiative/application/use-cases/list-my-initiatives.use-case.js';
import { CreateInitiativeUseCase } from '../../../../../../src/modules/initiative/application/use-cases/create-initiative.use-case.js';
import { CATALOG, FakeInitiatives, FakeProfiles, termsAt } from '../../support/fakes.js';

describe('ListMyInitiativesUseCase', () => {
  it("lists only the user's initiatives, saying whether each consent is current", async () => {
    const store = new FakeInitiatives();
    const create = new CreateInitiativeUseCase(store, termsAt('v1'));
    await create.execute({ userId: 'user-1', termsVersion: 'v1' });
    await create.execute({ userId: 'user-2', termsVersion: 'v1' });

    const current = await new ListMyInitiativesUseCase(
      store,
      new FakeProfiles(),
      store,
      termsAt('v1'),
      CATALOG,
    ).execute('user-1');
    const afterNewText = await new ListMyInitiativesUseCase(
      store,
      new FakeProfiles(),
      store,
      termsAt('v2'),
      CATALOG,
    ).execute('user-1');

    expect(() => initiativeSummarySchema.array().parse(current)).not.toThrow();
    expect(current).toHaveLength(1);
    expect(current[0].consentCurrent).toBe(true);
    expect(current[0].latestProfile).toBeNull();
    expect(afterNewText[0].consentCurrent).toBe(false);
  });
});

import { RecordConsentUseCase } from '../../../../../../src/modules/initiative/application/use-cases/record-consent.use-case.js';
import { CreateInitiativeUseCase } from '../../../../../../src/modules/initiative/application/use-cases/create-initiative.use-case.js';
import { ConflictError } from '../../../../../../src/shared/kernel/domain/errors/conflict.error.js';
import { ForbiddenError } from '../../../../../../src/shared/kernel/domain/errors/forbidden.error.js';
import { NotFoundError } from '../../../../../../src/shared/kernel/domain/errors/not-found.error.js';
import { FakeInitiatives, termsAt } from '../../support/fakes.js';

async function initiativeOf(store: FakeInitiatives, userId: string): Promise<string> {
  const created = await new CreateInitiativeUseCase(store, termsAt('v1')).execute({
    userId,
    termsVersion: 'v1',
  });
  if (!created.ok) throw new Error('expected ok result');
  return created.value.id;
}

describe('RecordConsentUseCase', () => {
  it('adds an acceptance of a new version and keeps the earlier one', async () => {
    const store = new FakeInitiatives();
    const id = await initiativeOf(store, 'user-1');
    const useCase = new RecordConsentUseCase(store, store, termsAt('v2'));

    const result = await useCase.execute({ initiativeId: id, userId: 'user-1', version: 'v2' });

    if (!result.ok) throw new Error('expected ok result');
    expect(result.value).toMatchObject({ initiativeId: id, version: 'v2' });
    expect(store.consents.map((c) => c.termsVersion)).toEqual(['v1', 'v2']);
  });

  it('refuses a version that is not the current one', async () => {
    const store = new FakeInitiatives();
    const id = await initiativeOf(store, 'user-1');
    const useCase = new RecordConsentUseCase(store, store, termsAt('v2'));

    const result = await useCase.execute({ initiativeId: id, userId: 'user-1', version: 'v1' });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(ConflictError);
    expect(store.consents).toHaveLength(1);
  });

  it("answers 404 for a missing initiative and 403 for someone else's, before anything else", async () => {
    const store = new FakeInitiatives();
    const id = await initiativeOf(store, 'user-1');
    const useCase = new RecordConsentUseCase(store, store, termsAt('v1'));

    const missing = await useCase.execute({
      initiativeId: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
      userId: 'user-1',
      version: 'v1',
    });
    const foreign = await useCase.execute({ initiativeId: id, userId: 'user-2', version: 'v1' });

    expect(!missing.ok && missing.error).toBeInstanceOf(NotFoundError);
    expect(!foreign.ok && foreign.error).toBeInstanceOf(ForbiddenError);
    expect(store.consents).toHaveLength(1);
  });
});

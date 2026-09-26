import { jest } from '@jest/globals';
import type { EventPublisher } from '../../../../../../src/shared/kernel/application/ports/event-publisher.port.js';
import { RegisterInitiativeProfileUseCase } from '../../../../../../src/modules/initiative/application/use-cases/register-initiative-profile.use-case.js';
import { CreateInitiativeUseCase } from '../../../../../../src/modules/initiative/application/use-cases/create-initiative.use-case.js';
import type { DiagnosticOwnershipPort } from '../../../../../../src/modules/initiative/domain/repositories/diagnostic-ownership.port.js';
import type { InitiativeRegisteredEvent } from '../../../../../../src/shared/kernel/events/initiative-registered.event.js';
import { ConflictError } from '../../../../../../src/shared/kernel/domain/errors/conflict.error.js';
import { ForbiddenError } from '../../../../../../src/shared/kernel/domain/errors/forbidden.error.js';
import { NotFoundError } from '../../../../../../src/shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../../../src/shared/kernel/domain/result.js';
import { CATALOG, FakeInitiatives, FakeProfiles, termsAt } from '../../support/fakes.js';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function profileOf(initiativeId: string) {
  return {
    diagnosticId: DIAGNOSTIC_ID,
    userId: 'user-1',
    initiativeId,
    sectorId: '1',
    name: 'AgroConecta',
    productType: 'Aplicación web',
    stageId: '2',
    declaredStage: 'Piloto completado',
    teamSize: 3,
    teamDescription: 'Fundadora y equipo',
    academicLinkage: false,
    targetMarket: 'Productores de café',
    currentFunding: 'Ahorros',
  };
}

describe('RegisterInitiativeProfileUseCase', () => {
  let store: FakeInitiatives;
  let profiles: FakeProfiles;
  let publish: jest.Mock<EventPublisher['publish']>;
  let deepAnalysisAccepted: boolean;
  let ownership: DiagnosticOwnershipPort;
  let initiativeId: string;

  const useCase = (currentTerms = 'v1') =>
    new RegisterInitiativeProfileUseCase(
      store,
      profiles,
      CATALOG,
      store,
      termsAt(currentTerms),
      ownership,
      { publish },
    );

  beforeEach(async () => {
    store = new FakeInitiatives();
    profiles = new FakeProfiles();
    publish = jest.fn(() => Promise.resolve());
    deepAnalysisAccepted = false;
    ownership = {
      verify: () => Promise.resolve(Result.ok(undefined)),
      deepAnalysisAccepted: () => Promise.resolve(deepAnalysisAccepted),
    };
    const created = await new CreateInitiativeUseCase(store, termsAt('v1')).execute({
      userId: 'user-1',
      termsVersion: 'v1',
    });
    if (!created.ok) throw new Error('expected ok result');
    initiativeId = created.value.id;
  });

  it('saves the snapshot of the profile and then publishes InitiativeRegisteredEvent', async () => {
    const result = await useCase().execute(profileOf(initiativeId));

    if (!result.ok) throw new Error('expected ok result');
    expect(result.value).toMatchObject({ initiativeId, diagnosticId: DIAGNOSTIC_ID });
    expect(profiles.profiles).toHaveLength(1);
    const [event] = publish.mock.calls[0] as [InitiativeRegisteredEvent];
    expect(event.payload).toEqual({ diagnosticId: DIAGNOSTIC_ID });
  });

  it('refuses the profile while the consent is not accepted at the current version', async () => {
    const result = await useCase('v2').execute(profileOf(initiativeId));

    expect(!result.ok && result.error).toBeInstanceOf(ConflictError);
    expect(profiles.profiles).toHaveLength(0);
    expect(publish).not.toHaveBeenCalled();
  });

  it('freezes the profile once the deep analysis is accepted', async () => {
    deepAnalysisAccepted = true;

    const result = await useCase().execute(profileOf(initiativeId));

    expect(!result.ok && result.error).toBeInstanceOf(ConflictError);
    expect(profiles.profiles).toHaveLength(0);
  });

  it("refuses someone else's initiative and a missing one", async () => {
    const foreign = await useCase().execute({ ...profileOf(initiativeId), userId: 'user-2' });
    const missing = await useCase().execute(profileOf('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'));

    expect(!foreign.ok && foreign.error).toBeInstanceOf(ForbiddenError);
    expect(!missing.ok && missing.error).toBeInstanceOf(NotFoundError);
    expect(profiles.profiles).toHaveLength(0);
  });

  it('checks the diagnostic ownership first', async () => {
    ownership.verify = () => Promise.resolve(Result.err(new NotFoundError('Diagnosis', DIAGNOSTIC_ID)));

    const result = await useCase().execute(profileOf(initiativeId));

    expect(!result.ok && result.error).toBeInstanceOf(NotFoundError);
    expect(profiles.profiles).toHaveLength(0);
  });

  it('replaces the snapshot of the same diagnostic when registered again', async () => {
    await useCase().execute(profileOf(initiativeId));
    await useCase().execute({ ...profileOf(initiativeId), name: 'AgroConecta 2' });

    expect(profiles.profiles.map((p) => p.name)).toEqual(['AgroConecta 2']);
  });
});

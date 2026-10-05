import { jest } from '@jest/globals';
import type { DiagnosticSummary } from '@innlab/contracts';
import { ListMyDiagnosesUseCase } from '../../../../../../src/modules/initiative/application/use-cases/list-my-diagnoses.use-case.js';
import type { UserDiagnosesPort } from '../../../../../../src/modules/initiative/application/ports/user-diagnoses.port.js';
import type { InitiativeProfileRepositoryPort } from '../../../../../../src/modules/initiative/domain/repositories/initiative-profile.repository.port.js';
import type { InitiativeProfile } from '../../../../../../src/modules/initiative/domain/entities/initiative-profile.aggregate.js';

type Summary = Omit<DiagnosticSummary, 'initiativeName'>;

const summary = (id: string): Summary =>
  ({ id, completed: true, globalAverage: 3.5 }) as unknown as Summary;

describe('ListMyDiagnosesUseCase', () => {
  it("names each of the caller's diagnostics by the initiative it was answered for", async () => {
    const listByUser = jest
      .fn<UserDiagnosesPort['listByUser']>()
      .mockResolvedValueOnce([summary('d1'), summary('d2')]);
    const findByDiagnosticId = jest
      .fn<InitiativeProfileRepositoryPort['findByDiagnosticId']>()
      .mockImplementation((id) =>
        Promise.resolve(
          id === 'd1'
            ? ({ name: 'AgroConecta' } as unknown as InitiativeProfile)
            : null,
        ),
      );
    const useCase = new ListMyDiagnosesUseCase({ listByUser }, {
      findByDiagnosticId,
    } as unknown as InitiativeProfileRepositoryPort);

    const result = await useCase.execute('user-1');

    expect(listByUser).toHaveBeenCalledWith('user-1');
    expect(
      result.map((d) => [d.id, d.initiativeName, d.globalAverage]),
    ).toEqual([
      ['d1', 'AgroConecta', 3.5],
      ['d2', null, 3.5],
    ]);
  });
});

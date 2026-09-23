import { jest } from '@jest/globals';
import type { DiagnosticSummary } from '@innlab/contracts';
import { ListMyDiagnosesUseCase } from '../../../../../../src/modules/initiative/application/use-cases/list-my-diagnoses.use-case.js';
import type { UserDiagnosesPort } from '../../../../../../src/modules/initiative/application/ports/user-diagnoses.port.js';

describe('ListMyDiagnosesUseCase', () => {
  it("asks diagnosis/ for the caller's summaries through the port", async () => {
    const summaries = [{ id: 'd1' }] as unknown as DiagnosticSummary[];
    const listByUser = jest
      .fn<UserDiagnosesPort['listByUser']>()
      .mockResolvedValueOnce(summaries);
    const useCase = new ListMyDiagnosesUseCase({ listByUser });

    await expect(useCase.execute('user-1')).resolves.toBe(summaries);
    expect(listByUser).toHaveBeenCalledWith('user-1');
  });
});

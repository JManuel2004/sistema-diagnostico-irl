import { jest } from '@jest/globals';
import { DiagnosisOwnershipAdapter } from '../../../../../src/modules/initiative/infrastructure/diagnosis-ownership.adapter.js';
import type { FindDiagnosisOwnerQuery } from '../../../../../src/modules/diagnosis/application/use-cases/find-diagnosis-owner.query.js';
import type { GetDiagnosisProgressQuery } from '../../../../../src/modules/diagnosis/application/use-cases/get-diagnosis-progress.query.js';
import { ForbiddenError } from '../../../../../src/shared/kernel/domain/errors/forbidden.error.js';
import { NotFoundError } from '../../../../../src/shared/kernel/domain/errors/not-found.error.js';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('DiagnosisOwnershipAdapter', () => {
  let execute: jest.Mock<FindDiagnosisOwnerQuery['execute']>;
  let progress: jest.Mock<GetDiagnosisProgressQuery['execute']>;
  let adapter: DiagnosisOwnershipAdapter;

  beforeEach(() => {
    execute = jest.fn();
    progress = jest.fn();
    adapter = new DiagnosisOwnershipAdapter(
      { execute } as unknown as FindDiagnosisOwnerQuery,
      { execute: progress } as unknown as GetDiagnosisProgressQuery,
    );
  });

  it.each([
    [{ deepAnalysisAccepted: true }, true],
    [{ deepAnalysisAccepted: false }, false],
    [null, false],
  ])('reports whether the deep analysis was accepted (%j → %s)', async (answer, expected) => {
    progress.mockResolvedValueOnce(answer);

    await expect(adapter.deepAnalysisAccepted(DIAGNOSTIC_ID)).resolves.toBe(expected);
  });

  it('succeeds when the diagnostic belongs to the user', async () => {
    execute.mockResolvedValueOnce('user-1');

    const result = await adapter.verify(DIAGNOSTIC_ID, 'user-1');

    expect(result.ok).toBe(true);
    expect(execute).toHaveBeenCalledWith(DIAGNOSTIC_ID);
  });

  it('returns NotFoundError when the diagnostic does not exist', async () => {
    execute.mockResolvedValueOnce(null);

    const result = await adapter.verify(DIAGNOSTIC_ID, 'user-1');

    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('returns ForbiddenError when the diagnostic belongs to another user', async () => {
    execute.mockResolvedValueOnce('someone-else');

    const result = await adapter.verify(DIAGNOSTIC_ID, 'user-1');

    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(ForbiddenError);
  });

  it('rejects a malformed id before asking diagnosis/', async () => {
    await expect(adapter.verify('not-a-uuid', 'user-1')).rejects.toThrow();
    expect(execute).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { questionnaireDraftSchema } from '@innlab/contracts';
import { SaveQuestionnaireDraftUseCase } from '../../../../../../src/modules/diagnosis/application/use-cases/save-questionnaire-draft.use-case.js';
import { GetQuestionnaireDraftQuery } from '../../../../../../src/modules/diagnosis/application/use-cases/get-questionnaire-draft.query.js';
import { Diagnosis } from '../../../../../../src/modules/diagnosis/domain/entities/diagnosis.aggregate.js';
import { QuestionnaireDraft } from '../../../../../../src/modules/diagnosis/domain/entities/questionnaire-draft.aggregate.js';
import type { DiagnosisRepositoryPort } from '../../../../../../src/modules/diagnosis/domain/repositories/diagnosis.repository.port.js';
import type { QuestionnaireDraftRepositoryPort } from '../../../../../../src/modules/diagnosis/domain/repositories/questionnaire-draft.repository.port.js';
import type { StatementCatalogPort } from '../../../../../../src/modules/diagnosis/domain/repositories/statement-catalog.port.js';
import { ConflictError } from '../../../../../../src/shared/kernel/domain/errors/conflict.error.js';
import { InvariantViolationError } from '../../../../../../src/shared/kernel/domain/errors/invariant-violation.error.js';
import { NotFoundError } from '../../../../../../src/shared/kernel/domain/errors/not-found.error.js';

const ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const OWNER = 'user-1';
const SAVED_AT = new Date('2026-10-16T12:00:00.000Z');

function diagnosisIn(state: string): Diagnosis {
  return Diagnosis.fromPersistence({
    id: ID,
    userId: OWNER,
    state,
    frameworkVersionId: 1,
    createdAt: new Date('2026-10-01T10:00:00Z'),
  });
}

describe('Questionnaire draft on the server', () => {
  let diagnoses: jest.Mocked<DiagnosisRepositoryPort>;
  let drafts: jest.Mocked<QuestionnaireDraftRepositoryPort>;
  let save: SaveQuestionnaireDraftUseCase;
  let get: GetQuestionnaireDraftQuery;

  beforeEach(() => {
    diagnoses = {
      findById: jest.fn(() => Promise.resolve(diagnosisIn('WITH_INITIATIVE'))),
      findAllByUserId: jest.fn(),
      deleteIncompleteByUserId: jest.fn(),
      save: jest.fn(() => Promise.resolve(undefined)),
      modify: jest.fn(),
    };
    drafts = {
      findByDiagnosticId: jest.fn((id: string) =>
        Promise.resolve(QuestionnaireDraft.empty(id)),
      ),
      replace: jest.fn((draft: QuestionnaireDraft) =>
        Promise.resolve(
          QuestionnaireDraft.fromPersistence(
            draft.diagnosticId,
            draft.entries(),
            SAVED_AT,
          ),
        ),
      ),
      deleteByDiagnosticId: jest.fn(() => Promise.resolve(undefined)),
    };
    const statements = {
      findStatements: () => Promise.resolve([{ id: '1' }, { id: '2' }]),
    } as unknown as StatementCatalogPort;
    save = new SaveQuestionnaireDraftUseCase(diagnoses, drafts, statements);
    get = new GetQuestionnaireDraftQuery(diagnoses, drafts);
  });

  describe('saving', () => {
    it('replaces the draft and returns it as saved, in the contract shape', async () => {
      const result = await save.execute({
        diagnosticId: ID,
        userId: OWNER,
        entries: [
          { statementId: '1', value: 4, justification: 'Hay clientes piloto' },
          { statementId: '2', value: null, justification: 'Pendiente' },
        ],
      });

      if (!result.ok) throw new Error('expected ok result');
      expect(() => questionnaireDraftSchema.parse(result.value)).not.toThrow();
      expect(result.value.entries).toHaveLength(2);
      expect(result.value.updatedAt).toBe(SAVED_AT.toISOString());
      expect(drafts.replace).toHaveBeenCalledTimes(1);
    });

    it('the first save marks the questionnaire as started', async () => {
      await save.execute({ diagnosticId: ID, userId: OWNER, entries: [] });

      expect(diagnoses.save).toHaveBeenCalledTimes(1);
      expect(diagnoses.save.mock.calls[0][0].state.value).toBe(
        'QUESTIONNAIRE_IN_PROGRESS',
      );
    });

    it('later saves do not touch the diagnostic', async () => {
      diagnoses.findById.mockResolvedValueOnce(
        diagnosisIn('QUESTIONNAIRE_IN_PROGRESS'),
      );

      await save.execute({ diagnosticId: ID, userId: OWNER, entries: [] });

      expect(diagnoses.save).not.toHaveBeenCalled();
    });

    it("answers someone else's diagnostic as missing and saves nothing", async () => {
      const result = await save.execute({
        diagnosticId: ID,
        userId: 'intruder',
        entries: [],
      });

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected err result');
      expect(result.error).toBeInstanceOf(NotFoundError);
      expect(drafts.replace).not.toHaveBeenCalled();
    });

    it.each([
      'STARTED',
      'WITH_CONSENT',
      'PROFILE_GENERATED',
      'DEEP_ANALYSIS_COMPLETE',
    ])('refuses to change the draft in %s (409)', async (state) => {
      diagnoses.findById.mockResolvedValueOnce(diagnosisIn(state));

      const result = await save.execute({
        diagnosticId: ID,
        userId: OWNER,
        entries: [],
      });

      if (result.ok) throw new Error('expected err result');
      expect(result.error).toBeInstanceOf(ConflictError);
      expect(drafts.replace).not.toHaveBeenCalled();
    });

    it("refuses a statement outside the diagnostic's questionnaire (422)", async () => {
      const result = await save.execute({
        diagnosticId: ID,
        userId: OWNER,
        entries: [{ statementId: '999', value: 3, justification: null }],
      });

      if (result.ok) throw new Error('expected err result');
      expect(result.error).toBeInstanceOf(InvariantViolationError);
      expect(drafts.replace).not.toHaveBeenCalled();
    });
  });

  describe('reading', () => {
    it('returns the saved draft to its owner', async () => {
      drafts.findByDiagnosticId.mockResolvedValueOnce(
        QuestionnaireDraft.fromPersistence(
          ID,
          [{ statementId: '1', value: 2, justification: null }],
          SAVED_AT,
        ),
      );

      const result = await get.execute({ diagnosticId: ID, userId: OWNER });

      if (!result.ok) throw new Error('expected ok result');
      expect(result.value).toEqual({
        diagnosticId: ID,
        entries: [{ statementId: '1', value: 2, justification: null }],
        updatedAt: SAVED_AT.toISOString(),
      });
    });

    it('returns an empty draft when nothing was saved', async () => {
      const result = await get.execute({ diagnosticId: ID, userId: OWNER });

      if (!result.ok) throw new Error('expected ok result');
      expect(result.value.entries).toEqual([]);
      expect(result.value.updatedAt).toBeNull();
    });

    it("never shows the draft of someone else's diagnostic", async () => {
      const result = await get.execute({
        diagnosticId: ID,
        userId: 'intruder',
      });

      if (result.ok) throw new Error('expected err result');
      expect(result.error).toBeInstanceOf(NotFoundError);
      expect(drafts.findByDiagnosticId).not.toHaveBeenCalled();
    });
  });
});

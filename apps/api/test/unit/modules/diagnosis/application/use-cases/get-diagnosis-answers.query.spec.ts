import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { diagnosticAnswersSchema } from '@innlab/contracts';
import { GetDiagnosisAnswersQuery } from '../../../../../../src/modules/diagnosis/application/use-cases/get-diagnosis-answers.query.js';
import type { DiagnosisRepositoryPort } from '../../../../../../src/modules/diagnosis/domain/repositories/diagnosis.repository.port.js';
import type { AnswerSheetRepositoryPort } from '../../../../../../src/modules/diagnosis/domain/repositories/answer-sheet.repository.port.js';
import type { TaxonomyRepositoryPort } from '../../../../../../src/shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';
import { Diagnosis } from '../../../../../../src/modules/diagnosis/domain/entities/diagnosis.aggregate.js';
import { AnswerSheet } from '../../../../../../src/modules/diagnosis/domain/entities/answer-sheet.aggregate.js';
import { Statement } from '../../../../../../src/modules/diagnosis/domain/entities/statement.js';
import { Uuid } from '../../../../../../src/shared/kernel/domain/value-objects/uuid.vo.js';
import { NotFoundError } from '../../../../../../src/shared/kernel/domain/errors/not-found.error.js';
import { aDimensionCatalog } from '../../../../support/dimension-catalog.js';

const ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const CODES = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'] as const;

function diagnosis(userId = 'user-1'): Diagnosis {
  return Diagnosis.fromPersistence({
    id: ID,
    userId,
    state: 'DEEP_ANALYSIS_COMPLETE',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    frameworkVersionId: 1,
  });
}

/** The 48 statements, deliberately out of order, as a catalog might return them. */
function statements(): Statement[] {
  return CODES.flatMap((code, d) =>
    Array.from({ length: 8 }, (_, i) =>
      Statement.fromPersistence({
        id: String(d * 8 + i + 1),
        dimensionId: d + 1,
        dimensionCode: code,
        sequence: i + 1,
        text: `Afirmación ${String(i + 1)} de ${code}`,
      }),
    ),
  ).reverse();
}

function sheet(): AnswerSheet {
  return AnswerSheet.fromPersistence(
    Uuid.create(ID),
    Array.from({ length: 48 }, (_, n) => ({
      statementId: String(n + 1),
      value: (n % 5) + 1,
      justification: n === 0 ? 'Tenemos un prototipo validado.' : null,
    })),
  );
}

describe('GetDiagnosisAnswersQuery', () => {
  let findById: jest.Mock<DiagnosisRepositoryPort['findById']>;
  let findSheet: jest.Mock<AnswerSheetRepositoryPort['findByDiagnosticId']>;
  let query: GetDiagnosisAnswersQuery;

  beforeEach(() => {
    findById = jest
      .fn<DiagnosisRepositoryPort['findById']>()
      .mockResolvedValue(diagnosis());
    findSheet = jest
      .fn<AnswerSheetRepositoryPort['findByDiagnosticId']>()
      .mockResolvedValue(sheet());
    query = new GetDiagnosisAnswersQuery(
      { findById } as unknown as DiagnosisRepositoryPort,
      { findByDiagnosticId: findSheet } as unknown as AnswerSheetRepositoryPort,
      {
        findStatements: () => Promise.resolve(statements()),
      },
      {
        findAllDimensions: () => Promise.resolve(aDimensionCatalog().reverse()),
      } as unknown as TaxonomyRepositoryPort,
    );
  });

  it('groups the answers by dimension, in the order of the framework and of each statement', async () => {
    const result = await query.execute({ diagnosticId: ID, userId: 'user-1' });

    if (!result.ok) throw new Error('expected ok result');
    const answers = diagnosticAnswersSchema.parse(result.value);
    expect(answers.dimensions.map((d) => d.dimensionCode)).toEqual([...CODES]);
    expect(answers.dimensions[0]?.name).toBe('Nombre completo TRL');
    expect(answers.dimensions[0]?.answers.map((a) => a.sequence)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
  });

  it('gives each statement the value and the justification the user saved', async () => {
    const result = await query.execute({ diagnosticId: ID, userId: 'user-1' });

    if (!result.ok) throw new Error('expected ok result');
    const first = result.value.dimensions[0]?.answers[0];
    expect(first).toEqual({
      statementId: '1',
      sequence: 1,
      text: 'Afirmación 1 de TRL',
      value: 1,
      justification: 'Tenemos un prototipo validado.',
    });
    expect(result.value.dimensions[0]?.answers[1]?.justification).toBeNull();
  });

  it("answers someone else's diagnostic as missing, and reads no answer", async () => {
    findById.mockResolvedValueOnce(diagnosis('someone-else'));

    const result = await query.execute({ diagnosticId: ID, userId: 'user-1' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
    expect(findSheet).not.toHaveBeenCalled();
  });
});

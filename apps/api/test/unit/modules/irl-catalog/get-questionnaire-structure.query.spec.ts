import { jest } from '@jest/globals';
import { GetQuestionnaireStructureQuery } from '../../../../src/modules/irl-catalog/application/queries/get-questionnaire-structure.query.js';
import type { IrlCatalogRepositoryPort } from '../../../../src/modules/irl-catalog/domain/ports/irl-catalog.repository.port.js';
import { Dimension } from '../../../../src/modules/irl-catalog/domain/dimension.js';
import { Statement } from '../../../../src/modules/irl-catalog/domain/statement.js';

function makeDimension(code: string, sequence: number): Dimension {
  return Dimension.fromPersistence({
    id: sequence,
    code,
    name: `Name ${code}`,
    description: `Desc ${code}`,
    sequence,
  });
}

function makeStatement(
  id: string,
  dimensionCode: string,
  dimensionId: number,
  sequence: number,
): Statement {
  return Statement.fromPersistence({
    id,
    dimensionId,
    dimensionCode,
    sequence,
    text: `Statement ${id}`,
  });
}

const DIMENSION_CODES = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'] as const;

function buildFullCatalog(): {
  dimensions: Dimension[];
  statements: Statement[];
} {
  const dimensions = DIMENSION_CODES.map((code, i) =>
    makeDimension(code, i + 1),
  );
  const statements: Statement[] = [];
  let idCounter = 1;
  DIMENSION_CODES.forEach((code, dimIdx) => {
    for (let seq = 1; seq <= 8; seq++) {
      statements.push(
        makeStatement(String(idCounter++), code, dimIdx + 1, seq),
      );
    }
  });
  return { dimensions, statements };
}

describe('GetQuestionnaireStructureQuery', () => {
  let query: GetQuestionnaireStructureQuery;
  let repository: jest.Mocked<IrlCatalogRepositoryPort>;

  beforeEach(() => {
    repository = {
      findAllDimensions: jest.fn(),
      findAllStatements: jest.fn(),
      findStatementsByDimensionCode: jest.fn(),
      findAllConversionRanges: jest.fn(),
      findAllDimensionPairs: jest.fn(),
    };

    query = new GetQuestionnaireStructureQuery(repository);
  });

  it('returns KTH-IRL-1.0 as versionMarco', async () => {
    const { dimensions, statements } = buildFullCatalog();
    repository.findAllDimensions.mockResolvedValue(dimensions);
    repository.findAllStatements.mockResolvedValue(statements);

    const result = await query.execute();

    expect(result.versionMarco).toBe('KTH-IRL-1.0');
  });

  it('returns exactly 6 dimensions', async () => {
    const { dimensions, statements } = buildFullCatalog();
    repository.findAllDimensions.mockResolvedValue(dimensions);
    repository.findAllStatements.mockResolvedValue(statements);

    const result = await query.execute();

    expect(result.dimensions).toHaveLength(6);
  });

  it('each dimension has exactly 8 statements', async () => {
    const { dimensions, statements } = buildFullCatalog();
    repository.findAllDimensions.mockResolvedValue(dimensions);
    repository.findAllStatements.mockResolvedValue(statements);

    const result = await query.execute();

    for (const dim of result.dimensions) {
      expect(dim.statements).toHaveLength(8);
    }
  });

  it('groups statements under their correct dimension', async () => {
    const { dimensions, statements } = buildFullCatalog();
    repository.findAllDimensions.mockResolvedValue(dimensions);
    repository.findAllStatements.mockResolvedValue(statements);

    const result = await query.execute();

    for (const dim of result.dimensions) {
      for (const s of dim.statements) {
        expect(s.dimensionCode).toBe(dim.code);
      }
    }
  });

  it('fetches dimensions and statements in parallel (both called once)', async () => {
    const { dimensions, statements } = buildFullCatalog();
    repository.findAllDimensions.mockResolvedValue(dimensions);
    repository.findAllStatements.mockResolvedValue(statements);

    await query.execute();

    expect(repository.findAllDimensions.mock.calls).toHaveLength(1);
    expect(repository.findAllStatements.mock.calls).toHaveLength(1);
  });

  it('maps dimension fields correctly', async () => {
    const { dimensions, statements } = buildFullCatalog();
    repository.findAllDimensions.mockResolvedValue(dimensions);
    repository.findAllStatements.mockResolvedValue(statements);

    const result = await query.execute();
    const trl = result.dimensions.find((d) => d.code === 'TRL');

    expect(trl).toBeDefined();
    expect(trl!.name).toBe('Name TRL');
    expect(trl!.description).toBe('Desc TRL');
    expect(trl!.sequence).toBe(1);
  });

  it('maps statement fields correctly', async () => {
    const { dimensions, statements } = buildFullCatalog();
    repository.findAllDimensions.mockResolvedValue(dimensions);
    repository.findAllStatements.mockResolvedValue(statements);

    const result = await query.execute();
    const firstTrlStatement = result.dimensions.find((d) => d.code === 'TRL')!
      .statements[0];

    expect(firstTrlStatement).toMatchObject({
      id: '1',
      dimensionCode: 'TRL',
      sequence: 1,
      text: 'Statement 1',
    });
  });
});

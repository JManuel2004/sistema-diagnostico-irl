import { jest } from '@jest/globals';
import { GetQuestionnaireStructureQuery } from '../../../../../../src/modules/diagnosis/application/use-cases/get-questionnaire-structure.query.js';
import type { TaxonomyRepositoryPort } from '../../../../../../src/shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';
import type { StatementCatalogPort } from '../../../../../../src/modules/diagnosis/domain/repositories/statement-catalog.port.js';
import { Dimension } from '../../../../../../src/shared/irl-taxonomy/domain/entities/dimension.js';
import { Statement } from '../../../../../../src/modules/diagnosis/domain/entities/statement.js';
import { FRAMEWORK_VERSION } from '../../support/framework-taxonomy.js';

function makeDimension(code: string, sequence: number): Dimension {
  return Dimension.fromPersistence({
    id: sequence,
    code,
    name: `Name ${code}`,
    shortName: `Short ${code}`,
    description: `Desc ${code}`,
    sequence,
    minimumExpectedLevel: 4,
    isCriticalDimension: false,
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

function unwrap<T>(
  result: { ok: true; value: T } | { ok: false; error: unknown },
): T {
  if (!result.ok) throw new Error('expected ok result');
  return result.value;
}

describe('GetQuestionnaireStructureQuery', () => {
  let query: GetQuestionnaireStructureQuery;
  let taxonomy: jest.Mocked<TaxonomyRepositoryPort>;
  let statementCatalog: jest.Mocked<StatementCatalogPort>;

  beforeEach(() => {
    taxonomy = {
      findAllDimensions: jest.fn(),
      findCurrentFrameworkVersion: jest.fn(() =>
        Promise.resolve(FRAMEWORK_VERSION),
      ),
      findFrameworkVersionById: jest.fn(),
      findFrameworkVersionByCode: jest.fn((code: string) =>
        Promise.resolve(
          code === FRAMEWORK_VERSION.code ? FRAMEWORK_VERSION : null,
        ),
      ),
      findConversionRanges: jest.fn(),
      findLevelDescriptions: jest.fn(),
      findAllDimensionPairs: jest.fn(),
    };
    statementCatalog = {
      findStatements: jest.fn(),
    };

    query = new GetQuestionnaireStructureQuery(taxonomy, statementCatalog);
  });

  it('reads the statements of the requested framework version', async () => {
    const { dimensions, statements } = buildFullCatalog();
    taxonomy.findAllDimensions.mockResolvedValue(dimensions);
    statementCatalog.findStatements.mockResolvedValue(statements);

    const result = unwrap(await query.execute('KTH-IRL-1.0'));

    expect(result.frameworkVersion).toBe('KTH-IRL-1.0');
    expect(statementCatalog.findStatements).toHaveBeenCalledWith(
      FRAMEWORK_VERSION.id,
    );
  });

  it('answers NotFoundError for an unknown framework version', async () => {
    const result = await query.execute('KTH-IRL-9.9');

    expect(result.ok).toBe(false);
  });

  it('returns the current version when none is requested', async () => {
    const { dimensions, statements } = buildFullCatalog();
    taxonomy.findAllDimensions.mockResolvedValue(dimensions);
    statementCatalog.findStatements.mockResolvedValue(statements);

    const result = unwrap(await query.execute());

    expect(result.frameworkVersion).toBe('KTH-IRL-1.0');
  });

  it('returns exactly 6 dimensions', async () => {
    const { dimensions, statements } = buildFullCatalog();
    taxonomy.findAllDimensions.mockResolvedValue(dimensions);
    statementCatalog.findStatements.mockResolvedValue(statements);

    const result = unwrap(await query.execute());

    expect(result.dimensions).toHaveLength(6);
  });

  it('each dimension has exactly 8 statements', async () => {
    const { dimensions, statements } = buildFullCatalog();
    taxonomy.findAllDimensions.mockResolvedValue(dimensions);
    statementCatalog.findStatements.mockResolvedValue(statements);

    const result = unwrap(await query.execute());

    for (const dim of result.dimensions) {
      expect(dim.statements).toHaveLength(8);
    }
  });

  it('groups statements under their correct dimension', async () => {
    const { dimensions, statements } = buildFullCatalog();
    taxonomy.findAllDimensions.mockResolvedValue(dimensions);
    statementCatalog.findStatements.mockResolvedValue(statements);

    const result = unwrap(await query.execute());

    for (const dim of result.dimensions) {
      for (const s of dim.statements) {
        expect(s.dimensionCode).toBe(dim.code);
      }
    }
  });

  it('fetches dimensions and statements in parallel (both called once)', async () => {
    const { dimensions, statements } = buildFullCatalog();
    taxonomy.findAllDimensions.mockResolvedValue(dimensions);
    statementCatalog.findStatements.mockResolvedValue(statements);

    await query.execute();

    expect(taxonomy.findAllDimensions.mock.calls).toHaveLength(1);
    expect(statementCatalog.findStatements.mock.calls).toHaveLength(1);
  });

  it('maps dimension fields correctly', async () => {
    const { dimensions, statements } = buildFullCatalog();
    taxonomy.findAllDimensions.mockResolvedValue(dimensions);
    statementCatalog.findStatements.mockResolvedValue(statements);

    const result = unwrap(await query.execute());
    const trl = result.dimensions.find((d) => d.code === 'TRL');

    expect(trl).toBeDefined();
    expect(trl!.name).toBe('Name TRL');
    expect(trl!.description).toBe('Desc TRL');
    expect(trl!.sequence).toBe(1);
  });

  it('maps statement fields correctly', async () => {
    const { dimensions, statements } = buildFullCatalog();
    taxonomy.findAllDimensions.mockResolvedValue(dimensions);
    statementCatalog.findStatements.mockResolvedValue(statements);

    const result = unwrap(await query.execute());
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

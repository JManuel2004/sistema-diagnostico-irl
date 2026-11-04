import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The initial schema stays one file. Production already applied it, so a
 * later change cannot be edited into that file: TypeORM would not run it
 * again. The sector catalog columns and the questionnaire draft table are
 * the incremental migrations. Any other file still fails this test.
 */
describe('migration policy', () => {
  it('allows only the initial schema and the incremental migrations', () => {
    const dir = join(
      process.cwd(),
      'src/shared/kernel/infrastructure/database/migrations',
    );

    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.ts'))
      .sort();

    expect(files).toEqual([
      '20260518001-InitialSchema.ts',
      '20261103001-SectorCatalogColumns.ts',
      '20261103002-DraftAnswer.ts',
    ]);
  });
});

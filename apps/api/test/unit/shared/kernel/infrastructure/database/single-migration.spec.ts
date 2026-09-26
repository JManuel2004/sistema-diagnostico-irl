import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guard for the single-migration policy: while no
 * environment holds real data, the schema lives in ONE migration and every
 * change is made by editing it, not by adding a file.
 *
 * If this test fails because a second migration appeared, either fold the
 * change into `20260518001-InitialSchema.ts`, or — only once an environment
 * with real data exists and incremental migrations become the rule — delete
 * this test together with that decision.
 */
describe('migration policy', () => {
  it('keeps the whole schema in the single initial migration', () => {
    const dir = join(
      process.cwd(),
      'src/shared/kernel/infrastructure/database/migrations',
    );

    const files = readdirSync(dir).filter((f) => f.endsWith('.ts'));

    expect(files).toEqual(['20260518001-InitialSchema.ts']);
  });
});

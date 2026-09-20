import { DataSource, type ObjectLiteral, type Repository } from 'typeorm';
import { upsertColumns } from '../../../../../../src/shared/kernel/infrastructure/database/upsert-columns.js';
import { DimensionResultOrm } from '../../../../../../src/modules/diagnosis/infrastructure/database/orm-entities/dimension-result.orm-entity.js';
import { ImbalanceAnalysisOrm } from '../../../../../../src/modules/diagnosis/infrastructure/database/orm-entities/imbalance-analysis.orm-entity.js';

/**
 * Builds TypeORM's entity metadata without opening a connection, so the
 * derived column lists are checked against the real entity definitions.
 * `buildMetadatas` is protected in the typings; it is the step
 * `initialize()` runs before connecting.
 */
async function repositoryOf<T extends ObjectLiteral>(
  entity: new () => T,
): Promise<Repository<T>> {
  const dataSource = new DataSource({
    type: 'postgres',
    entities: [DimensionResultOrm, ImbalanceAnalysisOrm],
  });
  await (
    dataSource as unknown as { buildMetadatas(): Promise<void> }
  ).buildMetadatas();
  return dataSource.getRepository(entity);
}

describe('upsertColumns', () => {
  // Backlog 5.4: a hand-written list left a column out and it was never
  // updated. Deriving the list from the entity includes every one.
  it('includes every non-key column of dimension_result', async () => {
    const repo = await repositoryOf(DimensionResultOrm);

    expect(
      upsertColumns(repo, ['id_diagnostic', 'id_dimension']).sort(),
    ).toEqual(
      [
        'computed_at',
        'in_critical_state',
        'irl_level',
        'likert_average',
      ].sort(),
    );
  });

  it('derives the imbalance_analysis columns', async () => {
    const repo = await repositoryOf(ImbalanceAnalysisOrm);

    expect(upsertColumns(repo, ['id_diagnostic', 'id_pair']).sort()).toEqual([
      'classification',
      'level_difference',
    ]);
  });

  it('never updates the primary key or the conflict target', async () => {
    const repo = await repositoryOf(DimensionResultOrm);

    const columns = upsertColumns(repo, ['id_diagnostic', 'id_dimension']);

    expect(columns).not.toContain('id');
    expect(columns).not.toContain('id_diagnostic');
    expect(columns).not.toContain('id_dimension');
  });

  it('rejects a conflict column that is not in the entity (schema drift)', async () => {
    const repo = await repositoryOf(DimensionResultOrm);

    expect(() =>
      upsertColumns(repo, ['id_diagnostico', 'id_dimension']),
    ).toThrow(/id_diagnostico/);
  });
});

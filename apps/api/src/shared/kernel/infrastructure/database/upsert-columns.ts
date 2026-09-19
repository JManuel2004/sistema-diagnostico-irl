import type { ObjectLiteral, Repository } from 'typeorm';

/**
 * The columns an `INSERT … ON CONFLICT DO UPDATE` should overwrite,
 * derived from the entity's own definition.
 *
 * Every column of the entity except the ones that must not change on
 * conflict: the conflict target itself, the primary key / generated
 * columns, and the create-date column.
 *
 * Why not list them by hand, as `.orUpdate([...])` asks: a hand-written
 * list has nothing to keep it complete. `dimension_result.is_bottleneck`
 * was left out of one and silently never updated (backlog 5.4). Deriving
 * the list makes a new column part of the upsert the moment it is added to
 * the entity.
 *
 * Also checks the conflict target against the entity, so a column name that
 * drifted from the schema (a `id_diagnostico` that became `id_diagnostic`)
 * fails here with a clear message instead of as a database error.
 *
 * @param conflictColumns database column names of the unique constraint
 *   the upsert conflicts on.
 */
export function upsertColumns<T extends ObjectLiteral>(
  repository: Repository<T>,
  conflictColumns: readonly string[],
): string[] {
  const columns = repository.metadata.columns;
  const known = new Set(columns.map((c) => c.databaseName));

  for (const name of conflictColumns) {
    if (!known.has(name)) {
      throw new Error(
        `Conflict column '${name}' is not a column of ${repository.metadata.name}`,
      );
    }
  }

  const conflict = new Set(conflictColumns);
  return columns
    .filter(
      (c) =>
        !c.isPrimary &&
        !c.isGenerated &&
        !c.isCreateDate &&
        !conflict.has(c.databaseName),
    )
    .map((c) => c.databaseName);
}

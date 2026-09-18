import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Retires `dimension_dependency.is_active` (backlog 5.6).
 *
 * `is_active` let an edge be switched off without deleting it — a
 * mechanism built for a configuration cycle that would publish new
 * graph revisions over time. That actor does not exist: nothing in the
 * system can toggle an edge, so every row has stayed `true` since the
 * seed. Same retirement as `routing/`'s configuration versioning
 * scheme (migration 20260518021), applied here to the one leftover
 * column of the sibling module.
 *
 * `down()` restores the column as `NOT NULL DEFAULT true`, which puts
 * every existing row back at the only value they have ever had.
 */
export class RetireRoadmapDependencyActive1747526400022
  implements MigrationInterface
{
  name = 'RetireRoadmapDependencyActive1747526400022';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE irl_catalog.dimension_dependency
        DROP COLUMN is_active
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE irl_catalog.dimension_dependency
        ADD COLUMN is_active boolean NOT NULL DEFAULT true
    `);
  }
}

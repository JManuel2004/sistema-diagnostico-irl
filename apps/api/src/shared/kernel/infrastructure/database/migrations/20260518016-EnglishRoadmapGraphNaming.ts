import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Renames the scaling-roadmap-owned dependency-graph table and columns
 * from Spanish to English identifiers, plus the one column this module
 * added to `irl_catalog.dimension` in migration 012.
 *
 * `activa` is translated, not removed. Retiring the enable/disable
 * mechanism built for a configuration cycle that has no actor yet is a
 * structural decision, separate from this rename.
 */
export class EnglishRoadmapGraphNaming1747526400016
  implements MigrationInterface
{
  name = 'EnglishRoadmapGraphNaming1747526400016';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── irl_catalog.dimension.nivel_minimo_esperado ──────────────────────
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME CONSTRAINT ck_dimension_nivel_minimo TO ck_dimension_minimum_level`,
    );

    // ── irl_catalog.dependencia_dimension -> dimension_dependency ────────
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dependencia_dimension RENAME TO dimension_dependency`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_dependency RENAME COLUMN id_dependencia TO id`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_dependency RENAME COLUMN id_dimension_origen TO id_dimension_source`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_dependency RENAME COLUMN id_dimension_destino TO id_dimension_target`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_dependency RENAME COLUMN nivel_minimo_requerido TO minimum_required_level`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_dependency RENAME COLUMN activa TO is_active`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_dependency RENAME CONSTRAINT uq_dependencia_par TO uq_dimension_dependency_pair`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_dependency RENAME CONSTRAINT ck_dependencia_no_reflexiva TO ck_dimension_dependency_not_reflexive`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_dependency RENAME CONSTRAINT ck_dependencia_nivel_requerido TO ck_dimension_dependency_required_level`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_dependency RENAME CONSTRAINT fk_dependencia_origen TO fk_dimension_dependency_source`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_dependency RENAME CONSTRAINT fk_dependencia_destino TO fk_dimension_dependency_target`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_dependency RENAME CONSTRAINT fk_dimension_dependency_target TO fk_dependencia_destino`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_dependency RENAME CONSTRAINT fk_dimension_dependency_source TO fk_dependencia_origen`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_dependency RENAME CONSTRAINT ck_dimension_dependency_required_level TO ck_dependencia_nivel_requerido`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_dependency RENAME CONSTRAINT ck_dimension_dependency_not_reflexive TO ck_dependencia_no_reflexiva`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_dependency RENAME CONSTRAINT uq_dimension_dependency_pair TO uq_dependencia_par`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_dependency RENAME COLUMN is_active TO activa`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_dependency RENAME COLUMN minimum_required_level TO nivel_minimo_requerido`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_dependency RENAME COLUMN id_dimension_target TO id_dimension_destino`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_dependency RENAME COLUMN id_dimension_source TO id_dimension_origen`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_dependency RENAME COLUMN id TO id_dependencia`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_dependency RENAME TO dependencia_dimension`,
    );

    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME CONSTRAINT ck_dimension_minimum_level TO ck_dimension_nivel_minimo`,
    );
  }
}

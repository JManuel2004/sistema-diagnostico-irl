import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the two remaining catalog tables:
 *   - `rango_conversion` — SA-06 Likert-average → IRL-level mapping
 *     (not in MR diagram; kept as a DB-backed lookup so the seed is the
 *     single source of truth for the nine conversion bands)
 *   - `par_dimension`    — the six imbalance pairs (RF-10)
 *
 * `par_dimension` links two `dimension` rows via integer FKs and stores
 * a human-readable `codigo_par` (e.g. 'TRL-CRL'), matching the MR diagram.
 */
export class CatalogConversionAndPairs1747526400002 implements MigrationInterface {
  name = 'CatalogConversionAndPairs1747526400002';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── irl_catalog.rango_conversion ─────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_catalog.rango_conversion (
        nivel_irl       smallint      PRIMARY KEY,
        avg_min         numeric(3,2)  NOT NULL,
        avg_max         numeric(3,2)  NOT NULL,
        CONSTRAINT ck_rango_conversion_nivel CHECK (nivel_irl BETWEEN 1 AND 9),
        CONSTRAINT ck_rango_conversion_bounds CHECK (
          avg_min BETWEEN 1 AND 5
          AND avg_max BETWEEN 1 AND 5
          AND avg_min <= avg_max
        )
      )
    `);

    // ── irl_catalog.par_dimension ────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_catalog.par_dimension (
        id_par          integer       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_dimension_a  integer       NOT NULL,
        id_dimension_b  integer       NOT NULL,
        codigo_par      varchar(16)   NOT NULL,
        CONSTRAINT uq_par_codigo  UNIQUE (codigo_par),
        CONSTRAINT uq_par_dims    UNIQUE (id_dimension_a, id_dimension_b),
        CONSTRAINT ck_par_dims    CHECK  (id_dimension_a <> id_dimension_b),
        CONSTRAINT fk_par_dim_a   FOREIGN KEY (id_dimension_a)
          REFERENCES irl_catalog.dimension (id_dimension),
        CONSTRAINT fk_par_dim_b   FOREIGN KEY (id_dimension_b)
          REFERENCES irl_catalog.dimension (id_dimension)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS irl_catalog.par_dimension`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_catalog.rango_conversion`,
    );
  }
}

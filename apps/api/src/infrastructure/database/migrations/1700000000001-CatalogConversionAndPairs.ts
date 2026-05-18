import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the two remaining catalog tables referenced by PROJECT-SUMMARY
 * §1.8: `rango_conversion` (SA-06 mapping) and `par_dimension` (the
 * six imbalance pairs).
 *
 * Both tables are populated by their own seeds:
 *   - `003-conversion-ranges.seed.ts`
 *   - `004-dimension-pairs.seed.ts`
 *
 * They are not required by any of the three Stage-1 target stories
 * (HU-07, HU-08, HU-09); they are created here so the `irl-catalog`
 * module's ORM entities resolve at boot and so the maturity-profile
 * module (deferred) can land later without another schema-only PR.
 */
export class CatalogConversionAndPairs1700000000001 implements MigrationInterface {
  name = 'CatalogConversionAndPairs1700000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── irl_catalog.rango_conversion ─────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_catalog.rango_conversion (
        nivel_irl       smallint    PRIMARY KEY,
        avg_min         numeric(3,2) NOT NULL,
        avg_max         numeric(3,2) NOT NULL,
        version_marco   text        NOT NULL DEFAULT 'KTH-IRL-1.0',
        CONSTRAINT ck_rango_conversion_nivel CHECK (nivel_irl BETWEEN 1 AND 9),
        CONSTRAINT ck_rango_conversion_bounds CHECK (avg_min BETWEEN 1 AND 5
                                                  AND avg_max BETWEEN 1 AND 5
                                                  AND avg_min <= avg_max)
      )
    `);

    // ── irl_catalog.par_dimension ────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_catalog.par_dimension (
        id_par          uuid        PRIMARY KEY,
        codigo_izq      text        NOT NULL,
        codigo_der      text        NOT NULL,
        version_marco   text        NOT NULL DEFAULT 'KTH-IRL-1.0',
        CONSTRAINT ck_par_dimension_codigos CHECK (codigo_izq <> codigo_der),
        CONSTRAINT uq_par_dimension UNIQUE (codigo_izq, codigo_der, version_marco)
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

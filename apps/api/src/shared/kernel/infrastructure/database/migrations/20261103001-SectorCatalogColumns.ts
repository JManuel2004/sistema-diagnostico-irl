import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The sector catalog gained its CIIU columns by editing the initial
 * migration. A database that had already applied that migration kept the
 * old `sector` table, and reading a report then failed. This adds the
 * columns in place. Existing sectors stay; the seed fills the new ones.
 */
export class SectorCatalogColumns1793664000001 implements MigrationInterface {
  name = 'SectorCatalogColumns1793664000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE irl_catalog.sector ALTER COLUMN name TYPE character varying(200)`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.sector ADD COLUMN IF NOT EXISTS code character varying(4)`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.sector ADD COLUMN IF NOT EXISTS classification character varying(40) NOT NULL DEFAULT 'CIIU Rev. 5 A.C.'`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.sector ADD COLUMN IF NOT EXISTS is_other boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.sector ADD COLUMN IF NOT EXISTS description character varying(160) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.sector ADD COLUMN IF NOT EXISTS keywords text[] NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.sector DROP CONSTRAINT IF EXISTS uq_sector_code`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.sector ADD CONSTRAINT uq_sector_code UNIQUE (code)`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.sector DROP CONSTRAINT IF EXISTS ck_sector_other_without_code`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.sector ADD CONSTRAINT ck_sector_other_without_code CHECK (NOT is_other OR code IS NULL)`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative_profile ADD COLUMN IF NOT EXISTS custom_sector character varying(120)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative_profile DROP COLUMN IF EXISTS custom_sector`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.sector DROP CONSTRAINT IF EXISTS ck_sector_other_without_code`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.sector DROP CONSTRAINT IF EXISTS uq_sector_code`,
    );
    await queryRunner.query(`ALTER TABLE irl_catalog.sector DROP COLUMN IF EXISTS keywords`);
    await queryRunner.query(`ALTER TABLE irl_catalog.sector DROP COLUMN IF EXISTS description`);
    await queryRunner.query(`ALTER TABLE irl_catalog.sector DROP COLUMN IF EXISTS is_other`);
    await queryRunner.query(
      `ALTER TABLE irl_catalog.sector DROP COLUMN IF EXISTS classification`,
    );
    await queryRunner.query(`ALTER TABLE irl_catalog.sector DROP COLUMN IF EXISTS code`);
    await queryRunner.query(
      `ALTER TABLE irl_catalog.sector ALTER COLUMN name TYPE character varying(120)`,
    );
  }
}

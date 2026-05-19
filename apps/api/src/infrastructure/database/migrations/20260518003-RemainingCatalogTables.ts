import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the four remaining catalog tables from the MR diagram:
 *   - `texto_roadmap`      — roadmap guidance text per dimension per IRL level
 *   - `sector`             — sector reference data for initiatives
 *   - `servicio_portafolio`— InnLab services that can be recommended
 *   - `regla_enrutamiento` — routing rules that map conditions to services
 *
 * All tables live in `irl_catalog` (read-only at runtime; populated by seeds).
 * `regla_enrutamiento` depends on `servicio_portafolio`, so it is created last.
 */
export class RemainingCatalogTables1747526400003 implements MigrationInterface {
  name = 'RemainingCatalogTables1747526400003';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── irl_catalog.texto_roadmap ────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_catalog.texto_roadmap (
        id_texto_roadmap  bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_dimension      integer       NOT NULL,
        nivel_irl         integer       NOT NULL,
        texto_orientacion varchar(1000) NOT NULL,
        CONSTRAINT uq_roadmap_dim_nivel UNIQUE (id_dimension, nivel_irl),
        CONSTRAINT ck_roadmap_nivel     CHECK  (nivel_irl BETWEEN 1 AND 9),
        CONSTRAINT fk_roadmap_dimension FOREIGN KEY (id_dimension)
          REFERENCES irl_catalog.dimension (id_dimension)
      )
    `);

    // ── irl_catalog.sector ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_catalog.sector (
        id_sector   bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        nombre      varchar(120)  NOT NULL,
        activo      boolean       NOT NULL DEFAULT true,
        CONSTRAINT uq_sector_nombre UNIQUE (nombre)
      )
    `);

    // ── irl_catalog.servicio_portafolio ──────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_catalog.servicio_portafolio (
        id_servicio   integer       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        nombre        varchar(80)   NOT NULL,
        descripcion   varchar(500),
        activo        boolean       NOT NULL DEFAULT true,
        CONSTRAINT uq_servicio_nombre UNIQUE (nombre)
      )
    `);

    // ── irl_catalog.regla_enrutamiento ───────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_catalog.regla_enrutamiento (
        id_regla    bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_servicio integer       NOT NULL,
        condicion   varchar(2000) NOT NULL,
        prioridad   integer       NOT NULL,
        descripcion varchar(500),
        activa      boolean       NOT NULL DEFAULT true,
        CONSTRAINT fk_regla_servicio FOREIGN KEY (id_servicio)
          REFERENCES irl_catalog.servicio_portafolio (id_servicio)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_catalog.regla_enrutamiento`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_catalog.servicio_portafolio`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS irl_catalog.sector`);
    await queryRunner.query(`DROP TABLE IF EXISTS irl_catalog.texto_roadmap`);
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initiative characterisation — the non-IRL facts the routing engine reads.
 *
 * The engine scores a service partly on how well it fits the initiative's
 * situation, not only its IRL profile: which stage it is in, how big the
 * team is, whether it is attached to the university. None of that existed:
 * `iniciativa` carried only `nombre`, `descripcion_breve` and `id_sector`,
 * and no use case writes the table at all.
 *
 * Every column lands NULLABLE, deliberately. The initiative form (RF-04 /
 * HU-06) is not implemented, so there is no path that could populate them
 * today. The engine treats NULL as "does not match" for stage affinity and
 * "does not exclude" for eligibility, and records that it did so in the
 * trace — a recommendation computed without characterisation is weaker,
 * and that has to be visible rather than silent.
 *
 * `etapa_iniciativa` is a table rather than a CHECK constraint because the
 * stage vocabulary is exactly the kind of thing that changes without a
 * schema change being warranted.
 */
export class InitiativeCharacterization1747526400011
  implements MigrationInterface
{
  name = 'InitiativeCharacterization1747526400011';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE irl_catalog.etapa_iniciativa (
        id_etapa bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        codigo   varchar(24)  NOT NULL,
        nombre   varchar(80)  NOT NULL,
        orden    integer      NOT NULL,
        activo   boolean      NOT NULL DEFAULT true,
        CONSTRAINT uq_etapa_codigo UNIQUE (codigo),
        CONSTRAINT uq_etapa_orden  UNIQUE (orden)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.iniciativa
        ADD COLUMN id_etapa              bigint,
        ADD COLUMN tamano_equipo         integer,
        ADD COLUMN vinculacion_academica boolean
    `);

    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.iniciativa
        ADD CONSTRAINT fk_iniciativa_etapa FOREIGN KEY (id_etapa)
          REFERENCES irl_catalog.etapa_iniciativa (id_etapa),
        ADD CONSTRAINT ck_iniciativa_tamano_equipo
          CHECK (tamano_equipo IS NULL OR tamano_equipo > 0)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.iniciativa
        DROP CONSTRAINT IF EXISTS ck_iniciativa_tamano_equipo,
        DROP CONSTRAINT IF EXISTS fk_iniciativa_etapa,
        DROP COLUMN IF EXISTS vinculacion_academica,
        DROP COLUMN IF EXISTS tamano_equipo,
        DROP COLUMN IF EXISTS id_etapa
    `);
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_catalog.etapa_iniciativa`,
    );
  }
}

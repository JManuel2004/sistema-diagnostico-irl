import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Retires the single-rule routing model.
 *
 * The original design (migrations 003/004) assumed one `regla_enrutamiento`
 * row would "win" per diagnostic, and encoded that assumption as a
 * `NOT NULL` FK on `recomendacion_portafolio.id_regla`.
 *
 * The layered engine does not produce a winning rule. It produces a ranking
 * computed from ordinal service profiles, filtered by eligibility rules and
 * then adjusted by exception rules. Keeping `id_regla NOT NULL` would force
 * a synthetic rule row per recommendation — junk data wearing the costume of
 * traceability. Real traceability lives in `irl_diagnostic.traza_capas`
 * (migration 010), which records what each layer did.
 *
 * Safe to drop: both tables are empty. `regla_enrutamiento` was never
 * seeded and `recomendacion_portafolio` was never written to — there is no
 * use case, controller or repository that touches either one.
 */
export class RemoveSingleRuleRoutingModel1747526400005
  implements MigrationInterface
{
  name = 'RemoveSingleRuleRoutingModel1747526400005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.recomendacion_portafolio
        DROP CONSTRAINT IF EXISTS fk_recomendacion_regla
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.recomendacion_portafolio
        DROP COLUMN IF EXISTS id_regla
    `);
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_catalog.regla_enrutamiento`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Recreates the table exactly as migration 003 declared it, so the
    // schema can roll back to the pre-engine shape.
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
    // The column comes back nullable: rolling forward dropped every value,
    // so NOT NULL could only be restored on an empty table.
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.recomendacion_portafolio
        ADD COLUMN id_regla bigint
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.recomendacion_portafolio
        ADD CONSTRAINT fk_recomendacion_regla FOREIGN KEY (id_regla)
          REFERENCES irl_catalog.regla_enrutamiento (id_regla)
    `);
  }
}

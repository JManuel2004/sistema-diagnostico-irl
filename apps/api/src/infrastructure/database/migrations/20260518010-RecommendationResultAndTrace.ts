import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The result side: what the engine produced, and why.
 *
 * `recomendacion_portafolio` already existed (migration 004) but modelled
 * a single winning rule. Migration 005 removed `id_regla`; this one adds
 * what the layered engine actually produces:
 *
 *   - the principal service and its score,
 *   - `alternativa_recomendacion` — positions 2..N of the ranking,
 *   - `traza_capas` — the per-layer record that makes the outcome
 *     auditable months later.
 *
 * `id_diagnostico` stays UNIQUE on `recomendacion_portafolio`, so the
 * "exactly one recommendation, not an ordered list" rule of RF-15 remains
 * enforced by the database. The alternatives are a separate, subordinate
 * table precisely so that constraint can stay.
 *
 * `servicio_snapshot` and `justificacion_criterio` are relaxed to NULL:
 * a `SIN_RECOMENDACION` outcome has no service to snapshot, and writing a
 * sentinel string like '(sin recomendación)' into a NOT NULL column is
 * debt wearing a disguise. The coherence CHECK below is what actually
 * guarantees both columns are present whenever there *is* a service.
 */
export class RecommendationResultAndTrace1747526400010
  implements MigrationInterface
{
  name = 'RecommendationResultAndTrace1747526400010';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.recomendacion_portafolio
        ALTER COLUMN servicio_snapshot DROP NOT NULL,
        ALTER COLUMN justificacion_criterio DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.recomendacion_portafolio
        ADD COLUMN id_version_configuracion bigint NOT NULL,
        ADD COLUMN id_servicio_principal    integer,
        ADD COLUMN puntaje_principal        numeric(6,3),
        ADD COLUMN resultado_tipo           varchar(24) NOT NULL DEFAULT 'RECOMENDACION'
    `);

    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.recomendacion_portafolio
        ADD CONSTRAINT fk_recomendacion_version FOREIGN KEY (id_version_configuracion)
          REFERENCES irl_catalog.version_configuracion (id_version_configuracion),
        ADD CONSTRAINT fk_recomendacion_servicio_principal FOREIGN KEY (id_servicio_principal)
          REFERENCES irl_catalog.servicio_portafolio (id_servicio),
        ADD CONSTRAINT ck_recomendacion_resultado_tipo
          CHECK (resultado_tipo IN ('RECOMENDACION','SIN_RECOMENDACION')),
        ADD CONSTRAINT ck_recomendacion_coherencia CHECK (
          (resultado_tipo = 'RECOMENDACION'
             AND id_servicio_principal IS NOT NULL
             AND puntaje_principal     IS NOT NULL
             AND servicio_snapshot     IS NOT NULL
             AND justificacion_criterio IS NOT NULL)
          OR
          (resultado_tipo = 'SIN_RECOMENDACION'
             AND id_servicio_principal IS NULL
             AND puntaje_principal     IS NULL
             AND servicio_snapshot     IS NULL)
        )
    `);

    // ── irl_diagnostic.alternativa_recomendacion ─────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.alternativa_recomendacion (
        id_alternativa    bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_recomendacion  bigint       NOT NULL,
        id_servicio       integer      NOT NULL,
        servicio_snapshot varchar(80)  NOT NULL,
        posicion          integer      NOT NULL,
        puntaje           numeric(6,3) NOT NULL,
        CONSTRAINT uq_alternativa_posicion UNIQUE (id_recomendacion, posicion),
        CONSTRAINT ck_alternativa_posicion CHECK (posicion >= 2),
        CONSTRAINT fk_alternativa_recomendacion FOREIGN KEY (id_recomendacion)
          REFERENCES irl_diagnostic.recomendacion_portafolio (id_recomendacion)
          ON DELETE CASCADE,
        CONSTRAINT fk_alternativa_servicio FOREIGN KEY (id_servicio)
          REFERENCES irl_catalog.servicio_portafolio (id_servicio)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX ix_alternativa_recomendacion
         ON irl_diagnostic.alternativa_recomendacion (id_recomendacion)`,
    );

    // ── irl_diagnostic.traza_capas ───────────────────────────────────────
    //
    // One row per recommendation (UNIQUE on id_recomendacion). Each jsonb
    // column is the record of one layer; `excepciones_activadas` holds the
    // ranking before and after *each individual* exception, not just the
    // aggregate, so a challenged recommendation can be attributed to the
    // exact adjustment that produced it.
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.traza_capas (
        id_traza                 bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_recomendacion         bigint      NOT NULL,
        excluidos_capa_1         jsonb       NOT NULL,
        ranking_pre_excepcion    jsonb       NOT NULL,
        excepciones_activadas    jsonb       NOT NULL,
        excepciones_descartadas  jsonb       NOT NULL,
        ranking_post_excepcion   jsonb       NOT NULL,
        id_version_configuracion bigint      NOT NULL,
        id_snapshot_calibracion  bigint      NOT NULL,
        id_snapshot_parametros   bigint      NOT NULL,
        hash_hechos              varchar(64) NOT NULL,
        evaluado_en              timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_traza_recomendacion UNIQUE (id_recomendacion),
        CONSTRAINT fk_traza_recomendacion FOREIGN KEY (id_recomendacion)
          REFERENCES irl_diagnostic.recomendacion_portafolio (id_recomendacion)
          ON DELETE CASCADE,
        CONSTRAINT fk_traza_version FOREIGN KEY (id_version_configuracion)
          REFERENCES irl_catalog.version_configuracion (id_version_configuracion),
        CONSTRAINT fk_traza_calibracion FOREIGN KEY (id_snapshot_calibracion)
          REFERENCES irl_catalog.snapshot_calibracion (id_snapshot_calibracion),
        CONSTRAINT fk_traza_parametros FOREIGN KEY (id_snapshot_parametros)
          REFERENCES irl_catalog.snapshot_parametros (id_snapshot_parametros)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS irl_diagnostic.traza_capas`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_diagnostic.alternativa_recomendacion`,
    );
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.recomendacion_portafolio
        DROP CONSTRAINT IF EXISTS ck_recomendacion_coherencia,
        DROP CONSTRAINT IF EXISTS ck_recomendacion_resultado_tipo,
        DROP CONSTRAINT IF EXISTS fk_recomendacion_servicio_principal,
        DROP CONSTRAINT IF EXISTS fk_recomendacion_version,
        DROP COLUMN IF EXISTS resultado_tipo,
        DROP COLUMN IF EXISTS puntaje_principal,
        DROP COLUMN IF EXISTS id_servicio_principal,
        DROP COLUMN IF EXISTS id_version_configuracion
    `);
    // Rows without both values would violate the reinstated NOT NULL.
    await queryRunner.query(`
      DELETE FROM irl_diagnostic.recomendacion_portafolio
       WHERE servicio_snapshot IS NULL OR justificacion_criterio IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.recomendacion_portafolio
        ALTER COLUMN servicio_snapshot SET NOT NULL,
        ALTER COLUMN justificacion_criterio SET NOT NULL
    `);
  }
}

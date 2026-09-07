import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Calibration tables — the technical half of the routing configuration.
 *
 * Two independent snapshot families, both immutable once published:
 *
 *   - `snapshot_calibracion` + `valor_etiqueta_calibracion`
 *     Maps the ordinal vocabulary the business side works in
 *     (`principal`, `secundario`, `marginal`, `no_aplica`) onto the
 *     numbers the scorer actually multiplies. Nobody outside this table
 *     ever sees those numbers.
 *
 *   - `snapshot_parametros`
 *     The global weights of the affinity score, plus the cutoff and the
 *     size of the alternatives list.
 *
 * Why snapshots rather than mutable rows: a recommendation issued in
 * January has to stay explainable in December. Each published
 * `version_configuracion` (migration 008) pins one snapshot of each kind,
 * so replaying an old diagnostic loads the numbers that were in force
 * then — not today's.
 *
 * `autor_id` is filled with a sentinel until the identity module exists;
 * the column is here now so adopting real identity needs no migration.
 *
 * NOTE — the monotonicity of the ordinal scale
 * (`principal > secundario > marginal > no_aplica`) is deliberately NOT a
 * CHECK: it is a statement about several rows at once, which a row-level
 * constraint cannot express. It is enforced in `EscalaCalibracion.create()`
 * and re-verified when a version is published. `orden_monotonia` exists so
 * that check is deterministic and so the UI can order the scale.
 */
export class RoutingCalibration1747526400007 implements MigrationInterface {
  name = 'RoutingCalibration1747526400007';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── irl_catalog.snapshot_calibracion ─────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_catalog.snapshot_calibracion (
        id_snapshot_calibracion bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        numero                  integer       NOT NULL,
        autor_id                varchar(64)   NOT NULL,
        comentario              varchar(500),
        estado                  varchar(16)   NOT NULL,
        creado_en               timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT uq_snapshot_calibracion_numero UNIQUE (numero),
        CONSTRAINT ck_snapshot_calibracion_estado
          CHECK (estado IN ('BORRADOR','PUBLICADO','ARCHIVADO'))
      )
    `);

    // ── irl_catalog.valor_etiqueta_calibracion ───────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_catalog.valor_etiqueta_calibracion (
        id_valor_etiqueta       bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_snapshot_calibracion bigint        NOT NULL,
        etiqueta                varchar(24)   NOT NULL,
        valor_numerico          numeric(4,2)  NOT NULL,
        orden_monotonia         integer       NOT NULL,
        CONSTRAINT uq_valor_etiqueta UNIQUE (id_snapshot_calibracion, etiqueta),
        CONSTRAINT uq_valor_etiqueta_orden
          UNIQUE (id_snapshot_calibracion, orden_monotonia),
        CONSTRAINT ck_valor_etiqueta_rango
          CHECK (valor_numerico >= 0 AND valor_numerico <= 1),
        CONSTRAINT fk_valor_etiqueta_snapshot FOREIGN KEY (id_snapshot_calibracion)
          REFERENCES irl_catalog.snapshot_calibracion (id_snapshot_calibracion)
          ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX ix_valor_etiqueta_snapshot
         ON irl_catalog.valor_etiqueta_calibracion (id_snapshot_calibracion)`,
    );

    // ── irl_catalog.snapshot_parametros ──────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_catalog.snapshot_parametros (
        id_snapshot_parametros      bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        numero                      integer       NOT NULL,
        autor_id                    varchar(64)   NOT NULL,
        comentario                  varchar(500),
        peso_cuello_botella         numeric(4,2)  NOT NULL,
        peso_brecha                 numeric(4,2)  NOT NULL,
        peso_desequilibrio_moderado numeric(4,2)  NOT NULL,
        peso_desequilibrio_critico  numeric(4,2)  NOT NULL,
        peso_afinidad_etapa         numeric(4,2)  NOT NULL,
        penalizacion_fuera_rango    numeric(4,2)  NOT NULL,
        umbral_minimo               numeric(5,2)  NOT NULL,
        n_alternativas              integer       NOT NULL,
        estado                      varchar(16)   NOT NULL,
        creado_en                   timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT uq_snapshot_parametros_numero UNIQUE (numero),
        CONSTRAINT ck_snapshot_parametros_estado
          CHECK (estado IN ('BORRADOR','PUBLICADO','ARCHIVADO')),
        CONSTRAINT ck_snapshot_parametros_no_negativos CHECK (
          peso_cuello_botella >= 0 AND peso_brecha >= 0 AND
          peso_desequilibrio_moderado >= 0 AND peso_desequilibrio_critico >= 0 AND
          peso_afinidad_etapa >= 0 AND penalizacion_fuera_rango >= 0 AND
          umbral_minimo >= 0 AND n_alternativas >= 0
        )
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_catalog.snapshot_parametros`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_catalog.valor_etiqueta_calibracion`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_catalog.snapshot_calibracion`,
    );
  }
}

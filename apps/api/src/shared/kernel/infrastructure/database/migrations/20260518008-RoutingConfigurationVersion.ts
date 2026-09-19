import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The published side of the routing configuration.
 *
 * A `version_configuracion` is the unit of publication. It pins one
 * calibration snapshot and one parameter snapshot, and owns the four
 * artefacts the engine reads:
 *
 *   - `ficha_ordinal_publicada` + `intensidad_ordinal_publicada`
 *       One profile per portfolio service: which IRL band it serves, which
 *       initiative stages it fits, and how strongly it addresses each of
 *       the six dimensions — stated as an ordinal label, never a number.
 *   - `regla_elegibilidad_publicada`
 *       Hard filters. Boolean only: a service either qualifies or it does
 *       not. Layer 1 of the engine.
 *   - `regla_excepcion_publicada`
 *       Deliberate overrides of the computed ranking. Layer 3.
 *
 * Rows here are written by exactly one code path (the publisher) and never
 * updated afterwards. That immutability is what makes a recommendation
 * reproducible months later.
 */
export class RoutingConfigurationVersion1747526400008
  implements MigrationInterface
{
  name = 'RoutingConfigurationVersion1747526400008';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── irl_catalog.version_configuracion ────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_catalog.version_configuracion (
        id_version_configuracion bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        numero                   integer     NOT NULL,
        autor_id                 varchar(64) NOT NULL,
        comentario               varchar(500),
        id_snapshot_calibracion  bigint      NOT NULL,
        id_snapshot_parametros   bigint      NOT NULL,
        estado                   varchar(16) NOT NULL,
        vigente_desde            timestamptz NOT NULL DEFAULT now(),
        vigente_hasta            timestamptz,
        CONSTRAINT uq_version_numero UNIQUE (numero),
        CONSTRAINT ck_version_estado CHECK (estado IN ('VIGENTE','ARCHIVADA')),
        CONSTRAINT fk_version_calibracion FOREIGN KEY (id_snapshot_calibracion)
          REFERENCES irl_catalog.snapshot_calibracion (id_snapshot_calibracion),
        CONSTRAINT fk_version_parametros FOREIGN KEY (id_snapshot_parametros)
          REFERENCES irl_catalog.snapshot_parametros (id_snapshot_parametros)
      )
    `);

    // Makes two simultaneously-current versions impossible at the storage
    // layer, so the guarantee survives a race in the publish path instead
    // of depending on application code getting the ordering right.
    await queryRunner.query(`
      CREATE UNIQUE INDEX ux_version_unica_vigente
        ON irl_catalog.version_configuracion (estado)
        WHERE estado = 'VIGENTE'
    `);

    // ── irl_catalog.ficha_ordinal_publicada ──────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_catalog.ficha_ordinal_publicada (
        id_ficha_publicada       bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_version_configuracion bigint       NOT NULL,
        id_servicio              integer      NOT NULL,
        nivel_min                integer      NOT NULL,
        nivel_max                integer      NOT NULL,
        etapas_pertinentes       varchar(200) NOT NULL,
        hash_ficha               varchar(64)  NOT NULL,
        CONSTRAINT uq_ficha_publicada UNIQUE (id_version_configuracion, id_servicio),
        CONSTRAINT ck_ficha_niveles CHECK (
          nivel_min BETWEEN 1 AND 9
          AND nivel_max BETWEEN 1 AND 9
          AND nivel_min <= nivel_max
        ),
        CONSTRAINT fk_ficha_publicada_version FOREIGN KEY (id_version_configuracion)
          REFERENCES irl_catalog.version_configuracion (id_version_configuracion)
          ON DELETE CASCADE,
        CONSTRAINT fk_ficha_publicada_servicio FOREIGN KEY (id_servicio)
          REFERENCES irl_catalog.servicio_portafolio (id_servicio)
      )
    `);

    // ── irl_catalog.intensidad_ordinal_publicada ─────────────────────────
    //
    // `etiqueta` deliberately carries NO foreign key to
    // `valor_etiqueta_calibracion`. The label is resolved against the
    // calibration snapshot pinned by *this row's version*, not against
    // whichever snapshot happens to be current. A hard FK would block
    // publishing a calibration that introduces or renames labels without
    // invalidating every earlier version. Membership is verified by the
    // editor and re-verified at publish time.
    await queryRunner.query(`
      CREATE TABLE irl_catalog.intensidad_ordinal_publicada (
        id_intensidad_publicada bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_ficha_publicada      bigint      NOT NULL,
        id_dimension            integer     NOT NULL,
        etiqueta                varchar(24) NOT NULL,
        CONSTRAINT uq_intensidad_publicada UNIQUE (id_ficha_publicada, id_dimension),
        CONSTRAINT fk_intensidad_publicada_ficha FOREIGN KEY (id_ficha_publicada)
          REFERENCES irl_catalog.ficha_ordinal_publicada (id_ficha_publicada)
          ON DELETE CASCADE,
        CONSTRAINT fk_intensidad_publicada_dimension FOREIGN KEY (id_dimension)
          REFERENCES irl_catalog.dimension (id_dimension)
      )
    `);

    // ── irl_catalog.regla_elegibilidad_publicada ─────────────────────────
    //
    // `jsonb`, not the `varchar(2000)` of the retired `regla_enrutamiento`:
    // Postgres validates the syntax on write and the predicate stays
    // queryable from SQL, which the cross-layer validator needs.
    await queryRunner.query(`
      CREATE TABLE irl_catalog.regla_elegibilidad_publicada (
        id_regla_elig_publicada  bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_version_configuracion bigint       NOT NULL,
        id_servicio              integer      NOT NULL,
        predicado                jsonb        NOT NULL,
        arbol_expresion          jsonb        NOT NULL,
        mensaje_exclusion        varchar(500) NOT NULL,
        hash_regla               varchar(64)  NOT NULL,
        CONSTRAINT fk_regla_elig_version FOREIGN KEY (id_version_configuracion)
          REFERENCES irl_catalog.version_configuracion (id_version_configuracion)
          ON DELETE CASCADE,
        CONSTRAINT fk_regla_elig_servicio FOREIGN KEY (id_servicio)
          REFERENCES irl_catalog.servicio_portafolio (id_servicio)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX ix_regla_elig_version
         ON irl_catalog.regla_elegibilidad_publicada (id_version_configuracion)`,
    );

    // ── irl_catalog.regla_excepcion_publicada ────────────────────────────
    //
    // `uq_excepcion_prioridad` settles by construction the tie-breaking
    // problem the retired `regla_enrutamiento.prioridad` left open: within
    // a version, no two exceptions can share an order, so application is
    // total and deterministic.
    await queryRunner.query(`
      CREATE TABLE irl_catalog.regla_excepcion_publicada (
        id_regla_exc_publicada   bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_version_configuracion bigint        NOT NULL,
        codigo                   varchar(16)   NOT NULL,
        predicado                jsonb         NOT NULL,
        arbol_expresion          jsonb         NOT NULL,
        accion                   varchar(16)   NOT NULL,
        id_servicio_objetivo     integer       NOT NULL,
        posiciones               integer,
        motivo_declarado         varchar(1000) NOT NULL,
        prioridad_orden          integer       NOT NULL,
        hash_regla               varchar(64)   NOT NULL,
        CONSTRAINT uq_excepcion_prioridad
          UNIQUE (id_version_configuracion, prioridad_orden),
        CONSTRAINT uq_excepcion_codigo
          UNIQUE (id_version_configuracion, codigo),
        CONSTRAINT ck_excepcion_accion
          CHECK (accion IN ('FORZAR','VETAR','PROMOVER','DEGRADAR')),
        CONSTRAINT ck_excepcion_posiciones CHECK (
          (accion IN ('PROMOVER','DEGRADAR') AND posiciones IS NOT NULL AND posiciones > 0)
          OR (accion IN ('FORZAR','VETAR') AND posiciones IS NULL)
        ),
        CONSTRAINT fk_regla_exc_version FOREIGN KEY (id_version_configuracion)
          REFERENCES irl_catalog.version_configuracion (id_version_configuracion)
          ON DELETE CASCADE,
        CONSTRAINT fk_regla_exc_servicio FOREIGN KEY (id_servicio_objetivo)
          REFERENCES irl_catalog.servicio_portafolio (id_servicio)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX ix_regla_exc_version
         ON irl_catalog.regla_excepcion_publicada (id_version_configuracion)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_catalog.regla_excepcion_publicada`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_catalog.regla_elegibilidad_publicada`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_catalog.intensidad_ordinal_publicada`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_catalog.ficha_ordinal_publicada`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS irl_catalog.ux_version_unica_vigente`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_catalog.version_configuracion`,
    );
  }
}

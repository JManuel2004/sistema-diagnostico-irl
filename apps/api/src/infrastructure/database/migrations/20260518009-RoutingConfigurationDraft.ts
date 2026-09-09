import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The draft side of the routing configuration.
 *
 * Structurally identical to the published tables of migration 008, minus
 * two things: no `id_version_configuracion` (a draft belongs to no version
 * yet) and no `hash_*` (computed at publish time).
 *
 * Why separate tables instead of one table per artefact with a nullable
 * `id_version_configuracion` (NULL meaning "draft"): the single-table shape
 * is more compact, but it leaves a misdirected UPDATE able to rewrite a
 * published row — and the whole explainability requirement rests on that
 * being impossible. With the split, publishing is an INSERT from draft and
 * no code path other than the publisher ever writes to a `_publicada`
 * table.
 *
 * SCOPE NOTE — these four tables are created but not yet written to. The
 * configuration cycle (the admin surface that fills them) is out of scope
 * for the query-cycle work; the schema lands now so that cycle needs no
 * further migration. The engine reads only from the published tables.
 */
export class RoutingConfigurationDraft1747526400009
  implements MigrationInterface
{
  name = 'RoutingConfigurationDraft1747526400009';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE irl_catalog.ficha_ordinal_borrador (
        id_ficha_borrador  bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_servicio        integer      NOT NULL,
        nivel_min          integer      NOT NULL,
        nivel_max          integer      NOT NULL,
        etapas_pertinentes varchar(200) NOT NULL,
        actualizado_en     timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT uq_ficha_borrador_servicio UNIQUE (id_servicio),
        CONSTRAINT ck_ficha_borrador_niveles CHECK (
          nivel_min BETWEEN 1 AND 9
          AND nivel_max BETWEEN 1 AND 9
          AND nivel_min <= nivel_max
        ),
        CONSTRAINT fk_ficha_borrador_servicio FOREIGN KEY (id_servicio)
          REFERENCES irl_catalog.servicio_portafolio (id_servicio)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE irl_catalog.intensidad_ordinal_borrador (
        id_intensidad_borrador bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_ficha_borrador      bigint      NOT NULL,
        id_dimension           integer     NOT NULL,
        etiqueta               varchar(24) NOT NULL,
        CONSTRAINT uq_intensidad_borrador UNIQUE (id_ficha_borrador, id_dimension),
        CONSTRAINT fk_intensidad_borrador_ficha FOREIGN KEY (id_ficha_borrador)
          REFERENCES irl_catalog.ficha_ordinal_borrador (id_ficha_borrador)
          ON DELETE CASCADE,
        CONSTRAINT fk_intensidad_borrador_dimension FOREIGN KEY (id_dimension)
          REFERENCES irl_catalog.dimension (id_dimension)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE irl_catalog.regla_elegibilidad_borrador (
        id_regla_elig_borrador bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_servicio            integer      NOT NULL,
        predicado              jsonb        NOT NULL,
        arbol_expresion        jsonb        NOT NULL,
        mensaje_exclusion      varchar(500) NOT NULL,
        actualizado_en         timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT fk_regla_elig_borrador_servicio FOREIGN KEY (id_servicio)
          REFERENCES irl_catalog.servicio_portafolio (id_servicio)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE irl_catalog.regla_excepcion_borrador (
        id_regla_exc_borrador bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        codigo                varchar(16)   NOT NULL,
        predicado             jsonb         NOT NULL,
        arbol_expresion       jsonb         NOT NULL,
        accion                varchar(16)   NOT NULL,
        id_servicio_objetivo  integer       NOT NULL,
        posiciones            integer,
        motivo_declarado      varchar(1000) NOT NULL,
        prioridad_orden       integer       NOT NULL,
        actualizado_en        timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT uq_excepcion_borrador_prioridad UNIQUE (prioridad_orden),
        CONSTRAINT uq_excepcion_borrador_codigo UNIQUE (codigo),
        CONSTRAINT ck_excepcion_borrador_accion
          CHECK (accion IN ('FORZAR','VETAR','PROMOVER','DEGRADAR')),
        CONSTRAINT ck_excepcion_borrador_posiciones CHECK (
          (accion IN ('PROMOVER','DEGRADAR') AND posiciones IS NOT NULL AND posiciones > 0)
          OR (accion IN ('FORZAR','VETAR') AND posiciones IS NULL)
        ),
        CONSTRAINT fk_regla_exc_borrador_servicio FOREIGN KEY (id_servicio_objetivo)
          REFERENCES irl_catalog.servicio_portafolio (id_servicio)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_catalog.regla_excepcion_borrador`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_catalog.regla_elegibilidad_borrador`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_catalog.intensidad_ordinal_borrador`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_catalog.ficha_ordinal_borrador`,
    );
  }
}

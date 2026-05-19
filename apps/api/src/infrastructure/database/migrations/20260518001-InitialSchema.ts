import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema migration.
 *
 * Creates the two-schema database layout:
 *
 *   - `irl_catalog`: read-only reference data populated by seeds
 *       - dimension      — six IRL dimensions
 *       - afirmacion     — 48 statements (8 per dimension)
 *
 *   - `irl_diagnostic`: transactional data created at runtime
 *       - diagnostico    — root aggregate per user-initiated diagnostic
 *       - respuesta      — Likert answers linked to a diagnostico
 *
 * Column names, types, and constraints match the MR diagram exactly.
 */
export class InitialSchema20260518001 implements MigrationInterface {
  name = 'InitialSchema20260518001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS irl_catalog`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS irl_diagnostic`);

    // ── irl_catalog.dimension ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_catalog.dimension (
        id_dimension          integer       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        codigo                varchar(8)    NOT NULL,
        nombre_es             varchar(80)   NOT NULL,
        nombre_en             varchar(80)   NOT NULL,
        descripcion           varchar(500)  NOT NULL,
        es_dimension_critica  boolean       NOT NULL DEFAULT false,
        orden                 integer       NOT NULL,
        CONSTRAINT uq_dimension_codigo UNIQUE (codigo),
        CONSTRAINT uq_dimension_orden  UNIQUE (orden),
        CONSTRAINT ck_dimension_codigo CHECK (codigo IN ('TRL','CRL','BRL','IPRL','TmRL','FRL')),
        CONSTRAINT ck_dimension_orden  CHECK (orden BETWEEN 1 AND 6)
      )
    `);

    // ── irl_catalog.afirmacion ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_catalog.afirmacion (
        id_afirmacion         bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_dimension          integer       NOT NULL,
        numero_en_dimension   integer       NOT NULL,
        texto_es              varchar(500)  NOT NULL,
        CONSTRAINT uq_afirmacion_dim_numero UNIQUE (id_dimension, numero_en_dimension),
        CONSTRAINT ck_afirmacion_numero CHECK (numero_en_dimension BETWEEN 1 AND 8),
        CONSTRAINT fk_afirmacion_dimension FOREIGN KEY (id_dimension)
          REFERENCES irl_catalog.dimension (id_dimension)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX ix_afirmacion_dimension ON irl_catalog.afirmacion (id_dimension)`,
    );

    // ── irl_diagnostic.diagnostico ───────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.diagnostico (
        id_diagnostico        uuid          PRIMARY KEY,
        keycloak_user_id      varchar(64)   NOT NULL,
        fecha_inicio          timestamptz   NOT NULL DEFAULT now(),
        fecha_fin_fase_1      timestamptz,
        fecha_fin_fase_2      timestamptz,
        estado                varchar(24)   NOT NULL,
        version_marco_irl     varchar(16)   NOT NULL DEFAULT 'KTH-IRL-1.0',
        CONSTRAINT ck_diagnostico_estado CHECK (estado IN (
          'INICIADO',
          'CON_CONSENTIMIENTO',
          'CON_INICIATIVA',
          'CUESTIONARIO_EN_CURSO',
          'CUESTIONARIO_COMPLETO',
          'PERFIL_GENERADO'
        ))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX ix_diagnostico_keycloak ON irl_diagnostic.diagnostico (keycloak_user_id)`,
    );

    // ── irl_diagnostic.respuesta ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.respuesta (
        id_respuesta          bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_diagnostico        uuid          NOT NULL,
        id_afirmacion         bigint        NOT NULL,
        valor_likert          integer       NOT NULL,
        fecha_respuesta       timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT uq_respuesta_diag_afirmacion UNIQUE (id_diagnostico, id_afirmacion),
        CONSTRAINT ck_respuesta_valor_likert CHECK (valor_likert BETWEEN 1 AND 5),
        CONSTRAINT fk_respuesta_diagnostico FOREIGN KEY (id_diagnostico)
          REFERENCES irl_diagnostic.diagnostico (id_diagnostico) ON DELETE CASCADE,
        CONSTRAINT fk_respuesta_afirmacion FOREIGN KEY (id_afirmacion)
          REFERENCES irl_catalog.afirmacion (id_afirmacion)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX ix_respuesta_diagnostico ON irl_diagnostic.respuesta (id_diagnostico)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS irl_diagnostic.respuesta`);
    await queryRunner.query(`DROP TABLE IF EXISTS irl_diagnostic.diagnostico`);
    await queryRunner.query(`DROP TABLE IF EXISTS irl_catalog.afirmacion`);
    await queryRunner.query(`DROP TABLE IF EXISTS irl_catalog.dimension`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS irl_diagnostic`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS irl_catalog`);
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema migration — Stage 1 minimum.
 *
 * Creates the two-schema database layout:
 *
 *   - `irl_catalog`: read-only reference data populated by seeds
 *       - dimension      — six IRL dimensions
 *       - afirmacion     — 48 statements (8 per dimension)
 *
 *   - `irl_diagnostic`: transactional data created at runtime
 *       - diagnostico    — root aggregate per user-initiated diagnostic
 *       - respuesta      — 48 Likert answers linked to a diagnostico
 *
 * Source of truth: PROJECT-SUMMARY.md §1.8 and CLAUDE.api.md naming rules.
 * Constraints replicate the anteproyecto invariants for defense in depth.
 *
 * Tables outside the three target stories (consentimiento, iniciativa,
 * resultado_dimension, analisis_desequilibrio, recomendacion_portafolio,
 * notificacion, evento_auditoria) are intentionally NOT created here —
 * each will arrive with the story that needs it.
 */
export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS irl_catalog`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS irl_diagnostic`);

    // ── irl_catalog.dimension ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_catalog.dimension (
        id_dimension      uuid        PRIMARY KEY,
        codigo            text        NOT NULL,
        nombre            text        NOT NULL,
        descripcion       text        NOT NULL,
        orden             smallint    NOT NULL,
        version_marco     text        NOT NULL DEFAULT 'KTH-IRL-1.0',
        creado_en         timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_dimension_codigo_version UNIQUE (codigo, version_marco),
        CONSTRAINT ck_dimension_codigo CHECK (codigo IN ('TRL','CRL','BRL','IPRL','TmRL','FRL')),
        CONSTRAINT ck_dimension_orden CHECK (orden BETWEEN 1 AND 6)
      )
    `);

    // ── irl_catalog.afirmacion ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_catalog.afirmacion (
        id_afirmacion     uuid        PRIMARY KEY,
        id_dimension      uuid        NOT NULL REFERENCES irl_catalog.dimension(id_dimension),
        orden             smallint    NOT NULL,
        texto             text        NOT NULL,
        version_marco     text        NOT NULL DEFAULT 'KTH-IRL-1.0',
        creado_en         timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_afirmacion_dimension_orden UNIQUE (id_dimension, orden, version_marco),
        CONSTRAINT ck_afirmacion_orden CHECK (orden BETWEEN 1 AND 8)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX ix_afirmacion_dimension ON irl_catalog.afirmacion (id_dimension)`,
    );

    // ── irl_diagnostic.diagnostico ───────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.diagnostico (
        id_diagnostico    uuid        PRIMARY KEY,
        id_usuario        text        NOT NULL,
        estado            text        NOT NULL,
        creado_en         timestamptz NOT NULL DEFAULT now(),
        actualizado_en    timestamptz NOT NULL DEFAULT now(),
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
      `CREATE INDEX ix_diagnostico_usuario ON irl_diagnostic.diagnostico (id_usuario)`,
    );

    // ── irl_diagnostic.respuesta ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.respuesta (
        id_respuesta      uuid        PRIMARY KEY,
        id_diagnostico    uuid        NOT NULL REFERENCES irl_diagnostic.diagnostico(id_diagnostico) ON DELETE CASCADE,
        id_afirmacion     uuid        NOT NULL REFERENCES irl_catalog.afirmacion(id_afirmacion),
        valor_likert      smallint    NOT NULL,
        creado_en         timestamptz NOT NULL DEFAULT now(),
        actualizado_en    timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT ck_respuesta_valor_likert CHECK (valor_likert BETWEEN 1 AND 5),
        CONSTRAINT uq_respuesta_diagnostico_afirmacion UNIQUE (id_diagnostico, id_afirmacion)
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

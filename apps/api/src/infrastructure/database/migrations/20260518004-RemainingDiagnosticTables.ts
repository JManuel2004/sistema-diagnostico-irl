import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the eight remaining transactional tables from the MR diagram,
 * all living in the `irl_diagnostic` schema.
 *
 * Creation order respects FK dependencies:
 *   consentimiento, iniciativa   — owned 1-to-1 by diagnostico
 *   resultado_dimension          — depends on diagnostico + dimension
 *   analisis_desequilibrio       — depends on diagnostico + par_dimension
 *   notificacion                 — depends on diagnostico
 *   recomendacion_portafolio     — depends on diagnostico + regla_enrutamiento
 *   descarga_reporte             — depends on diagnostico
 *   evento_auditoria             — depends on diagnostico
 */
export class RemainingDiagnosticTables20260518004 implements MigrationInterface {
  name = 'RemainingDiagnosticTables20260518004';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── irl_diagnostic.consentimiento ────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.consentimiento (
        id_consentimiento    uuid          PRIMARY KEY,
        id_diagnostico       uuid          NOT NULL,
        keycloak_user_id     varchar(64)   NOT NULL,
        aceptado             boolean       NOT NULL,
        timestamp_aceptacion timestamptz   NOT NULL,
        version_terminos     varchar(16)   NOT NULL,
        CONSTRAINT uq_consentimiento_diagnostico UNIQUE (id_diagnostico),
        CONSTRAINT fk_consentimiento_diagnostico FOREIGN KEY (id_diagnostico)
          REFERENCES irl_diagnostic.diagnostico (id_diagnostico) ON DELETE CASCADE
      )
    `);

    // ── irl_diagnostic.iniciativa ────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.iniciativa (
        id_iniciativa     uuid          PRIMARY KEY,
        id_diagnostico    uuid          NOT NULL,
        id_sector         bigint        NOT NULL,
        nombre            varchar(200)  NOT NULL,
        descripcion_breve varchar(1000) NOT NULL,
        CONSTRAINT uq_iniciativa_diagnostico UNIQUE (id_diagnostico),
        CONSTRAINT fk_iniciativa_diagnostico FOREIGN KEY (id_diagnostico)
          REFERENCES irl_diagnostic.diagnostico (id_diagnostico) ON DELETE CASCADE,
        CONSTRAINT fk_iniciativa_sector FOREIGN KEY (id_sector)
          REFERENCES irl_catalog.sector (id_sector)
      )
    `);

    // ── irl_diagnostic.resultado_dimension ──────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.resultado_dimension (
        id_resultado      bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_diagnostico    uuid          NOT NULL,
        id_dimension      integer       NOT NULL,
        promedio_likert   numeric(4,3)  NOT NULL,
        nivel_irl         integer       NOT NULL,
        en_estado_critico boolean       NOT NULL,
        es_cuello_botella boolean       NOT NULL,
        fecha_calculo     timestamptz   NOT NULL,
        CONSTRAINT uq_resultado_diag_dim UNIQUE (id_diagnostico, id_dimension),
        CONSTRAINT ck_resultado_nivel_irl CHECK (nivel_irl BETWEEN 1 AND 9),
        CONSTRAINT ck_resultado_promedio  CHECK (promedio_likert BETWEEN 1 AND 5),
        CONSTRAINT fk_resultado_diagnostico FOREIGN KEY (id_diagnostico)
          REFERENCES irl_diagnostic.diagnostico (id_diagnostico) ON DELETE CASCADE,
        CONSTRAINT fk_resultado_dimension FOREIGN KEY (id_dimension)
          REFERENCES irl_catalog.dimension (id_dimension)
      )
    `);

    // ── irl_diagnostic.analisis_desequilibrio ────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.analisis_desequilibrio (
        id_desequilibrio  bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_diagnostico    uuid          NOT NULL,
        id_par            integer       NOT NULL,
        diferencia_niveles integer      NOT NULL,
        clasificacion     varchar(16)   NOT NULL,
        CONSTRAINT uq_desequilibrio_diag_par UNIQUE (id_diagnostico, id_par),
        CONSTRAINT ck_desequilibrio_clasificacion CHECK (
          clasificacion IN ('CRITICO', 'MODERADO', 'ACEPTABLE')
        ),
        CONSTRAINT fk_desequilibrio_diagnostico FOREIGN KEY (id_diagnostico)
          REFERENCES irl_diagnostic.diagnostico (id_diagnostico) ON DELETE CASCADE,
        CONSTRAINT fk_desequilibrio_par FOREIGN KEY (id_par)
          REFERENCES irl_catalog.par_dimension (id_par)
      )
    `);

    // ── irl_diagnostic.notificacion ──────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.notificacion (
        id_notificacion bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_diagnostico  uuid          NOT NULL,
        tipo            varchar(16)   NOT NULL,
        destinatario    varchar(200)  NOT NULL,
        timestamp_envio timestamptz   NOT NULL,
        estado_envio    varchar(16)   NOT NULL,
        mensaje_error   varchar(500),
        numero_intentos integer       NOT NULL DEFAULT 0,
        CONSTRAINT uq_notificacion_diag_tipo UNIQUE (id_diagnostico, tipo),
        CONSTRAINT fk_notificacion_diagnostico FOREIGN KEY (id_diagnostico)
          REFERENCES irl_diagnostic.diagnostico (id_diagnostico) ON DELETE CASCADE
      )
    `);

    // ── irl_diagnostic.recomendacion_portafolio ──────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.recomendacion_portafolio (
        id_recomendacion       bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_diagnostico         uuid          NOT NULL,
        id_regla               bigint        NOT NULL,
        servicio_snapshot      varchar(80)   NOT NULL,
        justificacion_criterio varchar(1000) NOT NULL,
        fecha_generacion       timestamptz   NOT NULL,
        CONSTRAINT uq_recomendacion_diagnostico UNIQUE (id_diagnostico),
        CONSTRAINT fk_recomendacion_diagnostico FOREIGN KEY (id_diagnostico)
          REFERENCES irl_diagnostic.diagnostico (id_diagnostico) ON DELETE CASCADE,
        CONSTRAINT fk_recomendacion_regla FOREIGN KEY (id_regla)
          REFERENCES irl_catalog.regla_enrutamiento (id_regla)
      )
    `);

    // ── irl_diagnostic.descarga_reporte ──────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.descarga_reporte (
        id_descarga        bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_diagnostico     uuid          NOT NULL,
        keycloak_user_id   varchar(64)   NOT NULL,
        timestamp_descarga timestamptz   NOT NULL,
        formato            varchar(8)    NOT NULL,
        tamano_bytes       integer,
        incluye_atribucion boolean       NOT NULL,
        CONSTRAINT fk_descarga_diagnostico FOREIGN KEY (id_diagnostico)
          REFERENCES irl_diagnostic.diagnostico (id_diagnostico) ON DELETE CASCADE
      )
    `);

    // ── irl_diagnostic.evento_auditoria ──────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.evento_auditoria (
        id_evento        bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_diagnostico   uuid          NOT NULL,
        tipo_evento      varchar(40)   NOT NULL,
        keycloak_user_id varchar(64),
        timestamp_evento timestamptz   NOT NULL,
        metadata         varchar(4000),
        CONSTRAINT fk_evento_diagnostico FOREIGN KEY (id_diagnostico)
          REFERENCES irl_diagnostic.diagnostico (id_diagnostico) ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_diagnostic.evento_auditoria`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_diagnostic.descarga_reporte`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_diagnostic.recomendacion_portafolio`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS irl_diagnostic.notificacion`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_diagnostic.analisis_desequilibrio`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_diagnostic.resultado_dimension`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS irl_diagnostic.iniciativa`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_diagnostic.consentimiento`,
    );
  }
}

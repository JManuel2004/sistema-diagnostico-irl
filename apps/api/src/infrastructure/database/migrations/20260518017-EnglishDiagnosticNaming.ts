import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Renames the diagnostic-owned table, its columns and the foreign-key
 * columns that point at it, and translates the stored state values.
 *
 * The state values are data, not just schema, so the rename is done in
 * three steps: widen the CHECK to accept both vocabularies, rewrite the
 * rows, then narrow the CHECK to the English vocabulary only. Doing it
 * in that order keeps the table valid at every point, which a single
 * DROP/ADD around a bare UPDATE would not.
 *
 * `keycloak_user_id` is deliberately NOT renamed here: it is already an
 * English identifier. That it names a provider the system never used is
 * a separate naming-accuracy issue, not a translation one.
 */
export class EnglishDiagnosticNaming1747526400017
  implements MigrationInterface
{
  name = 'EnglishDiagnosticNaming1747526400017';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── state values: widen, rewrite, narrow ─────────────────────────────
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.diagnostico DROP CONSTRAINT ck_diagnostico_estado`,
    );
    await queryRunner.query(`
      UPDATE irl_diagnostic.diagnostico SET estado = CASE estado
        WHEN 'INICIADO'                    THEN 'STARTED'
        WHEN 'CON_CONSENTIMIENTO'          THEN 'WITH_CONSENT'
        WHEN 'CON_INICIATIVA'              THEN 'WITH_INITIATIVE'
        WHEN 'CUESTIONARIO_EN_CURSO'       THEN 'QUESTIONNAIRE_IN_PROGRESS'
        WHEN 'CUESTIONARIO_COMPLETO'       THEN 'QUESTIONNAIRE_COMPLETE'
        WHEN 'PERFIL_GENERADO'             THEN 'PROFILE_GENERATED'
        WHEN 'ANALISIS_PROFUNDO_DECLINADO' THEN 'DEEP_ANALYSIS_DECLINED'
        WHEN 'ANALISIS_PROFUNDO_EN_CURSO'  THEN 'DEEP_ANALYSIS_IN_PROGRESS'
        WHEN 'ANALISIS_PROFUNDO_COMPLETO'  THEN 'DEEP_ANALYSIS_COMPLETE'
        ELSE estado
      END
    `);

    // ── table and columns ────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.diagnostico RENAME TO diagnostic`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.diagnostic RENAME COLUMN id_diagnostico TO id`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.diagnostic RENAME COLUMN fecha_inicio TO started_at`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.diagnostic RENAME COLUMN fecha_fin_fase_1 TO phase_1_completed_at`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.diagnostic RENAME COLUMN fecha_fin_fase_2 TO phase_2_completed_at`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.diagnostic RENAME COLUMN estado TO state`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.diagnostic RENAME COLUMN version_marco_irl TO irl_framework_version`,
    );
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.diagnostic
        ADD CONSTRAINT ck_diagnostic_state CHECK (state IN (
          'STARTED',
          'WITH_CONSENT',
          'WITH_INITIATIVE',
          'QUESTIONNAIRE_IN_PROGRESS',
          'QUESTIONNAIRE_COMPLETE',
          'PROFILE_GENERATED',
          'DEEP_ANALYSIS_DECLINED',
          'DEEP_ANALYSIS_IN_PROGRESS',
          'DEEP_ANALYSIS_COMPLETE'
        ))
    `);
    await queryRunner.query(
      `ALTER INDEX irl_diagnostic.ix_diagnostico_keycloak RENAME TO ix_diagnostic_user`,
    );

    // ── foreign-key columns in the tables already normalised ─────────────
    //
    // Postgres updates the dependent FK constraint definitions on its own
    // when a referenced table or column is renamed, so only the column
    // names need touching here. The orphan modules' tables keep their
    // `id_diagnostico` column until those modules are built.
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.answer RENAME COLUMN id_diagnostico TO id_diagnostic`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME COLUMN id_diagnostico TO id_diagnostic`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.imbalance_analysis RENAME COLUMN id_diagnostico TO id_diagnostic`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.imbalance_analysis RENAME COLUMN id_diagnostic TO id_diagnostico`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME COLUMN id_diagnostic TO id_diagnostico`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.answer RENAME COLUMN id_diagnostic TO id_diagnostico`,
    );

    await queryRunner.query(
      `ALTER INDEX irl_diagnostic.ix_diagnostic_user RENAME TO ix_diagnostico_keycloak`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.diagnostic DROP CONSTRAINT ck_diagnostic_state`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.diagnostic RENAME COLUMN irl_framework_version TO version_marco_irl`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.diagnostic RENAME COLUMN state TO estado`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.diagnostic RENAME COLUMN phase_2_completed_at TO fecha_fin_fase_2`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.diagnostic RENAME COLUMN phase_1_completed_at TO fecha_fin_fase_1`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.diagnostic RENAME COLUMN started_at TO fecha_inicio`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.diagnostic RENAME COLUMN id TO id_diagnostico`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.diagnostic RENAME TO diagnostico`,
    );

    await queryRunner.query(`
      UPDATE irl_diagnostic.diagnostico SET estado = CASE estado
        WHEN 'STARTED'                   THEN 'INICIADO'
        WHEN 'WITH_CONSENT'              THEN 'CON_CONSENTIMIENTO'
        WHEN 'WITH_INITIATIVE'           THEN 'CON_INICIATIVA'
        WHEN 'QUESTIONNAIRE_IN_PROGRESS' THEN 'CUESTIONARIO_EN_CURSO'
        WHEN 'QUESTIONNAIRE_COMPLETE'    THEN 'CUESTIONARIO_COMPLETO'
        WHEN 'PROFILE_GENERATED'         THEN 'PERFIL_GENERADO'
        WHEN 'DEEP_ANALYSIS_DECLINED'    THEN 'ANALISIS_PROFUNDO_DECLINADO'
        WHEN 'DEEP_ANALYSIS_IN_PROGRESS' THEN 'ANALISIS_PROFUNDO_EN_CURSO'
        WHEN 'DEEP_ANALYSIS_COMPLETE'    THEN 'ANALISIS_PROFUNDO_COMPLETO'
        ELSE estado
      END
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.diagnostico
        ADD CONSTRAINT ck_diagnostico_estado CHECK (estado IN (
          'INICIADO',
          'CON_CONSENTIMIENTO',
          'CON_INICIATIVA',
          'CUESTIONARIO_EN_CURSO',
          'CUESTIONARIO_COMPLETO',
          'PERFIL_GENERADO',
          'ANALISIS_PROFUNDO_DECLINADO',
          'ANALISIS_PROFUNDO_EN_CURSO',
          'ANALISIS_PROFUNDO_COMPLETO'
        ))
    `);
  }
}

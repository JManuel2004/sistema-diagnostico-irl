import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Renames the `initiative`/`consent` tables and columns from Spanish to
 * English. These two were never in scope for the Fase 3 mechanical pass
 * (`irl-catalog`, `questionnaire`, `maturity-profile`, `diagnostic`,
 * `portfolio-routing`, `scaling-roadmap`, `identity` — the seven modules
 * that had a domain layer at the time); they were ORM-only orphans until
 * this oleada builds their domain, so the rename lands here instead.
 *
 * `sector` the table name is already English and is not renamed, only
 * its columns. `etapa_iniciativa` becomes `initiative_stage`;
 * `iniciativa` becomes `initiative`; `consentimiento` becomes `consent`.
 * `keycloak_user_id` is left as is, same reasoning as everywhere else
 * in this refactor (backlog 6.9 — naming accuracy, not urgent).
 */
export class EnglishInitiativeConsentNaming1747526400020
  implements MigrationInterface
{
  name = 'EnglishInitiativeConsentNaming1747526400020';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── irl_catalog.sector — columns only, table name already English ────
    await queryRunner.query(
      `ALTER TABLE irl_catalog.sector RENAME COLUMN id_sector TO id`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.sector RENAME COLUMN nombre TO name`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.sector RENAME COLUMN activo TO is_active`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.sector RENAME CONSTRAINT uq_sector_nombre TO uq_sector_name`,
    );

    // ── irl_catalog.etapa_iniciativa -> initiative_stage ──────────────────
    await queryRunner.query(
      `ALTER TABLE irl_catalog.etapa_iniciativa RENAME TO initiative_stage`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.initiative_stage RENAME COLUMN id_etapa TO id`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.initiative_stage RENAME COLUMN codigo TO code`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.initiative_stage RENAME COLUMN nombre TO name`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.initiative_stage RENAME COLUMN orden TO sequence`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.initiative_stage RENAME COLUMN activo TO is_active`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.initiative_stage RENAME CONSTRAINT uq_etapa_codigo TO uq_initiative_stage_code`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.initiative_stage RENAME CONSTRAINT uq_etapa_orden TO uq_initiative_stage_sequence`,
    );

    // ── irl_diagnostic.iniciativa -> initiative ───────────────────────────
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.iniciativa RENAME TO initiative`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME COLUMN id_iniciativa TO id`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME COLUMN id_diagnostico TO id_diagnostic`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME COLUMN nombre TO name`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME COLUMN descripcion_breve TO short_description`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME COLUMN id_etapa TO id_stage`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME COLUMN tamano_equipo TO team_size`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME COLUMN vinculacion_academica TO academic_linkage`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME CONSTRAINT uq_iniciativa_diagnostico TO uq_initiative_diagnostic`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME CONSTRAINT fk_iniciativa_diagnostico TO fk_initiative_diagnostic`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME CONSTRAINT fk_iniciativa_sector TO fk_initiative_sector`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME CONSTRAINT fk_iniciativa_etapa TO fk_initiative_stage`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME CONSTRAINT ck_iniciativa_tamano_equipo TO ck_initiative_team_size`,
    );

    // ── irl_diagnostic.consentimiento -> consent ──────────────────────────
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.consentimiento RENAME TO consent`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.consent RENAME COLUMN id_consentimiento TO id`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.consent RENAME COLUMN id_diagnostico TO id_diagnostic`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.consent RENAME COLUMN aceptado TO accepted`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.consent RENAME COLUMN timestamp_aceptacion TO accepted_at`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.consent RENAME COLUMN version_terminos TO terms_version`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.consent RENAME CONSTRAINT uq_consentimiento_diagnostico TO uq_consent_diagnostic`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.consent RENAME CONSTRAINT fk_consentimiento_diagnostico TO fk_consent_diagnostic`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.consent RENAME CONSTRAINT fk_consent_diagnostic TO fk_consentimiento_diagnostico`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.consent RENAME CONSTRAINT uq_consent_diagnostic TO uq_consentimiento_diagnostico`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.consent RENAME COLUMN terms_version TO version_terminos`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.consent RENAME COLUMN accepted_at TO timestamp_aceptacion`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.consent RENAME COLUMN accepted TO aceptado`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.consent RENAME COLUMN id_diagnostic TO id_diagnostico`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.consent RENAME COLUMN id TO id_consentimiento`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.consent RENAME TO consentimiento`,
    );

    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME CONSTRAINT ck_initiative_team_size TO ck_iniciativa_tamano_equipo`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME CONSTRAINT fk_initiative_stage TO fk_iniciativa_etapa`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME CONSTRAINT fk_initiative_sector TO fk_iniciativa_sector`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME CONSTRAINT fk_initiative_diagnostic TO fk_iniciativa_diagnostico`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME CONSTRAINT uq_initiative_diagnostic TO uq_iniciativa_diagnostico`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME COLUMN academic_linkage TO vinculacion_academica`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME COLUMN team_size TO tamano_equipo`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME COLUMN id_stage TO id_etapa`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME COLUMN short_description TO descripcion_breve`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME COLUMN name TO nombre`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME COLUMN id_diagnostic TO id_diagnostico`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME COLUMN id TO id_iniciativa`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.initiative RENAME TO iniciativa`,
    );

    await queryRunner.query(
      `ALTER TABLE irl_catalog.initiative_stage RENAME CONSTRAINT uq_initiative_stage_sequence TO uq_etapa_orden`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.initiative_stage RENAME CONSTRAINT uq_initiative_stage_code TO uq_etapa_codigo`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.initiative_stage RENAME COLUMN is_active TO activo`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.initiative_stage RENAME COLUMN sequence TO orden`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.initiative_stage RENAME COLUMN name TO nombre`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.initiative_stage RENAME COLUMN code TO codigo`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.initiative_stage RENAME COLUMN id TO id_etapa`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.initiative_stage RENAME TO etapa_iniciativa`,
    );

    await queryRunner.query(
      `ALTER TABLE irl_catalog.sector RENAME CONSTRAINT uq_sector_name TO uq_sector_nombre`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.sector RENAME COLUMN is_active TO activo`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.sector RENAME COLUMN name TO nombre`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.sector RENAME COLUMN id TO id_sector`,
    );
  }
}

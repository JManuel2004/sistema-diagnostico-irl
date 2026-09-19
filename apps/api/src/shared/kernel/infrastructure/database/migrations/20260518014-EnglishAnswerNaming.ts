import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Renames the questionnaire-owned `respuesta` table and its columns
 * from Spanish to English, per the project's language convention.
 *
 * `id_diagnostico` is left unchanged — it is a foreign key into
 * `irl_diagnostic.diagnostico`, owned by the `diagnostic` module and
 * renamed in that module's own batch (which will also update this
 * table's FK constraint, the same pattern migration 013 used for
 * `id_afirmacion` here).
 */
export class EnglishAnswerNaming1747526400014 implements MigrationInterface {
  name = 'EnglishAnswerNaming1747526400014';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.respuesta RENAME TO answer`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.answer RENAME COLUMN id_respuesta TO id`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.answer RENAME COLUMN id_afirmacion TO id_statement`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.answer RENAME COLUMN valor_likert TO likert_value`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.answer RENAME COLUMN fecha_respuesta TO answered_at`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.answer RENAME CONSTRAINT uq_respuesta_diag_afirmacion TO uq_answer_diagnostic_statement`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.answer RENAME CONSTRAINT fk_respuesta_afirmacion TO fk_answer_statement`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.answer RENAME CONSTRAINT fk_respuesta_diagnostico TO fk_answer_diagnostic`,
    );
    await queryRunner.query(
      `ALTER INDEX irl_diagnostic.ix_respuesta_diagnostico RENAME TO ix_answer_diagnostic`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER INDEX irl_diagnostic.ix_answer_diagnostic RENAME TO ix_respuesta_diagnostico`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.answer RENAME CONSTRAINT fk_answer_diagnostic TO fk_respuesta_diagnostico`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.answer RENAME CONSTRAINT fk_answer_statement TO fk_respuesta_afirmacion`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.answer RENAME CONSTRAINT uq_answer_diagnostic_statement TO uq_respuesta_diag_afirmacion`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.answer RENAME COLUMN answered_at TO fecha_respuesta`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.answer RENAME COLUMN likert_value TO valor_likert`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.answer RENAME COLUMN id_statement TO id_afirmacion`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.answer RENAME COLUMN id TO id_respuesta`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.answer RENAME TO respuesta`,
    );
  }
}

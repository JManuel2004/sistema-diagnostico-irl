import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The questionnaire draft table was added by editing the initial migration.
 * A database that had already applied that migration does not have
 * `draft_answer`, so saving an answer in progress would fail. This creates
 * the table in place. A database created from the current initial migration
 * already has it, and `IF NOT EXISTS` leaves that one alone.
 */
export class DraftAnswer1793664000002 implements MigrationInterface {
  name = 'DraftAnswer1793664000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS irl_diagnostic.draft_answer (
        id_diagnostic uuid NOT NULL,
        id_statement bigint NOT NULL,
        likert_value integer,
        justification character varying(1000),
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT pk_draft_answer PRIMARY KEY (id_diagnostic, id_statement),
        CONSTRAINT ck_draft_answer_not_empty CHECK (likert_value IS NOT NULL OR justification IS NOT NULL),
        CONSTRAINT ck_draft_answer_justification CHECK (justification IS NULL OR justification ~ '\\S'),
        CONSTRAINT ck_draft_answer_likert_value CHECK (likert_value IS NULL OR likert_value BETWEEN 1 AND 5),
        CONSTRAINT fk_draft_answer_diagnostic FOREIGN KEY (id_diagnostic) REFERENCES irl_diagnostic.diagnostic (id) ON DELETE CASCADE,
        CONSTRAINT fk_draft_answer_statement FOREIGN KEY (id_statement) REFERENCES irl_catalog.statement (id_statement)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS irl_diagnostic.draft_answer`);
  }
}

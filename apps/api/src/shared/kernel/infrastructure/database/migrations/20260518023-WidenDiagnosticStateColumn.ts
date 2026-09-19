import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Widens `diagnostic.state` from `varchar(24)` to `varchar(32)`.
 *
 * The English rename (migration 20260518017) rewrote the CHECK constraint
 * with the English state names but left the column at the width sized for
 * the Spanish ones. `QUESTIONNAIRE_IN_PROGRESS` and
 * `DEEP_ANALYSIS_IN_PROGRESS` are 25 characters, so any write of those two
 * valid states failed with "value too long for type character varying(24)"
 * on a real database — including the transition `RequestDeepAnalysisUseCase`
 * performs.
 *
 * `down()` narrows the column back. It fails if a row already holds one of
 * the two 25-character states, which is the correct outcome: silently
 * truncating a state would corrupt the state machine.
 */
export class WidenDiagnosticStateColumn1747526400023 implements MigrationInterface {
  name = 'WidenDiagnosticStateColumn1747526400023';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.diagnostic
        ALTER COLUMN state TYPE varchar(32)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.diagnostic
        ALTER COLUMN state TYPE varchar(24)
    `);
  }
}

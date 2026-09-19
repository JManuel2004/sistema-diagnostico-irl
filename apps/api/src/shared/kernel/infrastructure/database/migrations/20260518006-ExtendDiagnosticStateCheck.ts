import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Aligns `ck_diagnostico_estado` with the state machine the code already
 * declares.
 *
 * The initial migration allowed six states, stopping at `PERFIL_GENERADO`.
 * Both `DiagnosticState` (the domain VO) and `diagnosticStateSchema` (the
 * shared contract) declare nine, and `FinalizeInitialDiagnosticUseCase`
 * already lists the three deep-analysis states in `FINALIZABLE_STATES` —
 * so a `save()` carrying any of them would have been rejected by the CHECK.
 *
 * Portfolio routing (RF-15) happens inside the deep analysis, which means
 * persisting a recommendation requires the diagnostic to reach
 * `ANALISIS_PROFUNDO_EN_CURSO`. This migration is what makes that legal.
 */
export class ExtendDiagnosticStateCheck1747526400006
  implements MigrationInterface
{
  name = 'ExtendDiagnosticStateCheck1747526400006';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.diagnostico
        DROP CONSTRAINT ck_diagnostico_estado
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

  async down(queryRunner: QueryRunner): Promise<void> {
    // Rows already sitting in a deep-analysis state would violate the
    // narrower constraint, so walk them back to the last state the old
    // CHECK accepted before reinstating it.
    await queryRunner.query(`
      UPDATE irl_diagnostic.diagnostico
         SET estado = 'PERFIL_GENERADO'
       WHERE estado IN (
         'ANALISIS_PROFUNDO_DECLINADO',
         'ANALISIS_PROFUNDO_EN_CURSO',
         'ANALISIS_PROFUNDO_COMPLETO'
       )
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.diagnostico
        DROP CONSTRAINT ck_diagnostico_estado
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.diagnostico
        ADD CONSTRAINT ck_diagnostico_estado CHECK (estado IN (
          'INICIADO',
          'CON_CONSENTIMIENTO',
          'CON_INICIATIVA',
          'CUESTIONARIO_EN_CURSO',
          'CUESTIONARIO_COMPLETO',
          'PERFIL_GENERADO'
        ))
    `);
  }
}

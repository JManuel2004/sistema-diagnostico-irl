import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Renames the maturity-profile-owned tables and columns from Spanish to
 * English identifiers.
 *
 * `id_diagnostico` is left unchanged in both tables — it is a foreign key
 * into `irl_diagnostic.diagnostico`, owned by the `diagnostic` module and
 * renamed in that module's own batch, which will also update these two
 * foreign-key constraints.
 *
 * `id_par` does change here: `irl_catalog.par_dimension(id_par)` already
 * became `dimension_pair(id_pair)`, and this is the batch that owns the
 * referencing column.
 *
 * The values stored in `classification` (`CRITICO`/`MODERADO`/`ACEPTABLE`)
 * are deliberately NOT translated here: they are stored data, not
 * identifiers, and the HTTP contract already exposes them in English
 * through a mapper. Translating stored enum values is a separate decision
 * from renaming the schema.
 */
export class EnglishMaturityProfileNaming1747526400015
  implements MigrationInterface
{
  name = 'EnglishMaturityProfileNaming1747526400015';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── irl_diagnostic.resultado_dimension -> dimension_result ───────────
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.resultado_dimension RENAME TO dimension_result`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME COLUMN id_resultado TO id`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME COLUMN promedio_likert TO likert_average`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME COLUMN nivel_irl TO irl_level`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME COLUMN en_estado_critico TO in_critical_state`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME COLUMN es_cuello_botella TO is_bottleneck`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME COLUMN fecha_calculo TO computed_at`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME CONSTRAINT uq_resultado_diag_dim TO uq_dimension_result_diag_dim`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME CONSTRAINT ck_resultado_nivel_irl TO ck_dimension_result_irl_level`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME CONSTRAINT ck_resultado_promedio TO ck_dimension_result_likert_average`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME CONSTRAINT fk_resultado_diagnostico TO fk_dimension_result_diagnostic`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME CONSTRAINT fk_resultado_dimension TO fk_dimension_result_dimension`,
    );

    // ── irl_diagnostic.analisis_desequilibrio -> imbalance_analysis ──────
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.analisis_desequilibrio RENAME TO imbalance_analysis`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.imbalance_analysis RENAME COLUMN id_desequilibrio TO id`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.imbalance_analysis RENAME COLUMN id_par TO id_pair`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.imbalance_analysis RENAME COLUMN diferencia_niveles TO level_difference`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.imbalance_analysis RENAME COLUMN clasificacion TO classification`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.imbalance_analysis RENAME CONSTRAINT uq_desequilibrio_diag_par TO uq_imbalance_analysis_diag_pair`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.imbalance_analysis RENAME CONSTRAINT ck_desequilibrio_clasificacion TO ck_imbalance_analysis_classification`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.imbalance_analysis RENAME CONSTRAINT fk_desequilibrio_diagnostico TO fk_imbalance_analysis_diagnostic`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.imbalance_analysis RENAME CONSTRAINT fk_desequilibrio_par TO fk_imbalance_analysis_pair`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.imbalance_analysis RENAME CONSTRAINT fk_imbalance_analysis_pair TO fk_desequilibrio_par`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.imbalance_analysis RENAME CONSTRAINT fk_imbalance_analysis_diagnostic TO fk_desequilibrio_diagnostico`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.imbalance_analysis RENAME CONSTRAINT ck_imbalance_analysis_classification TO ck_desequilibrio_clasificacion`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.imbalance_analysis RENAME CONSTRAINT uq_imbalance_analysis_diag_pair TO uq_desequilibrio_diag_par`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.imbalance_analysis RENAME COLUMN classification TO clasificacion`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.imbalance_analysis RENAME COLUMN level_difference TO diferencia_niveles`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.imbalance_analysis RENAME COLUMN id_pair TO id_par`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.imbalance_analysis RENAME COLUMN id TO id_desequilibrio`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.imbalance_analysis RENAME TO analisis_desequilibrio`,
    );

    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME CONSTRAINT fk_dimension_result_dimension TO fk_resultado_dimension`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME CONSTRAINT fk_dimension_result_diagnostic TO fk_resultado_diagnostico`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME CONSTRAINT ck_dimension_result_likert_average TO ck_resultado_promedio`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME CONSTRAINT ck_dimension_result_irl_level TO ck_resultado_nivel_irl`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME CONSTRAINT uq_dimension_result_diag_dim TO uq_resultado_diag_dim`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME COLUMN computed_at TO fecha_calculo`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME COLUMN is_bottleneck TO es_cuello_botella`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME COLUMN in_critical_state TO en_estado_critico`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME COLUMN irl_level TO nivel_irl`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME COLUMN likert_average TO promedio_likert`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME COLUMN id TO id_resultado`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.dimension_result RENAME TO resultado_dimension`,
    );
  }
}

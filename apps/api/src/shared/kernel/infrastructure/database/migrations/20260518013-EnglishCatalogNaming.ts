import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Renames the irl-catalog-owned tables and columns from Spanish to
 * English identifiers, per the project's language convention.
 *
 * Scope: only the four tables whose ORM entities live in
 * `modules/irl-catalog/` — `dimension`, `afirmacion`, `rango_conversion`,
 * `par_dimension`, `texto_roadmap`. `sector` and `servicio_portafolio`
 * (created by migration 003 but owned by the `initiative` and
 * `portfolio-routing` modules respectively) are out of scope here and
 * are renamed in their own modules' batches.
 *
 * `dimension` itself is not renamed (already an English word); only its
 * Spanish columns change. Renaming `afirmacion`, `rango_conversion` and
 * `par_dimension` requires updating the foreign-key constraints in
 * `irl_diagnostic.respuesta` and `irl_diagnostic.analisis_desequilibrio`
 * that reference them — those two tables' own columns are left
 * unchanged here (deferred to the `questionnaire` and `maturity-profile`
 * batches) but their FK constraints must point at the new names.
 */
export class EnglishCatalogNaming1747526400013 implements MigrationInterface {
  name = 'EnglishCatalogNaming1747526400013';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── irl_catalog.dimension — column renames only ──────────────────────
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME COLUMN codigo TO code`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME COLUMN nombre_es TO name_es`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME COLUMN nombre_en TO name_en`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME COLUMN descripcion TO description`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME COLUMN es_dimension_critica TO is_critical_dimension`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME COLUMN orden TO sequence`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME COLUMN nivel_minimo_esperado TO minimum_expected_level`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME CONSTRAINT uq_dimension_codigo TO uq_dimension_code`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME CONSTRAINT uq_dimension_orden TO uq_dimension_sequence`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME CONSTRAINT ck_dimension_codigo TO ck_dimension_code`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME CONSTRAINT ck_dimension_orden TO ck_dimension_sequence`,
    );

    // ── irl_catalog.afirmacion → statement ────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE irl_catalog.afirmacion RENAME TO statement`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.statement RENAME COLUMN id_afirmacion TO id_statement`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.statement RENAME COLUMN numero_en_dimension TO sequence`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.statement RENAME COLUMN texto_es TO text_es`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.statement RENAME CONSTRAINT uq_afirmacion_dim_numero TO uq_statement_dim_sequence`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.statement RENAME CONSTRAINT ck_afirmacion_numero TO ck_statement_sequence`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.statement RENAME CONSTRAINT fk_afirmacion_dimension TO fk_statement_dimension`,
    );
    await queryRunner.query(
      `ALTER INDEX irl_catalog.ix_afirmacion_dimension RENAME TO ix_statement_dimension`,
    );

    // `respuesta` keeps its own column name for now (renamed in the
    // questionnaire batch) but its FK must follow the renamed target.
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.respuesta DROP CONSTRAINT fk_respuesta_afirmacion`,
    );
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.respuesta
        ADD CONSTRAINT fk_respuesta_afirmacion FOREIGN KEY (id_afirmacion)
          REFERENCES irl_catalog.statement (id_statement)
    `);

    // ── irl_catalog.rango_conversion → conversion_range ───────────────────
    await queryRunner.query(
      `ALTER TABLE irl_catalog.rango_conversion RENAME TO conversion_range`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.conversion_range RENAME COLUMN nivel_irl TO irl_level`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.conversion_range RENAME CONSTRAINT ck_rango_conversion_nivel TO ck_conversion_range_level`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.conversion_range RENAME CONSTRAINT ck_rango_conversion_bounds TO ck_conversion_range_bounds`,
    );

    // ── irl_catalog.par_dimension → dimension_pair ────────────────────────
    await queryRunner.query(
      `ALTER TABLE irl_catalog.par_dimension RENAME TO dimension_pair`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_pair RENAME COLUMN id_par TO id_pair`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_pair RENAME COLUMN codigo_par TO pair_code`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_pair RENAME CONSTRAINT uq_par_codigo TO uq_dimension_pair_code`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_pair RENAME CONSTRAINT uq_par_dims TO uq_dimension_pair_dims`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_pair RENAME CONSTRAINT ck_par_dims TO ck_dimension_pair_dims`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_pair RENAME CONSTRAINT fk_par_dim_a TO fk_dimension_pair_dim_a`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_pair RENAME CONSTRAINT fk_par_dim_b TO fk_dimension_pair_dim_b`,
    );

    // `analisis_desequilibrio` keeps its own column name for now (renamed
    // in the maturity-profile batch) but its FK must follow suit.
    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.analisis_desequilibrio DROP CONSTRAINT fk_desequilibrio_par`,
    );
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.analisis_desequilibrio
        ADD CONSTRAINT fk_desequilibrio_par FOREIGN KEY (id_par)
          REFERENCES irl_catalog.dimension_pair (id_pair)
    `);

    // ── irl_catalog.texto_roadmap → roadmap_text ──────────────────────────
    // Dead table today (no seed, not registered in any module at runtime)
    // — renamed for consistency, no dependent FK constraints exist.
    await queryRunner.query(
      `ALTER TABLE irl_catalog.texto_roadmap RENAME TO roadmap_text`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.roadmap_text RENAME COLUMN id_texto_roadmap TO id_roadmap_text`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.roadmap_text RENAME COLUMN nivel_irl TO irl_level`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.roadmap_text RENAME COLUMN texto_orientacion TO guidance_text`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.roadmap_text RENAME CONSTRAINT uq_roadmap_dim_nivel TO uq_roadmap_text_dim_level`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.roadmap_text RENAME CONSTRAINT ck_roadmap_nivel TO ck_roadmap_text_level`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.roadmap_text RENAME CONSTRAINT fk_roadmap_dimension TO fk_roadmap_text_dimension`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE irl_catalog.roadmap_text RENAME CONSTRAINT fk_roadmap_text_dimension TO fk_roadmap_dimension`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.roadmap_text RENAME CONSTRAINT ck_roadmap_text_level TO ck_roadmap_nivel`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.roadmap_text RENAME CONSTRAINT uq_roadmap_text_dim_level TO uq_roadmap_dim_nivel`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.roadmap_text RENAME COLUMN guidance_text TO texto_orientacion`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.roadmap_text RENAME COLUMN irl_level TO nivel_irl`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.roadmap_text RENAME COLUMN id_roadmap_text TO id_texto_roadmap`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.roadmap_text RENAME TO texto_roadmap`,
    );

    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.analisis_desequilibrio DROP CONSTRAINT fk_desequilibrio_par`,
    );
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.analisis_desequilibrio
        ADD CONSTRAINT fk_desequilibrio_par FOREIGN KEY (id_par)
          REFERENCES irl_catalog.par_dimension (id_par)
    `);

    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_pair RENAME CONSTRAINT fk_dimension_pair_dim_b TO fk_par_dim_b`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_pair RENAME CONSTRAINT fk_dimension_pair_dim_a TO fk_par_dim_a`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_pair RENAME CONSTRAINT ck_dimension_pair_dims TO ck_par_dims`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_pair RENAME CONSTRAINT uq_dimension_pair_dims TO uq_par_dims`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_pair RENAME CONSTRAINT uq_dimension_pair_code TO uq_par_codigo`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_pair RENAME COLUMN pair_code TO codigo_par`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_pair RENAME COLUMN id_pair TO id_par`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension_pair RENAME TO par_dimension`,
    );

    await queryRunner.query(
      `ALTER TABLE irl_catalog.conversion_range RENAME CONSTRAINT ck_conversion_range_bounds TO ck_rango_conversion_bounds`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.conversion_range RENAME CONSTRAINT ck_conversion_range_level TO ck_rango_conversion_nivel`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.conversion_range RENAME COLUMN irl_level TO nivel_irl`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.conversion_range RENAME TO rango_conversion`,
    );

    await queryRunner.query(
      `ALTER TABLE irl_diagnostic.respuesta DROP CONSTRAINT fk_respuesta_afirmacion`,
    );
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.respuesta
        ADD CONSTRAINT fk_respuesta_afirmacion FOREIGN KEY (id_afirmacion)
          REFERENCES irl_catalog.afirmacion (id_afirmacion)
    `);

    await queryRunner.query(
      `ALTER INDEX irl_catalog.ix_statement_dimension RENAME TO ix_afirmacion_dimension`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.statement RENAME CONSTRAINT fk_statement_dimension TO fk_afirmacion_dimension`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.statement RENAME CONSTRAINT ck_statement_sequence TO ck_afirmacion_numero`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.statement RENAME CONSTRAINT uq_statement_dim_sequence TO uq_afirmacion_dim_numero`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.statement RENAME COLUMN text_es TO texto_es`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.statement RENAME COLUMN sequence TO numero_en_dimension`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.statement RENAME COLUMN id_statement TO id_afirmacion`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.statement RENAME TO afirmacion`,
    );

    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME CONSTRAINT ck_dimension_sequence TO ck_dimension_orden`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME CONSTRAINT ck_dimension_code TO ck_dimension_codigo`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME CONSTRAINT uq_dimension_sequence TO uq_dimension_orden`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME CONSTRAINT uq_dimension_code TO uq_dimension_codigo`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME COLUMN minimum_expected_level TO nivel_minimo_esperado`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME COLUMN sequence TO orden`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME COLUMN is_critical_dimension TO es_dimension_critica`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME COLUMN description TO descripcion`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME COLUMN name_en TO nombre_en`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME COLUMN name_es TO nombre_es`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.dimension RENAME COLUMN code TO codigo`,
    );
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema — the single migration of the project.
 *
 * Consolidates the 25 incremental migrations that built the schema during
 * development (`convenciones-objetivo.md` §6). The project has no deployed
 * environment with real data, so the incremental history was a by-product of
 * how the system was built, not an operational record.
 *
 * **Every later schema change is made in this file, not in a new migration**,
 * for as long as that condition holds: edit `up()` (and `down()` if needed),
 * then rebuild the database (`db:migration:run` on an empty database, then
 * `db:seed`). The day an environment with real data exists this rule flips:
 * from then on each change is a new incremental migration, and this file is
 * never edited again. That switch is a product decision, not a technical one.
 *
 * Two schemas:
 *   - `irl_catalog`    — read-only at runtime; content comes from the seeds.
 *   - `irl_diagnostic` — transactional data of each diagnostic.
 *
 * The schema is the result of the 25 migrations, verified structurally
 * against it. Differences from that result are limited to identifiers:
 *   - identity sequences and primary keys carry the names PostgreSQL derives
 *     from the (English) table, instead of the Spanish ones inherited from
 *     tables renamed along the way;
 *   - `scoring_parameters.creado_en` is `created_at`;
 *   - `ck_respuesta_valor_likert` is `ck_answer_likert_value`;
 *   - the default of `portfolio_recommendation.result_type` is
 *     `'RECOMMENDATION'`. It used to be `'RECOMENDACION'`, a value its own
 *     CHECK constraint rejects.
 *
 * Notes on constraints that are not obvious from the DDL:
 *   - `ux_scoring_parameters_singleton` (`UNIQUE ((true))`) keeps
 *     `scoring_parameters` to a single row: the routing configuration is not
 *     versioned (backlog 5.6).
 *   - `diagnostic.state` allows exactly the states of the diagnostic state
 *     machine; adding one means widening `ck_diagnostic_state` here and the
 *     column width if needed (the longest today is 25 characters).
 *   - `published_exception_rule.action` is checked against the actions of
 *     `EXCEPTION_ACTIONS` in `@innlab/contracts`.
 *   - `notificacion`, `descarga_reporte` and `evento_auditoria` are reserved
 *     for the future `reporting/` module and still carry their original
 *     Spanish column names; they are translated when that module is designed.
 *
 * `dimension_result` carries no bottleneck flag: the bottleneck is computed
 * in the `MaturityProfile` aggregate (`bottleneck()`), never persisted.
 *
 * `down()` drops both schemas.
 */
export class InitialSchema1747526400001 implements MigrationInterface {
  name = 'InitialSchema1747526400001';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── Schemas ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE SCHEMA irl_catalog
    `);
    await queryRunner.query(`
      CREATE SCHEMA irl_diagnostic
    `);

    // ── irl_catalog tables (read-only at runtime; data comes from seeds) ──
    await queryRunner.query(`
      CREATE TABLE irl_catalog.statement (
          id_statement bigint GENERATED ALWAYS AS IDENTITY,
          id_dimension integer NOT NULL,
          sequence integer NOT NULL,
          text_es character varying(500) NOT NULL,
          CONSTRAINT ck_statement_sequence CHECK (((sequence >= 1) AND (sequence <= 8)))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_catalog.calibration_label_value (
          id bigint GENERATED ALWAYS AS IDENTITY,
          label character varying(24) NOT NULL,
          numeric_value numeric(4,2) NOT NULL,
          monotonicity_order integer NOT NULL,
          CONSTRAINT ck_calibration_label_value_range CHECK (((numeric_value >= (0)::numeric) AND (numeric_value <= (1)::numeric)))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_catalog.conversion_range (
          irl_level smallint NOT NULL,
          avg_min numeric(3,2) NOT NULL,
          avg_max numeric(3,2) NOT NULL,
          CONSTRAINT ck_conversion_range_bounds CHECK ((((avg_min >= (1)::numeric) AND (avg_min <= (5)::numeric)) AND ((avg_max >= (1)::numeric) AND (avg_max <= (5)::numeric)) AND (avg_min <= avg_max))),
          CONSTRAINT ck_conversion_range_level CHECK (((irl_level >= 1) AND (irl_level <= 9)))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_catalog.dimension_dependency (
          id integer GENERATED ALWAYS AS IDENTITY,
          id_dimension_source integer NOT NULL,
          id_dimension_target integer NOT NULL,
          minimum_required_level smallint NOT NULL,
          CONSTRAINT ck_dimension_dependency_not_reflexive CHECK ((id_dimension_source <> id_dimension_target)),
          CONSTRAINT ck_dimension_dependency_required_level CHECK (((minimum_required_level >= 1) AND (minimum_required_level <= 9)))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_catalog.dimension (
          id_dimension integer GENERATED ALWAYS AS IDENTITY,
          code character varying(8) NOT NULL,
          name_es character varying(80) NOT NULL,
          name_en character varying(80) NOT NULL,
          short_name_es character varying(40) NOT NULL,
          description character varying(500) NOT NULL,
          is_critical_dimension boolean DEFAULT false NOT NULL,
          sequence integer NOT NULL,
          minimum_expected_level smallint DEFAULT 4 NOT NULL,
          CONSTRAINT ck_dimension_code CHECK (((code)::text = ANY ((ARRAY['TRL'::character varying, 'CRL'::character varying, 'BRL'::character varying, 'IPRL'::character varying, 'TmRL'::character varying, 'FRL'::character varying])::text[]))),
          CONSTRAINT ck_dimension_minimum_level CHECK (((minimum_expected_level >= 1) AND (minimum_expected_level <= 9))),
          CONSTRAINT ck_dimension_sequence CHECK (((sequence >= 1) AND (sequence <= 6)))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_catalog.dimension_pair (
          id_pair integer GENERATED ALWAYS AS IDENTITY,
          id_dimension_a integer NOT NULL,
          id_dimension_b integer NOT NULL,
          pair_code character varying(16) NOT NULL,
          CONSTRAINT ck_dimension_pair_dims CHECK ((id_dimension_a <> id_dimension_b))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_catalog.initiative_stage (
          id bigint GENERATED ALWAYS AS IDENTITY,
          code character varying(24) NOT NULL,
          name character varying(80) NOT NULL,
          sequence integer NOT NULL,
          is_active boolean DEFAULT true NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_catalog.published_ordinal_profile (
          id bigint GENERATED ALWAYS AS IDENTITY,
          id_service integer NOT NULL,
          min_level integer NOT NULL,
          max_level integer NOT NULL,
          relevant_stages character varying(200) NOT NULL,
          CONSTRAINT ck_published_ordinal_profile_levels CHECK ((((min_level >= 1) AND (min_level <= 9)) AND ((max_level >= 1) AND (max_level <= 9)) AND (min_level <= max_level)))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_catalog.published_ordinal_intensity (
          id bigint GENERATED ALWAYS AS IDENTITY,
          id_ordinal_profile bigint NOT NULL,
          id_dimension integer NOT NULL,
          label character varying(24) NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_catalog.portfolio_service (
          id integer GENERATED ALWAYS AS IDENTITY,
          name character varying(80) NOT NULL,
          description character varying(500),
          is_active boolean DEFAULT true NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_catalog.published_eligibility_rule (
          id bigint GENERATED ALWAYS AS IDENTITY,
          id_service integer NOT NULL,
          predicate jsonb NOT NULL,
          exclusion_message character varying(500) NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_catalog.published_exception_rule (
          id bigint GENERATED ALWAYS AS IDENTITY,
          code character varying(16) NOT NULL,
          predicate jsonb NOT NULL,
          action character varying(16) NOT NULL,
          id_target_service integer NOT NULL,
          positions integer,
          declared_reason character varying(1000) NOT NULL,
          priority_order integer NOT NULL,
          CONSTRAINT ck_published_exception_rule_action CHECK (((action)::text = ANY ((ARRAY['FORCE'::character varying, 'VETO'::character varying, 'PROMOTE'::character varying, 'DEMOTE'::character varying])::text[]))),
          CONSTRAINT ck_published_exception_rule_positions CHECK (((((action)::text = ANY ((ARRAY['PROMOTE'::character varying, 'DEMOTE'::character varying])::text[])) AND (positions IS NOT NULL) AND (positions > 0)) OR (((action)::text = ANY ((ARRAY['FORCE'::character varying, 'VETO'::character varying])::text[])) AND (positions IS NULL))))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_catalog.roadmap_text (
          id_roadmap_text bigint GENERATED ALWAYS AS IDENTITY,
          id_dimension integer NOT NULL,
          irl_level integer NOT NULL,
          guidance_text character varying(1000) NOT NULL,
          CONSTRAINT ck_roadmap_text_level CHECK (((irl_level >= 1) AND (irl_level <= 9)))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_catalog.scoring_parameters (
          id bigint GENERATED ALWAYS AS IDENTITY,
          bottleneck_weight numeric(4,2) NOT NULL,
          gap_weight numeric(4,2) NOT NULL,
          moderate_imbalance_weight numeric(4,2) NOT NULL,
          critical_imbalance_weight numeric(4,2) NOT NULL,
          stage_affinity_weight numeric(4,2) NOT NULL,
          out_of_range_penalty numeric(4,2) NOT NULL,
          minimum_threshold numeric(5,2) NOT NULL,
          alternatives_count integer NOT NULL,
          created_at timestamp with time zone DEFAULT now() NOT NULL,
          CONSTRAINT ck_scoring_parameters_non_negative CHECK (((bottleneck_weight >= (0)::numeric) AND (gap_weight >= (0)::numeric) AND (moderate_imbalance_weight >= (0)::numeric) AND (critical_imbalance_weight >= (0)::numeric) AND (stage_affinity_weight >= (0)::numeric) AND (out_of_range_penalty >= (0)::numeric) AND (minimum_threshold >= (0)::numeric) AND (alternatives_count >= 0)))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_catalog.sector (
          id bigint GENERATED ALWAYS AS IDENTITY,
          name character varying(120) NOT NULL,
          is_active boolean DEFAULT true NOT NULL
      )
    `);

    // ── irl_diagnostic tables (transactional) ─────────────────────────────
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.recommendation_alternative (
          id bigint GENERATED ALWAYS AS IDENTITY,
          id_recommendation bigint NOT NULL,
          id_service integer NOT NULL,
          service_snapshot character varying(80) NOT NULL,
          "position" integer NOT NULL,
          score numeric(6,3) NOT NULL,
          CONSTRAINT ck_recommendation_alternative_position CHECK (("position" >= 2))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.imbalance_analysis (
          id bigint GENERATED ALWAYS AS IDENTITY,
          id_diagnostic uuid NOT NULL,
          id_pair integer NOT NULL,
          level_difference integer NOT NULL,
          classification character varying(16) NOT NULL,
          CONSTRAINT ck_imbalance_analysis_classification CHECK (((classification)::text = ANY ((ARRAY['CRITICAL'::character varying, 'MODERATE'::character varying, 'ACCEPTABLE'::character varying])::text[])))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.answer (
          id bigint GENERATED ALWAYS AS IDENTITY,
          id_diagnostic uuid NOT NULL,
          id_statement bigint NOT NULL,
          likert_value integer NOT NULL,
          answered_at timestamp with time zone DEFAULT now() NOT NULL,
          CONSTRAINT ck_answer_likert_value CHECK (((likert_value >= 1) AND (likert_value <= 5)))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.consent (
          id uuid NOT NULL,
          id_diagnostic uuid NOT NULL,
          keycloak_user_id character varying(64) NOT NULL,
          accepted boolean NOT NULL,
          accepted_at timestamp with time zone NOT NULL,
          terms_version character varying(16) NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.descarga_reporte (
          id_descarga bigint GENERATED ALWAYS AS IDENTITY,
          id_diagnostico uuid NOT NULL,
          keycloak_user_id character varying(64) NOT NULL,
          timestamp_descarga timestamp with time zone NOT NULL,
          formato character varying(8) NOT NULL,
          tamano_bytes integer,
          incluye_atribucion boolean NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.diagnostic (
          id uuid NOT NULL,
          keycloak_user_id character varying(64) NOT NULL,
          started_at timestamp with time zone DEFAULT now() NOT NULL,
          completed_at timestamp with time zone,
          state character varying(32) NOT NULL,
          irl_framework_version character varying(16) DEFAULT 'KTH-IRL-1.0'::character varying NOT NULL,
          CONSTRAINT ck_diagnostic_state CHECK (((state)::text = ANY (ARRAY[('STARTED'::character varying)::text, ('WITH_CONSENT'::character varying)::text, ('WITH_INITIATIVE'::character varying)::text, ('QUESTIONNAIRE_IN_PROGRESS'::character varying)::text, ('QUESTIONNAIRE_COMPLETE'::character varying)::text, ('PROFILE_GENERATED'::character varying)::text, ('DEEP_ANALYSIS_DECLINED'::character varying)::text, ('DEEP_ANALYSIS_IN_PROGRESS'::character varying)::text, ('DEEP_ANALYSIS_COMPLETE'::character varying)::text])))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.dimension_result (
          id bigint GENERATED ALWAYS AS IDENTITY,
          id_diagnostic uuid NOT NULL,
          id_dimension integer NOT NULL,
          likert_average numeric(4,3) NOT NULL,
          irl_level integer NOT NULL,
          in_critical_state boolean NOT NULL,
          computed_at timestamp with time zone NOT NULL,
          CONSTRAINT ck_dimension_result_irl_level CHECK (((irl_level >= 1) AND (irl_level <= 9))),
          CONSTRAINT ck_dimension_result_likert_average CHECK (((likert_average >= (1)::numeric) AND (likert_average <= (5)::numeric)))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.evento_auditoria (
          id_evento bigint GENERATED ALWAYS AS IDENTITY,
          id_diagnostico uuid NOT NULL,
          tipo_evento character varying(40) NOT NULL,
          keycloak_user_id character varying(64),
          timestamp_evento timestamp with time zone NOT NULL,
          metadata character varying(4000)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.initiative (
          id uuid NOT NULL,
          id_diagnostic uuid NOT NULL,
          id_sector bigint NOT NULL,
          name character varying(200) NOT NULL,
          short_description character varying(1000) NOT NULL,
          id_stage bigint,
          team_size integer,
          academic_linkage boolean,
          CONSTRAINT ck_initiative_team_size CHECK (((team_size IS NULL) OR (team_size > 0)))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.layer_trace (
          id bigint GENERATED ALWAYS AS IDENTITY,
          id_recommendation bigint NOT NULL,
          layer_1_excluded jsonb NOT NULL,
          ranking_before_exceptions jsonb NOT NULL,
          applied_exceptions jsonb NOT NULL,
          discarded_exceptions jsonb NOT NULL,
          ranking_after_exceptions jsonb NOT NULL,
          facts_hash character varying(64) NOT NULL,
          evaluated_at timestamp with time zone DEFAULT now() NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.notificacion (
          id_notificacion bigint GENERATED ALWAYS AS IDENTITY,
          id_diagnostico uuid NOT NULL,
          tipo character varying(16) NOT NULL,
          destinatario character varying(200) NOT NULL,
          timestamp_envio timestamp with time zone NOT NULL,
          estado_envio character varying(16) NOT NULL,
          mensaje_error character varying(500),
          numero_intentos integer DEFAULT 0 NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_diagnostic.portfolio_recommendation (
          id bigint GENERATED ALWAYS AS IDENTITY,
          id_diagnostic uuid NOT NULL,
          service_snapshot character varying(80),
          criterion_justification character varying(1000),
          generated_at timestamp with time zone NOT NULL,
          id_primary_service integer,
          primary_score numeric(6,3),
          result_type character varying(24) DEFAULT 'RECOMMENDATION'::character varying NOT NULL,
          CONSTRAINT ck_portfolio_recommendation_coherence CHECK (((((result_type)::text = 'RECOMMENDATION'::text) AND (id_primary_service IS NOT NULL) AND (primary_score IS NOT NULL) AND (service_snapshot IS NOT NULL) AND (criterion_justification IS NOT NULL)) OR (((result_type)::text = 'NO_RECOMMENDATION'::text) AND (id_primary_service IS NULL) AND (primary_score IS NULL) AND (service_snapshot IS NULL)))),
          CONSTRAINT ck_portfolio_recommendation_result_type CHECK (((result_type)::text = ANY ((ARRAY['RECOMMENDATION'::character varying, 'NO_RECOMMENDATION'::character varying])::text[])))
      )
    `);

    // ── Primary keys ─────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE irl_catalog.statement ADD PRIMARY KEY (id_statement)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.dimension_dependency ADD PRIMARY KEY (id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.dimension ADD PRIMARY KEY (id_dimension)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.initiative_stage ADD PRIMARY KEY (id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.published_ordinal_profile ADD PRIMARY KEY (id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.published_ordinal_intensity ADD PRIMARY KEY (id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.dimension_pair ADD PRIMARY KEY (id_pair)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.conversion_range ADD PRIMARY KEY (irl_level)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.published_eligibility_rule ADD PRIMARY KEY (id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.published_exception_rule ADD PRIMARY KEY (id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.sector ADD PRIMARY KEY (id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.portfolio_service ADD PRIMARY KEY (id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.scoring_parameters ADD PRIMARY KEY (id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.roadmap_text ADD PRIMARY KEY (id_roadmap_text)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.calibration_label_value ADD PRIMARY KEY (id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.recommendation_alternative ADD PRIMARY KEY (id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.imbalance_analysis ADD PRIMARY KEY (id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.consent ADD PRIMARY KEY (id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.descarga_reporte ADD PRIMARY KEY (id_descarga)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.diagnostic ADD PRIMARY KEY (id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.evento_auditoria ADD PRIMARY KEY (id_evento)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.initiative ADD PRIMARY KEY (id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.notificacion ADD PRIMARY KEY (id_notificacion)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.portfolio_recommendation ADD PRIMARY KEY (id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.answer ADD PRIMARY KEY (id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.dimension_result ADD PRIMARY KEY (id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.layer_trace ADD PRIMARY KEY (id)
    `);

    // ── Unique constraints ───────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE irl_catalog.calibration_label_value ADD CONSTRAINT uq_calibration_label_value_label UNIQUE (label)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.calibration_label_value ADD CONSTRAINT uq_calibration_label_value_order UNIQUE (monotonicity_order)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.dimension ADD CONSTRAINT uq_dimension_code UNIQUE (code)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.dimension_dependency ADD CONSTRAINT uq_dimension_dependency_pair UNIQUE (id_dimension_source, id_dimension_target)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.dimension_pair ADD CONSTRAINT uq_dimension_pair_code UNIQUE (pair_code)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.dimension_pair ADD CONSTRAINT uq_dimension_pair_dims UNIQUE (id_dimension_a, id_dimension_b)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.dimension ADD CONSTRAINT uq_dimension_sequence UNIQUE (sequence)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.initiative_stage ADD CONSTRAINT uq_initiative_stage_code UNIQUE (code)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.initiative_stage ADD CONSTRAINT uq_initiative_stage_sequence UNIQUE (sequence)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.portfolio_service ADD CONSTRAINT uq_portfolio_service_name UNIQUE (name)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.published_exception_rule ADD CONSTRAINT uq_published_exception_rule_code UNIQUE (code)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.published_exception_rule ADD CONSTRAINT uq_published_exception_rule_priority UNIQUE (priority_order)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.published_ordinal_intensity ADD CONSTRAINT uq_published_ordinal_intensity UNIQUE (id_ordinal_profile, id_dimension)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.published_ordinal_profile ADD CONSTRAINT uq_published_ordinal_profile_service UNIQUE (id_service)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.roadmap_text ADD CONSTRAINT uq_roadmap_text_dim_level UNIQUE (id_dimension, irl_level)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.sector ADD CONSTRAINT uq_sector_name UNIQUE (name)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.statement ADD CONSTRAINT uq_statement_dim_sequence UNIQUE (id_dimension, sequence)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.answer ADD CONSTRAINT uq_answer_diagnostic_statement UNIQUE (id_diagnostic, id_statement)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.consent ADD CONSTRAINT uq_consent_diagnostic UNIQUE (id_diagnostic)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.dimension_result ADD CONSTRAINT uq_dimension_result_diag_dim UNIQUE (id_diagnostic, id_dimension)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.imbalance_analysis ADD CONSTRAINT uq_imbalance_analysis_diag_pair UNIQUE (id_diagnostic, id_pair)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.initiative ADD CONSTRAINT uq_initiative_diagnostic UNIQUE (id_diagnostic)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.layer_trace ADD CONSTRAINT uq_layer_trace_recommendation UNIQUE (id_recommendation)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.notificacion ADD CONSTRAINT uq_notificacion_diag_tipo UNIQUE (id_diagnostico, tipo)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.portfolio_recommendation ADD CONSTRAINT uq_portfolio_recommendation_diagnostic UNIQUE (id_diagnostic)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.recommendation_alternative ADD CONSTRAINT uq_recommendation_alternative_position UNIQUE (id_recommendation, "position")
    `);

    // ── Indexes ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX ix_dependencia_destino ON irl_catalog.dimension_dependency USING btree (id_dimension_target)
    `);
    await queryRunner.query(`
      CREATE INDEX ix_statement_dimension ON irl_catalog.statement USING btree (id_dimension)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX ux_scoring_parameters_singleton ON irl_catalog.scoring_parameters USING btree ((true))
    `);
    await queryRunner.query(`
      CREATE INDEX ix_answer_diagnostic ON irl_diagnostic.answer USING btree (id_diagnostic)
    `);
    await queryRunner.query(`
      CREATE INDEX ix_diagnostic_user ON irl_diagnostic.diagnostic USING btree (keycloak_user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX ix_recommendation_alternative_recommendation ON irl_diagnostic.recommendation_alternative USING btree (id_recommendation)
    `);

    // ── Foreign keys ─────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE irl_catalog.dimension_dependency ADD CONSTRAINT fk_dimension_dependency_source FOREIGN KEY (id_dimension_source) REFERENCES irl_catalog.dimension(id_dimension)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.dimension_dependency ADD CONSTRAINT fk_dimension_dependency_target FOREIGN KEY (id_dimension_target) REFERENCES irl_catalog.dimension(id_dimension)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.dimension_pair ADD CONSTRAINT fk_dimension_pair_dim_a FOREIGN KEY (id_dimension_a) REFERENCES irl_catalog.dimension(id_dimension)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.dimension_pair ADD CONSTRAINT fk_dimension_pair_dim_b FOREIGN KEY (id_dimension_b) REFERENCES irl_catalog.dimension(id_dimension)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.published_eligibility_rule ADD CONSTRAINT fk_published_eligibility_rule_service FOREIGN KEY (id_service) REFERENCES irl_catalog.portfolio_service(id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.published_exception_rule ADD CONSTRAINT fk_published_exception_rule_service FOREIGN KEY (id_target_service) REFERENCES irl_catalog.portfolio_service(id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.published_ordinal_intensity ADD CONSTRAINT fk_published_ordinal_intensity_dimension FOREIGN KEY (id_dimension) REFERENCES irl_catalog.dimension(id_dimension)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.published_ordinal_intensity ADD CONSTRAINT fk_published_ordinal_intensity_profile FOREIGN KEY (id_ordinal_profile) REFERENCES irl_catalog.published_ordinal_profile(id) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.published_ordinal_profile ADD CONSTRAINT fk_published_ordinal_profile_service FOREIGN KEY (id_service) REFERENCES irl_catalog.portfolio_service(id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.roadmap_text ADD CONSTRAINT fk_roadmap_text_dimension FOREIGN KEY (id_dimension) REFERENCES irl_catalog.dimension(id_dimension)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.statement ADD CONSTRAINT fk_statement_dimension FOREIGN KEY (id_dimension) REFERENCES irl_catalog.dimension(id_dimension)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.answer ADD CONSTRAINT fk_answer_diagnostic FOREIGN KEY (id_diagnostic) REFERENCES irl_diagnostic.diagnostic(id) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.answer ADD CONSTRAINT fk_answer_statement FOREIGN KEY (id_statement) REFERENCES irl_catalog.statement(id_statement)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.consent ADD CONSTRAINT fk_consent_diagnostic FOREIGN KEY (id_diagnostic) REFERENCES irl_diagnostic.diagnostic(id) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.descarga_reporte ADD CONSTRAINT fk_descarga_diagnostico FOREIGN KEY (id_diagnostico) REFERENCES irl_diagnostic.diagnostic(id) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.dimension_result ADD CONSTRAINT fk_dimension_result_diagnostic FOREIGN KEY (id_diagnostic) REFERENCES irl_diagnostic.diagnostic(id) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.dimension_result ADD CONSTRAINT fk_dimension_result_dimension FOREIGN KEY (id_dimension) REFERENCES irl_catalog.dimension(id_dimension)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.evento_auditoria ADD CONSTRAINT fk_evento_diagnostico FOREIGN KEY (id_diagnostico) REFERENCES irl_diagnostic.diagnostic(id) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.imbalance_analysis ADD CONSTRAINT fk_imbalance_analysis_diagnostic FOREIGN KEY (id_diagnostic) REFERENCES irl_diagnostic.diagnostic(id) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.imbalance_analysis ADD CONSTRAINT fk_imbalance_analysis_pair FOREIGN KEY (id_pair) REFERENCES irl_catalog.dimension_pair(id_pair)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.initiative ADD CONSTRAINT fk_initiative_diagnostic FOREIGN KEY (id_diagnostic) REFERENCES irl_diagnostic.diagnostic(id) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.initiative ADD CONSTRAINT fk_initiative_sector FOREIGN KEY (id_sector) REFERENCES irl_catalog.sector(id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.initiative ADD CONSTRAINT fk_initiative_stage FOREIGN KEY (id_stage) REFERENCES irl_catalog.initiative_stage(id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.layer_trace ADD CONSTRAINT fk_layer_trace_recommendation FOREIGN KEY (id_recommendation) REFERENCES irl_diagnostic.portfolio_recommendation(id) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.notificacion ADD CONSTRAINT fk_notificacion_diagnostico FOREIGN KEY (id_diagnostico) REFERENCES irl_diagnostic.diagnostic(id) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.portfolio_recommendation ADD CONSTRAINT fk_portfolio_recommendation_diagnostic FOREIGN KEY (id_diagnostic) REFERENCES irl_diagnostic.diagnostic(id) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.portfolio_recommendation ADD CONSTRAINT fk_portfolio_recommendation_primary_service FOREIGN KEY (id_primary_service) REFERENCES irl_catalog.portfolio_service(id)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.recommendation_alternative ADD CONSTRAINT fk_recommendation_alternative_recommendation FOREIGN KEY (id_recommendation) REFERENCES irl_diagnostic.portfolio_recommendation(id) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.recommendation_alternative ADD CONSTRAINT fk_recommendation_alternative_service FOREIGN KEY (id_service) REFERENCES irl_catalog.portfolio_service(id)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SCHEMA IF EXISTS irl_diagnostic CASCADE`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS irl_catalog CASCADE`);
  }
}

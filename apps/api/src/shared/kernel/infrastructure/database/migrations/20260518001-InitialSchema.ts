import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema — the single migration of the project.
 *
 * Consolidates the 25 incremental migrations that built the schema during
 * development. The project has no deployed environment with real data, so
 * the incremental history was a by-product of how the system was built, not
 * an operational record.
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
 * Notes on what the DDL does not say by itself:
 *   - **The framework content is versioned** (`framework_version`): the
 *     statements and the conversion table belong to a version, and each
 *     diagnostic records the version it was answered with. Changing a text
 *     or a range means seeding a new version, never rewriting the rows old
 *     diagnostics point to. The current version is the latest `published_at`.
 *   - **The consent terms are catalog data** (`consent_terms`): each consent
 *     row points to the exact text that was accepted. The current terms are
 *     the latest `published_at`.
 *   - **An initiative has an identity of its own** (`initiative`), owned by a
 *     user and consented once; each diagnostic keeps a snapshot of its
 *     profile (`initiative_profile`), so correcting it for one diagnostic
 *     does not change another one's results. `consent` is a history: one
 *     row per acceptance, never overwritten.
 *   - `scoring_parameters` is a single-row table by construction: its key
 *     is fixed (`id = 1`).
 *   - The ordinal profile of a service lives on `portfolio_service` (level
 *     band) and its two child tables (`portfolio_service_stage`, the stages
 *     it fits; `ordinal_intensity`, one label of the calibration scale per
 *     dimension).
 *   - A service is either scored or **adjustment-only**
 *     (`portfolio_service.adjustment_only`): an adjustment-only service takes
 *     no part in the exclusions or the score, and only enters the ranking
 *     when an `INCLUDE` adjustment puts it at the position the rule sets
 *     (`positions`). It is an explicit flag, not inferred from the band,
 *     because an adjustment-only service may still have one; a scored
 *     service must have one (`ck_portfolio_service_scored_band`).
 *   - The rules cannot point at the wrong kind of service. The composite
 *     foreign keys to `portfolio_service (id, adjustment_only)` carry the
 *     target's flag into `eligibility_rule` and `exception_rule`: an
 *     exclusion only targets a scored service, and `INCLUDE` only an
 *     adjustment-only one. The other adjustments may target either kind: an
 *     included service is one more place of the ranking.
 *   - A recommendation keeps its trace in its own row and its ranking in
 *     `recommendation_rank` (position 1 is the recommended service). A place
 *     an adjustment included has no score and records the rule instead
 *     (`ck_recommendation_rank_origin`).
 *   - `conversion_range` cannot overlap within a version
 *     (`ex_conversion_range_overlap`); the seed also checks that every
 *     reachable average falls in exactly one range.
 *   - `diagnostic.state` allows exactly the states of the diagnostic state
 *     machine; adding one means widening `ck_diagnostic_state` here and the
 *     column width if needed (the longest today is 25 characters).
 *   - `exception_rule.action` is checked against the actions of
 *     `EXCEPTION_ACTIONS` in `@innlab/contracts`.
 *   - `answer.justification` is mandatory and must contain at least one
 *     non-whitespace character (`btrim` would only strip spaces).
 *   - `diagnostic.recommendation_calculated_at` and `roadmap_calculated_at`
 *     record when each result of the deep analysis arrived; with both, the
 *     diagnostic is `DEEP_ANALYSIS_COMPLETE`.
 *   - Foreign keys from other modules' tables to `diagnostic` cascade on
 *     delete: a single deployment and no deletion policy yet (ADR 0010).
 *   - There are no tables for the future `reporting/` module: they are
 *     designed with it, not reserved ahead of it.
 *
 * `down()` drops both schemas.
 */
const UP: readonly string[] = [
  // ── Schemas and extensions ─────────────────────────────────────────────
  `CREATE SCHEMA irl_catalog`,
  `CREATE SCHEMA irl_diagnostic`,
  // Needed by `ex_conversion_range_overlap` (equality on the version inside
  // a GiST exclusion constraint). Trusted extension: no superuser required.
  `CREATE EXTENSION IF NOT EXISTS btree_gist`,

  // ── irl_catalog: the IRL framework (shared/irl-taxonomy, diagnosis) ─────
  `CREATE TABLE irl_catalog.framework_version (
      id smallint GENERATED ALWAYS AS IDENTITY,
      code character varying(16) NOT NULL,
      published_at timestamp with time zone NOT NULL,
      CONSTRAINT pk_framework_version PRIMARY KEY (id),
      CONSTRAINT uq_framework_version_code UNIQUE (code)
  )`,
  `CREATE TABLE irl_catalog.dimension (
      id_dimension integer GENERATED ALWAYS AS IDENTITY,
      code character varying(8) NOT NULL,
      name_es character varying(80) NOT NULL,
      short_name_es character varying(40) NOT NULL,
      description character varying(500) NOT NULL,
      is_critical_dimension boolean DEFAULT false NOT NULL,
      sequence integer NOT NULL,
      minimum_expected_level smallint DEFAULT 4 NOT NULL,
      CONSTRAINT pk_dimension PRIMARY KEY (id_dimension),
      CONSTRAINT uq_dimension_code UNIQUE (code),
      CONSTRAINT uq_dimension_sequence UNIQUE (sequence),
      CONSTRAINT ck_dimension_code CHECK (code IN ('TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL')),
      CONSTRAINT ck_dimension_minimum_level CHECK (minimum_expected_level BETWEEN 1 AND 9),
      CONSTRAINT ck_dimension_sequence CHECK (sequence BETWEEN 1 AND 6)
  )`,
  `CREATE TABLE irl_catalog.dimension_pair (
      id_pair integer GENERATED ALWAYS AS IDENTITY,
      id_dimension_a integer NOT NULL,
      id_dimension_b integer NOT NULL,
      pair_code character varying(16) NOT NULL,
      CONSTRAINT pk_dimension_pair PRIMARY KEY (id_pair),
      CONSTRAINT uq_dimension_pair_code UNIQUE (pair_code),
      CONSTRAINT uq_dimension_pair_dims UNIQUE (id_dimension_a, id_dimension_b),
      CONSTRAINT ck_dimension_pair_dims CHECK (id_dimension_a <> id_dimension_b),
      CONSTRAINT fk_dimension_pair_dim_a FOREIGN KEY (id_dimension_a) REFERENCES irl_catalog.dimension (id_dimension),
      CONSTRAINT fk_dimension_pair_dim_b FOREIGN KEY (id_dimension_b) REFERENCES irl_catalog.dimension (id_dimension)
  )`,
  `CREATE TABLE irl_catalog.conversion_range (
      id_framework_version smallint NOT NULL,
      irl_level smallint NOT NULL,
      avg_min numeric(3,2) NOT NULL,
      avg_max numeric(3,2) NOT NULL,
      CONSTRAINT pk_conversion_range PRIMARY KEY (id_framework_version, irl_level),
      CONSTRAINT ck_conversion_range_bounds CHECK (avg_min BETWEEN 1 AND 5 AND avg_max BETWEEN 1 AND 5 AND avg_min <= avg_max),
      CONSTRAINT ck_conversion_range_level CHECK (irl_level BETWEEN 1 AND 9),
      CONSTRAINT fk_conversion_range_version FOREIGN KEY (id_framework_version) REFERENCES irl_catalog.framework_version (id),
      CONSTRAINT ex_conversion_range_overlap EXCLUDE USING gist (
        id_framework_version WITH =,
        numrange(avg_min, avg_max, '[]') WITH &&
      )
  )`,
  `CREATE TABLE irl_catalog.statement (
      id_statement bigint GENERATED ALWAYS AS IDENTITY,
      id_framework_version smallint NOT NULL,
      id_dimension integer NOT NULL,
      sequence integer NOT NULL,
      text_es character varying(500) NOT NULL,
      CONSTRAINT pk_statement PRIMARY KEY (id_statement),
      CONSTRAINT uq_statement_version_dim_sequence UNIQUE (id_framework_version, id_dimension, sequence),
      CONSTRAINT ck_statement_sequence CHECK (sequence BETWEEN 1 AND 8),
      CONSTRAINT fk_statement_version FOREIGN KEY (id_framework_version) REFERENCES irl_catalog.framework_version (id),
      CONSTRAINT fk_statement_dimension FOREIGN KEY (id_dimension) REFERENCES irl_catalog.dimension (id_dimension)
  )`,
  `CREATE INDEX ix_statement_dimension ON irl_catalog.statement (id_dimension)`,

  // ── irl_catalog: roadmap ───────────────────────────────────────────────
  `CREATE TABLE irl_catalog.dimension_dependency (
      id integer GENERATED ALWAYS AS IDENTITY,
      id_dimension_source integer NOT NULL,
      id_dimension_target integer NOT NULL,
      minimum_required_level smallint NOT NULL,
      CONSTRAINT pk_dimension_dependency PRIMARY KEY (id),
      CONSTRAINT uq_dimension_dependency_pair UNIQUE (id_dimension_source, id_dimension_target),
      CONSTRAINT ck_dimension_dependency_not_reflexive CHECK (id_dimension_source <> id_dimension_target),
      CONSTRAINT ck_dimension_dependency_required_level CHECK (minimum_required_level BETWEEN 1 AND 9),
      CONSTRAINT fk_dimension_dependency_source FOREIGN KEY (id_dimension_source) REFERENCES irl_catalog.dimension (id_dimension),
      CONSTRAINT fk_dimension_dependency_target FOREIGN KEY (id_dimension_target) REFERENCES irl_catalog.dimension (id_dimension)
  )`,
  `CREATE INDEX ix_dimension_dependency_target ON irl_catalog.dimension_dependency (id_dimension_target)`,

  // ── irl_catalog: initiative ───────────────────────────────────────────
  `CREATE TABLE irl_catalog.sector (
      id bigint GENERATED ALWAYS AS IDENTITY,
      name character varying(120) NOT NULL,
      is_active boolean DEFAULT true NOT NULL,
      CONSTRAINT pk_sector PRIMARY KEY (id),
      CONSTRAINT uq_sector_name UNIQUE (name)
  )`,
  `CREATE TABLE irl_catalog.initiative_stage (
      id bigint GENERATED ALWAYS AS IDENTITY,
      code character varying(24) NOT NULL,
      name character varying(80) NOT NULL,
      sequence integer NOT NULL,
      is_active boolean DEFAULT true NOT NULL,
      CONSTRAINT pk_initiative_stage PRIMARY KEY (id),
      CONSTRAINT uq_initiative_stage_code UNIQUE (code),
      CONSTRAINT uq_initiative_stage_sequence UNIQUE (sequence)
  )`,
  `CREATE TABLE irl_catalog.consent_terms (
      version character varying(16) NOT NULL,
      title character varying(200) NOT NULL,
      sections jsonb NOT NULL,
      checkbox_label character varying(300) NOT NULL,
      published_at timestamp with time zone NOT NULL,
      CONSTRAINT pk_consent_terms PRIMARY KEY (version),
      CONSTRAINT ck_consent_terms_sections CHECK (jsonb_typeof(sections) = 'array' AND jsonb_array_length(sections) > 0)
  )`,

  // ── irl_catalog: routing ───────────────────────────────────────────────
  `CREATE TABLE irl_catalog.portfolio_service (
      id integer GENERATED ALWAYS AS IDENTITY,
      name character varying(80) NOT NULL,
      description character varying(500),
      is_active boolean DEFAULT true NOT NULL,
      adjustment_only boolean NOT NULL,
      min_level integer,
      max_level integer,
      CONSTRAINT pk_portfolio_service PRIMARY KEY (id),
      CONSTRAINT uq_portfolio_service_name UNIQUE (name),
      CONSTRAINT uq_portfolio_service_selection UNIQUE (id, adjustment_only),
      CONSTRAINT ck_portfolio_service_levels CHECK (
        (min_level IS NULL AND max_level IS NULL)
        OR (min_level BETWEEN 1 AND 9 AND max_level BETWEEN 1 AND 9 AND min_level <= max_level)
      ),
      CONSTRAINT ck_portfolio_service_scored_band CHECK (adjustment_only OR min_level IS NOT NULL)
  )`,
  `CREATE TABLE irl_catalog.portfolio_service_stage (
      id_service integer NOT NULL,
      id_stage bigint NOT NULL,
      CONSTRAINT pk_portfolio_service_stage PRIMARY KEY (id_service, id_stage),
      CONSTRAINT fk_portfolio_service_stage_service FOREIGN KEY (id_service) REFERENCES irl_catalog.portfolio_service (id) ON DELETE CASCADE,
      CONSTRAINT fk_portfolio_service_stage_stage FOREIGN KEY (id_stage) REFERENCES irl_catalog.initiative_stage (id)
  )`,
  `CREATE TABLE irl_catalog.calibration_label_value (
      id bigint GENERATED ALWAYS AS IDENTITY,
      label character varying(24) NOT NULL,
      numeric_value numeric(4,2) NOT NULL,
      monotonicity_order integer NOT NULL,
      CONSTRAINT pk_calibration_label_value PRIMARY KEY (id),
      CONSTRAINT uq_calibration_label_value_label UNIQUE (label),
      CONSTRAINT uq_calibration_label_value_order UNIQUE (monotonicity_order),
      CONSTRAINT ck_calibration_label_value_range CHECK (numeric_value BETWEEN 0 AND 1)
  )`,
  `CREATE TABLE irl_catalog.ordinal_intensity (
      id bigint GENERATED ALWAYS AS IDENTITY,
      id_service integer NOT NULL,
      id_dimension integer NOT NULL,
      id_calibration_label bigint NOT NULL,
      CONSTRAINT pk_ordinal_intensity PRIMARY KEY (id),
      CONSTRAINT uq_ordinal_intensity UNIQUE (id_service, id_dimension),
      CONSTRAINT fk_ordinal_intensity_service FOREIGN KEY (id_service) REFERENCES irl_catalog.portfolio_service (id) ON DELETE CASCADE,
      CONSTRAINT fk_ordinal_intensity_dimension FOREIGN KEY (id_dimension) REFERENCES irl_catalog.dimension (id_dimension),
      CONSTRAINT fk_ordinal_intensity_label FOREIGN KEY (id_calibration_label) REFERENCES irl_catalog.calibration_label_value (id)
  )`,
  `CREATE TABLE irl_catalog.eligibility_rule (
      id bigint GENERATED ALWAYS AS IDENTITY,
      code character varying(16) NOT NULL,
      id_service integer NOT NULL,
      predicate jsonb NOT NULL,
      exclusion_message character varying(500) NOT NULL,
      service_adjustment_only boolean DEFAULT false NOT NULL,
      CONSTRAINT pk_eligibility_rule PRIMARY KEY (id),
      CONSTRAINT uq_eligibility_rule_code UNIQUE (code),
      CONSTRAINT ck_eligibility_rule_scored_service CHECK (NOT service_adjustment_only),
      CONSTRAINT fk_eligibility_rule_service FOREIGN KEY (id_service, service_adjustment_only)
        REFERENCES irl_catalog.portfolio_service (id, adjustment_only) ON UPDATE CASCADE
  )`,
  `CREATE TABLE irl_catalog.exception_rule (
      id bigint GENERATED ALWAYS AS IDENTITY,
      code character varying(16) NOT NULL,
      predicate jsonb NOT NULL,
      action character varying(16) NOT NULL,
      id_target_service integer NOT NULL,
      positions integer,
      declared_reason character varying(1000) NOT NULL,
      priority_order integer NOT NULL,
      target_adjustment_only boolean NOT NULL,
      CONSTRAINT pk_exception_rule PRIMARY KEY (id),
      CONSTRAINT uq_exception_rule_code UNIQUE (code),
      CONSTRAINT uq_exception_rule_priority UNIQUE (priority_order),
      CONSTRAINT ck_exception_rule_action CHECK (action IN ('FORCE', 'VETO', 'PROMOTE', 'DEMOTE', 'INCLUDE')),
      CONSTRAINT ck_exception_rule_positions CHECK (
        (action IN ('PROMOTE', 'DEMOTE', 'INCLUDE') AND positions IS NOT NULL AND positions > 0)
        OR (action IN ('FORCE', 'VETO') AND positions IS NULL)
      ),
      CONSTRAINT ck_exception_rule_include_target CHECK (action <> 'INCLUDE' OR target_adjustment_only),
      CONSTRAINT fk_exception_rule_service FOREIGN KEY (id_target_service, target_adjustment_only)
        REFERENCES irl_catalog.portfolio_service (id, adjustment_only) ON UPDATE CASCADE
  )`,
  `CREATE TABLE irl_catalog.scoring_parameters (
      id smallint DEFAULT 1 NOT NULL,
      bottleneck_weight numeric(4,2) NOT NULL,
      gap_weight numeric(4,2) NOT NULL,
      moderate_imbalance_weight numeric(4,2) NOT NULL,
      critical_imbalance_weight numeric(4,2) NOT NULL,
      stage_affinity_weight numeric(4,2) NOT NULL,
      out_of_range_penalty numeric(4,2) NOT NULL,
      minimum_threshold numeric(5,2) NOT NULL,
      alternatives_count integer NOT NULL,
      CONSTRAINT pk_scoring_parameters PRIMARY KEY (id),
      CONSTRAINT ck_scoring_parameters_single_row CHECK (id = 1),
      CONSTRAINT ck_scoring_parameters_non_negative CHECK (
        bottleneck_weight >= 0 AND gap_weight >= 0 AND moderate_imbalance_weight >= 0
        AND critical_imbalance_weight >= 0 AND stage_affinity_weight >= 0
        AND out_of_range_penalty >= 0 AND minimum_threshold >= 0 AND alternatives_count >= 0
      )
  )`,

  // ── irl_diagnostic: diagnosis ─────────────────────────────────────────
  `CREATE TABLE irl_diagnostic.diagnostic (
      id uuid NOT NULL,
      cognito_user_id character varying(64) NOT NULL,
      id_framework_version smallint NOT NULL,
      started_at timestamp with time zone DEFAULT now() NOT NULL,
      completed_at timestamp with time zone,
      state character varying(32) NOT NULL,
      recommendation_calculated_at timestamp with time zone,
      roadmap_calculated_at timestamp with time zone,
      CONSTRAINT pk_diagnostic PRIMARY KEY (id),
      CONSTRAINT ck_diagnostic_state CHECK (state IN (
        'STARTED', 'WITH_CONSENT', 'WITH_INITIATIVE', 'QUESTIONNAIRE_IN_PROGRESS',
        'QUESTIONNAIRE_COMPLETE', 'PROFILE_GENERATED', 'DEEP_ANALYSIS_DECLINED',
        'DEEP_ANALYSIS_IN_PROGRESS', 'DEEP_ANALYSIS_COMPLETE'
      )),
      CONSTRAINT fk_diagnostic_framework_version FOREIGN KEY (id_framework_version) REFERENCES irl_catalog.framework_version (id)
  )`,
  // Covers the user's history, filtered by user and ordered by start date.
  `CREATE INDEX ix_diagnostic_user_started ON irl_diagnostic.diagnostic (cognito_user_id, started_at DESC)`,
  `CREATE TABLE irl_diagnostic.answer (
      id bigint GENERATED ALWAYS AS IDENTITY,
      id_diagnostic uuid NOT NULL,
      id_statement bigint NOT NULL,
      likert_value integer NOT NULL,
      justification character varying(1000) NOT NULL,
      answered_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT pk_answer PRIMARY KEY (id),
      CONSTRAINT uq_answer_diagnostic_statement UNIQUE (id_diagnostic, id_statement),
      CONSTRAINT ck_answer_justification CHECK (justification ~ '\\S'),
      CONSTRAINT ck_answer_likert_value CHECK (likert_value BETWEEN 1 AND 5),
      CONSTRAINT fk_answer_diagnostic FOREIGN KEY (id_diagnostic) REFERENCES irl_diagnostic.diagnostic (id) ON DELETE CASCADE,
      CONSTRAINT fk_answer_statement FOREIGN KEY (id_statement) REFERENCES irl_catalog.statement (id_statement)
  )`,
  `CREATE TABLE irl_diagnostic.dimension_result (
      id bigint GENERATED ALWAYS AS IDENTITY,
      id_diagnostic uuid NOT NULL,
      id_dimension integer NOT NULL,
      likert_average numeric(4,3) NOT NULL,
      irl_level integer NOT NULL,
      in_critical_state boolean NOT NULL,
      computed_at timestamp with time zone NOT NULL,
      CONSTRAINT pk_dimension_result PRIMARY KEY (id),
      CONSTRAINT uq_dimension_result_diag_dim UNIQUE (id_diagnostic, id_dimension),
      CONSTRAINT ck_dimension_result_irl_level CHECK (irl_level BETWEEN 1 AND 9),
      CONSTRAINT ck_dimension_result_likert_average CHECK (likert_average BETWEEN 1 AND 5),
      CONSTRAINT fk_dimension_result_diagnostic FOREIGN KEY (id_diagnostic) REFERENCES irl_diagnostic.diagnostic (id) ON DELETE CASCADE,
      CONSTRAINT fk_dimension_result_dimension FOREIGN KEY (id_dimension) REFERENCES irl_catalog.dimension (id_dimension)
  )`,
  `CREATE TABLE irl_diagnostic.imbalance_analysis (
      id bigint GENERATED ALWAYS AS IDENTITY,
      id_diagnostic uuid NOT NULL,
      id_pair integer NOT NULL,
      level_difference integer NOT NULL,
      classification character varying(16) NOT NULL,
      CONSTRAINT pk_imbalance_analysis PRIMARY KEY (id),
      CONSTRAINT uq_imbalance_analysis_diag_pair UNIQUE (id_diagnostic, id_pair),
      CONSTRAINT ck_imbalance_analysis_classification CHECK (classification IN ('CRITICAL', 'MODERATE', 'ACCEPTABLE')),
      CONSTRAINT fk_imbalance_analysis_diagnostic FOREIGN KEY (id_diagnostic) REFERENCES irl_diagnostic.diagnostic (id) ON DELETE CASCADE,
      CONSTRAINT fk_imbalance_analysis_pair FOREIGN KEY (id_pair) REFERENCES irl_catalog.dimension_pair (id_pair)
  )`,

  // ── irl_diagnostic: initiative ────────────────────────────────────────
  `CREATE TABLE irl_diagnostic.initiative (
      id uuid NOT NULL,
      cognito_user_id character varying(64) NOT NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT pk_initiative PRIMARY KEY (id),
      -- Target of the consent's composite key: the consent's user is the owner.
      CONSTRAINT uq_initiative_owner UNIQUE (id, cognito_user_id)
  )`,
  `CREATE INDEX ix_initiative_user ON irl_diagnostic.initiative (cognito_user_id)`,
  `CREATE TABLE irl_diagnostic.consent (
      id uuid NOT NULL,
      id_initiative uuid NOT NULL,
      cognito_user_id character varying(64) NOT NULL,
      terms_version character varying(16) NOT NULL,
      accepted_at timestamp with time zone NOT NULL,
      CONSTRAINT pk_consent PRIMARY KEY (id),
      CONSTRAINT fk_consent_initiative_owner FOREIGN KEY (id_initiative, cognito_user_id) REFERENCES irl_diagnostic.initiative (id, cognito_user_id) ON DELETE CASCADE,
      CONSTRAINT fk_consent_terms FOREIGN KEY (terms_version) REFERENCES irl_catalog.consent_terms (version)
  )`,
  `CREATE INDEX ix_consent_initiative_accepted ON irl_diagnostic.consent (id_initiative, accepted_at DESC)`,
  `CREATE TABLE irl_diagnostic.initiative_profile (
      id uuid NOT NULL,
      id_initiative uuid NOT NULL,
      id_diagnostic uuid NOT NULL,
      id_sector bigint NOT NULL,
      name character varying(200) NOT NULL,
      product_type character varying(500) NOT NULL,
      id_stage bigint NOT NULL,
      declared_stage character varying(500) NOT NULL,
      team_size integer NOT NULL,
      team_description character varying(500) NOT NULL,
      academic_linkage boolean NOT NULL,
      target_market character varying(500) NOT NULL,
      current_funding character varying(500) NOT NULL,
      recorded_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT pk_initiative_profile PRIMARY KEY (id),
      CONSTRAINT uq_initiative_profile_diagnostic UNIQUE (id_diagnostic),
      CONSTRAINT ck_initiative_profile_team_size CHECK (team_size > 0),
      CONSTRAINT fk_initiative_profile_initiative FOREIGN KEY (id_initiative) REFERENCES irl_diagnostic.initiative (id) ON DELETE CASCADE,
      CONSTRAINT fk_initiative_profile_diagnostic FOREIGN KEY (id_diagnostic) REFERENCES irl_diagnostic.diagnostic (id) ON DELETE CASCADE,
      CONSTRAINT fk_initiative_profile_sector FOREIGN KEY (id_sector) REFERENCES irl_catalog.sector (id),
      CONSTRAINT fk_initiative_profile_stage FOREIGN KEY (id_stage) REFERENCES irl_catalog.initiative_stage (id)
  )`,
  `CREATE INDEX ix_initiative_profile_initiative ON irl_diagnostic.initiative_profile (id_initiative, recorded_at DESC)`,

  // ── irl_diagnostic: routing ───────────────────────────────────────────
  `CREATE TABLE irl_diagnostic.portfolio_recommendation (
      id bigint GENERATED ALWAYS AS IDENTITY,
      id_diagnostic uuid NOT NULL,
      result_type character varying(24) NOT NULL,
      criterion_justification character varying(1100) NOT NULL,
      generated_at timestamp with time zone NOT NULL,
      layer_1_excluded jsonb NOT NULL,
      ranking_before_exceptions jsonb NOT NULL,
      applied_exceptions jsonb NOT NULL,
      discarded_exceptions jsonb NOT NULL,
      ranking_after_exceptions jsonb NOT NULL,
      incomplete_characterization jsonb NOT NULL,
      facts_hash character varying(64) NOT NULL,
      CONSTRAINT pk_portfolio_recommendation PRIMARY KEY (id),
      CONSTRAINT uq_portfolio_recommendation_diagnostic UNIQUE (id_diagnostic),
      CONSTRAINT ck_portfolio_recommendation_result_type CHECK (result_type IN ('RECOMMENDATION', 'NO_RECOMMENDATION')),
      CONSTRAINT fk_portfolio_recommendation_diagnostic FOREIGN KEY (id_diagnostic) REFERENCES irl_diagnostic.diagnostic (id) ON DELETE CASCADE
  )`,
  `CREATE TABLE irl_diagnostic.recommendation_rank (
      id bigint GENERATED ALWAYS AS IDENTITY,
      id_recommendation bigint NOT NULL,
      id_service integer NOT NULL,
      service_snapshot character varying(80) NOT NULL,
      position integer NOT NULL,
      score numeric(8,3),
      included_by_rule character varying(16),
      CONSTRAINT pk_recommendation_rank PRIMARY KEY (id),
      CONSTRAINT uq_recommendation_rank_position UNIQUE (id_recommendation, position),
      CONSTRAINT ck_recommendation_rank_position CHECK (position >= 1),
      CONSTRAINT ck_recommendation_rank_origin CHECK ((score IS NULL) = (included_by_rule IS NOT NULL)),
      CONSTRAINT fk_recommendation_rank_recommendation FOREIGN KEY (id_recommendation) REFERENCES irl_diagnostic.portfolio_recommendation (id) ON DELETE CASCADE,
      CONSTRAINT fk_recommendation_rank_service FOREIGN KEY (id_service) REFERENCES irl_catalog.portfolio_service (id)
  )`,

  // ── irl_diagnostic: roadmap ───────────────────────────────────────────
  `CREATE TABLE irl_diagnostic.scaling_roadmap (
      id bigint GENERATED ALWAYS AS IDENTITY,
      id_diagnostic uuid NOT NULL,
      phases jsonb NOT NULL,
      generated_at timestamp with time zone NOT NULL,
      CONSTRAINT pk_scaling_roadmap PRIMARY KEY (id),
      CONSTRAINT uq_scaling_roadmap_diagnostic UNIQUE (id_diagnostic),
      CONSTRAINT fk_scaling_roadmap_diagnostic FOREIGN KEY (id_diagnostic) REFERENCES irl_diagnostic.diagnostic (id) ON DELETE CASCADE
  )`,
];

export class InitialSchema1747526400001 implements MigrationInterface {
  name = 'InitialSchema1747526400001';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of UP) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SCHEMA IF EXISTS irl_diagnostic CASCADE`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS irl_catalog CASCADE`);
  }
}

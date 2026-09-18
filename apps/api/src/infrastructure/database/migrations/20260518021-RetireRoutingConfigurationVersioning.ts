import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Retires the routing configuration versioning scheme (backlog 5.6).
 *
 * `configuration_version`, `calibration_snapshot` and `parameters_snapshot`
 * existed to support several published versions over time, with one marked
 * active. Nothing in the system can create a second version — the actor
 * that would (INNLAB staff, through a role INNLAB Core does not expose
 * yet) does not exist — so the scheme has been pure unused weight since it
 * was built. This is deliberately a reversion, not a completion: it
 * collapses the model to what the system actually needs today, a single
 * live configuration with no version history.
 *
 * What survives, unversioned:
 *   - `calibration_label_value` — the calibration scale tiers, now a
 *     plain singleton set instead of scoped to a snapshot.
 *   - `scoring_parameters` (renamed from `parameters_snapshot`) — the
 *     eight weights, stripped of the version-bookkeeping columns
 *     (`number`, `author_id`, `comment`, `state`), enforced as a
 *     singleton row by a unique expression index.
 *   - `published_ordinal_profile`, `published_ordinal_intensity`,
 *     `published_eligibility_rule`, `published_exception_rule` — the
 *     four artefacts the engine reads, now the live rules directly
 *     instead of scoped to a version. `_publicada`/`_borrador`'s
 *     publish/draft distinction stops mattering once there is nothing to
 *     publish *to* — the four `draft_*` tables (created, never written to
 *     — backlog 8.2) are dropped outright.
 *
 * What is dropped outright: `configuration_version` itself (there is no
 * "the active one" once there is only one), and every FK/column that
 * pointed at the three retired tables — `portfolio_recommendation` and
 * `layer_trace` both carried `id_configuration_version`;
 * `layer_trace` additionally carried `id_calibration_snapshot` and
 * `id_parameters_snapshot`. `layer_trace` itself is NOT dropped — it is
 * the audit trail of one individual calculation (which rules excluded
 * what, which exception fired), unrelated to configuration versioning,
 * and stays a live requirement. Only its three now-dangling
 * version-pointer columns go.
 *
 * The `down()` migration recreates the schema shape but cannot recover
 * data that was never versioned in the first place — going forward from
 * a single live configuration to "restore the version history" is not a
 * meaningful operation, so `down()` restores structure only, with the
 * single live row becoming version 1 of everything.
 */
export class RetireRoutingConfigurationVersioning1747526400021
  implements MigrationInterface
{
  name = 'RetireRoutingConfigurationVersioning1747526400021';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── Drop the four never-written draft tables (backlog 8.2) ───────────
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_catalog.draft_exception_rule`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_catalog.draft_eligibility_rule`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_catalog.draft_ordinal_intensity`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS irl_catalog.draft_ordinal_profile`,
    );

    // ── layer_trace: drop the three version-pointer columns ──────────────
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.layer_trace
        DROP CONSTRAINT fk_layer_trace_parameters,
        DROP CONSTRAINT fk_layer_trace_calibration,
        DROP CONSTRAINT fk_layer_trace_version,
        DROP COLUMN id_parameters_snapshot,
        DROP COLUMN id_calibration_snapshot,
        DROP COLUMN id_configuration_version
    `);

    // ── portfolio_recommendation: drop the version-pointer column ────────
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.portfolio_recommendation
        DROP CONSTRAINT fk_portfolio_recommendation_version,
        DROP COLUMN id_configuration_version
    `);

    // ── published_* : drop id_configuration_version, re-scope uniqueness ─
    await queryRunner.query(`
      ALTER TABLE irl_catalog.published_ordinal_profile
        DROP CONSTRAINT fk_published_ordinal_profile_version,
        DROP CONSTRAINT uq_published_ordinal_profile,
        DROP COLUMN id_configuration_version,
        ADD CONSTRAINT uq_published_ordinal_profile_service UNIQUE (id_service)
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.published_eligibility_rule
        DROP CONSTRAINT fk_published_eligibility_rule_version,
        DROP COLUMN id_configuration_version
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.published_exception_rule
        DROP CONSTRAINT fk_published_exception_rule_version,
        DROP CONSTRAINT uq_published_exception_rule_priority,
        DROP CONSTRAINT uq_published_exception_rule_code,
        DROP COLUMN id_configuration_version,
        ADD CONSTRAINT uq_published_exception_rule_priority UNIQUE (priority_order),
        ADD CONSTRAINT uq_published_exception_rule_code UNIQUE (code)
    `);

    // ── configuration_version: drop entirely ──────────────────────────────
    await queryRunner.query(
      `DROP INDEX irl_catalog.ux_configuration_version_single_active`,
    );
    await queryRunner.query(
      `DROP TABLE irl_catalog.configuration_version`,
    );

    // ── calibration_label_value: drop scoping to calibration_snapshot ────
    await queryRunner.query(`
      ALTER TABLE irl_catalog.calibration_label_value
        DROP CONSTRAINT fk_calibration_label_value_snapshot,
        DROP CONSTRAINT uq_calibration_label_value_label,
        DROP CONSTRAINT uq_calibration_label_value_order,
        DROP COLUMN id_calibration_snapshot,
        ADD CONSTRAINT uq_calibration_label_value_label UNIQUE (label),
        ADD CONSTRAINT uq_calibration_label_value_order UNIQUE (monotonicity_order)
    `);
    await queryRunner.query(
      `DROP TABLE irl_catalog.calibration_snapshot`,
    );

    // ── parameters_snapshot -> scoring_parameters: strip version columns ─
    await queryRunner.query(`
      ALTER TABLE irl_catalog.parameters_snapshot
        DROP CONSTRAINT uq_parameters_snapshot_number,
        DROP COLUMN number,
        DROP COLUMN author_id,
        DROP COLUMN comment,
        DROP COLUMN state
    `);
    await queryRunner.query(
      `ALTER TABLE irl_catalog.parameters_snapshot RENAME TO scoring_parameters`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.scoring_parameters RENAME CONSTRAINT ck_parameters_snapshot_non_negative TO ck_scoring_parameters_non_negative`,
    );
    // Singleton enforcement: an expression index on a constant is the
    // standard Postgres idiom for "at most one row in this table".
    await queryRunner.query(`
      CREATE UNIQUE INDEX ux_scoring_parameters_singleton
        ON irl_catalog.scoring_parameters ((true))
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX irl_catalog.ux_scoring_parameters_singleton`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.scoring_parameters RENAME CONSTRAINT ck_scoring_parameters_non_negative TO ck_parameters_snapshot_non_negative`,
    );
    await queryRunner.query(
      `ALTER TABLE irl_catalog.scoring_parameters RENAME TO parameters_snapshot`,
    );
    await queryRunner.query(`
      ALTER TABLE irl_catalog.parameters_snapshot
        ADD COLUMN number     integer,
        ADD COLUMN author_id  varchar(64),
        ADD COLUMN comment    varchar(500),
        ADD COLUMN state      varchar(16)
    `);
    await queryRunner.query(`
      UPDATE irl_catalog.parameters_snapshot
         SET number = 1, author_id = 'restored', state = 'PUBLISHED'
    `);
    await queryRunner.query(`
      ALTER TABLE irl_catalog.parameters_snapshot
        ALTER COLUMN number    SET NOT NULL,
        ALTER COLUMN author_id SET NOT NULL,
        ALTER COLUMN state     SET NOT NULL,
        ADD CONSTRAINT uq_parameters_snapshot_number UNIQUE (number)
    `);

    await queryRunner.query(`
      CREATE TABLE irl_catalog.calibration_snapshot (
        id         bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        number     integer     NOT NULL,
        author_id  varchar(64) NOT NULL,
        comment    varchar(500),
        state      varchar(16) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_calibration_snapshot_number UNIQUE (number)
      )
    `);
    const calibrationSnapshotRows = (await queryRunner.query(
      `INSERT INTO irl_catalog.calibration_snapshot (number, author_id, state)
       VALUES (1, 'restored', 'PUBLISHED') RETURNING id`,
    )) as { id: string }[];
    const [{ id: calibrationSnapshotId }] = calibrationSnapshotRows;
    await queryRunner.query(`
      ALTER TABLE irl_catalog.calibration_label_value
        DROP CONSTRAINT uq_calibration_label_value_label,
        DROP CONSTRAINT uq_calibration_label_value_order,
        ADD COLUMN id_calibration_snapshot bigint
    `);
    await queryRunner.query(
      `UPDATE irl_catalog.calibration_label_value SET id_calibration_snapshot = $1`,
      [calibrationSnapshotId],
    );
    await queryRunner.query(`
      ALTER TABLE irl_catalog.calibration_label_value
        ALTER COLUMN id_calibration_snapshot SET NOT NULL,
        ADD CONSTRAINT uq_calibration_label_value_label
          UNIQUE (id_calibration_snapshot, label),
        ADD CONSTRAINT uq_calibration_label_value_order
          UNIQUE (id_calibration_snapshot, monotonicity_order),
        ADD CONSTRAINT fk_calibration_label_value_snapshot
          FOREIGN KEY (id_calibration_snapshot)
          REFERENCES irl_catalog.calibration_snapshot (id)
          ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE TABLE irl_catalog.configuration_version (
        id                     bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        number                 integer     NOT NULL,
        author_id              varchar(64) NOT NULL,
        comment                varchar(500),
        id_calibration_snapshot bigint     NOT NULL,
        id_parameters_snapshot  bigint     NOT NULL,
        state                  varchar(16) NOT NULL,
        valid_from             timestamptz NOT NULL DEFAULT now(),
        valid_until            timestamptz,
        CONSTRAINT uq_configuration_version_number UNIQUE (number),
        CONSTRAINT fk_configuration_version_calibration
          FOREIGN KEY (id_calibration_snapshot)
          REFERENCES irl_catalog.calibration_snapshot (id),
        CONSTRAINT fk_configuration_version_parameters
          FOREIGN KEY (id_parameters_snapshot)
          REFERENCES irl_catalog.parameters_snapshot (id)
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX ux_configuration_version_single_active
        ON irl_catalog.configuration_version (state)
        WHERE state = 'ACTIVE'
    `);
    const configurationVersionRows = (await queryRunner.query(
      `INSERT INTO irl_catalog.configuration_version
         (number, author_id, id_calibration_snapshot, id_parameters_snapshot, state)
       VALUES (1, 'restored', $1, (SELECT id FROM irl_catalog.parameters_snapshot LIMIT 1), 'ACTIVE')
       RETURNING id`,
      [calibrationSnapshotId],
    )) as { id: string }[];
    const [{ id: configurationVersionId }] = configurationVersionRows;

    await queryRunner.query(`
      ALTER TABLE irl_catalog.published_ordinal_profile
        DROP CONSTRAINT uq_published_ordinal_profile_service,
        ADD COLUMN id_configuration_version bigint
    `);
    await queryRunner.query(
      `UPDATE irl_catalog.published_ordinal_profile SET id_configuration_version = $1`,
      [configurationVersionId],
    );
    await queryRunner.query(`
      ALTER TABLE irl_catalog.published_ordinal_profile
        ALTER COLUMN id_configuration_version SET NOT NULL,
        ADD CONSTRAINT uq_published_ordinal_profile
          UNIQUE (id_configuration_version, id_service),
        ADD CONSTRAINT fk_published_ordinal_profile_version
          FOREIGN KEY (id_configuration_version)
          REFERENCES irl_catalog.configuration_version (id)
          ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE irl_catalog.published_eligibility_rule
        ADD COLUMN id_configuration_version bigint
    `);
    await queryRunner.query(
      `UPDATE irl_catalog.published_eligibility_rule SET id_configuration_version = $1`,
      [configurationVersionId],
    );
    await queryRunner.query(`
      ALTER TABLE irl_catalog.published_eligibility_rule
        ALTER COLUMN id_configuration_version SET NOT NULL,
        ADD CONSTRAINT fk_published_eligibility_rule_version
          FOREIGN KEY (id_configuration_version)
          REFERENCES irl_catalog.configuration_version (id)
          ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE irl_catalog.published_exception_rule
        DROP CONSTRAINT uq_published_exception_rule_priority,
        DROP CONSTRAINT uq_published_exception_rule_code,
        ADD COLUMN id_configuration_version bigint
    `);
    await queryRunner.query(
      `UPDATE irl_catalog.published_exception_rule SET id_configuration_version = $1`,
      [configurationVersionId],
    );
    await queryRunner.query(`
      ALTER TABLE irl_catalog.published_exception_rule
        ALTER COLUMN id_configuration_version SET NOT NULL,
        ADD CONSTRAINT uq_published_exception_rule_priority
          UNIQUE (id_configuration_version, priority_order),
        ADD CONSTRAINT uq_published_exception_rule_code
          UNIQUE (id_configuration_version, code),
        ADD CONSTRAINT fk_published_exception_rule_version
          FOREIGN KEY (id_configuration_version)
          REFERENCES irl_catalog.configuration_version (id)
          ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.portfolio_recommendation
        ADD COLUMN id_configuration_version bigint
    `);
    await queryRunner.query(
      `UPDATE irl_diagnostic.portfolio_recommendation SET id_configuration_version = $1`,
      [configurationVersionId],
    );
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.portfolio_recommendation
        ALTER COLUMN id_configuration_version SET NOT NULL,
        ADD CONSTRAINT fk_portfolio_recommendation_version
          FOREIGN KEY (id_configuration_version)
          REFERENCES irl_catalog.configuration_version (id)
    `);

    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.layer_trace
        ADD COLUMN id_configuration_version bigint,
        ADD COLUMN id_calibration_snapshot  bigint,
        ADD COLUMN id_parameters_snapshot   bigint
    `);
    await queryRunner.query(
      `UPDATE irl_diagnostic.layer_trace
          SET id_configuration_version = $1,
              id_calibration_snapshot = $2,
              id_parameters_snapshot = (SELECT id FROM irl_catalog.parameters_snapshot LIMIT 1)`,
      [configurationVersionId, calibrationSnapshotId],
    );
    await queryRunner.query(`
      ALTER TABLE irl_diagnostic.layer_trace
        ALTER COLUMN id_configuration_version SET NOT NULL,
        ALTER COLUMN id_calibration_snapshot SET NOT NULL,
        ALTER COLUMN id_parameters_snapshot SET NOT NULL,
        ADD CONSTRAINT fk_layer_trace_version
          FOREIGN KEY (id_configuration_version)
          REFERENCES irl_catalog.configuration_version (id),
        ADD CONSTRAINT fk_layer_trace_calibration
          FOREIGN KEY (id_calibration_snapshot)
          REFERENCES irl_catalog.calibration_snapshot (id),
        ADD CONSTRAINT fk_layer_trace_parameters
          FOREIGN KEY (id_parameters_snapshot)
          REFERENCES irl_catalog.parameters_snapshot (id)
    `);

    await queryRunner.query(`
      CREATE TABLE irl_catalog.draft_ordinal_profile (
        id                  bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_service          integer      NOT NULL,
        min_level           integer      NOT NULL,
        max_level           integer      NOT NULL,
        relevant_stages     varchar(200) NOT NULL,
        updated_at          timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT uq_draft_ordinal_profile_service UNIQUE (id_service),
        CONSTRAINT ck_draft_ordinal_profile_levels CHECK (
          min_level BETWEEN 1 AND 9
          AND max_level BETWEEN 1 AND 9
          AND min_level <= max_level
        ),
        CONSTRAINT fk_draft_ordinal_profile_service FOREIGN KEY (id_service)
          REFERENCES irl_catalog.portfolio_service (id)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_catalog.draft_ordinal_intensity (
        id             bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_ordinal_profile bigint   NOT NULL,
        id_dimension   integer     NOT NULL,
        label          varchar(24) NOT NULL,
        CONSTRAINT uq_draft_ordinal_intensity UNIQUE (id_ordinal_profile, id_dimension),
        CONSTRAINT fk_draft_ordinal_intensity_profile FOREIGN KEY (id_ordinal_profile)
          REFERENCES irl_catalog.draft_ordinal_profile (id)
          ON DELETE CASCADE,
        CONSTRAINT fk_draft_ordinal_intensity_dimension FOREIGN KEY (id_dimension)
          REFERENCES irl_catalog.dimension (id)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_catalog.draft_eligibility_rule (
        id                 bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        id_service         integer      NOT NULL,
        predicate          jsonb        NOT NULL,
        expression_tree    jsonb        NOT NULL,
        exclusion_message  varchar(500) NOT NULL,
        updated_at         timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT fk_draft_eligibility_rule_service FOREIGN KEY (id_service)
          REFERENCES irl_catalog.portfolio_service (id)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE irl_catalog.draft_exception_rule (
        id                bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        code              varchar(16)   NOT NULL,
        predicate         jsonb         NOT NULL,
        expression_tree   jsonb         NOT NULL,
        action            varchar(16)   NOT NULL,
        id_target_service integer       NOT NULL,
        positions         integer,
        declared_reason   varchar(1000) NOT NULL,
        priority_order    integer       NOT NULL,
        updated_at        timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT uq_draft_exception_rule_priority UNIQUE (priority_order),
        CONSTRAINT uq_draft_exception_rule_code UNIQUE (code),
        CONSTRAINT ck_draft_exception_rule_action
          CHECK (action IN ('FORCE','VETO','PROMOTE','DEMOTE')),
        CONSTRAINT ck_draft_exception_rule_positions CHECK (
          (action IN ('PROMOTE','DEMOTE') AND positions IS NOT NULL AND positions > 0)
          OR (action IN ('FORCE','VETO') AND positions IS NULL)
        ),
        CONSTRAINT fk_draft_exception_rule_service FOREIGN KEY (id_target_service)
          REFERENCES irl_catalog.portfolio_service (id)
      )
    `);
  }
}

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { InitialSchema1747526400001 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518001-InitialSchema.js';
import { seedCatalog } from '../../../src/shared/kernel/infrastructure/database/seeds/seed-catalog.js';
import { DIMENSIONS } from '../../../src/shared/kernel/infrastructure/database/seeds/data/dimensions.js';
import { STATEMENTS } from '../../../src/shared/kernel/infrastructure/database/seeds/data/statements.js';

/**
 * Smoke test for the migration + seed pipeline.
 *
 * Boots a disposable Postgres via Testcontainers, applies the schema
 * migration (the project has a single one), runs the same `seedCatalog` the
 * `db:seed` command runs, and asserts the catalog is populated as the
 * framework demands: 6 dimensions, 48 statements, and RF-13's critical
 * dimensions marked.
 *
 * Also re-runs the seed to confirm idempotency — no duplicate rows.
 */
describe('Catalog seed (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();

    dataSource = new DataSource({
      type: 'postgres',
      host: container.getHost(),
      port: container.getPort(),
      username: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
      migrations: [InitialSchema1747526400001],
      migrationsTableName: 'typeorm_migrations',
    });

    await dataSource.initialize();
    await dataSource.runMigrations();
  }, 60_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    await container?.stop();
  });

  const runSeed = async (): Promise<void> => {
    await dataSource.transaction((manager) => seedCatalog(manager));
  };

  const count = async (table: string): Promise<string> => {
    const [{ count: n }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM ${table}`,
    );
    return n;
  };

  it('populates the catalog after a single run', async () => {
    await runSeed();

    expect(await count('irl_catalog.dimension')).toBe(
      String(DIMENSIONS.length),
    );
    expect(await count('irl_catalog.statement')).toBe(
      String(STATEMENTS.length),
    );
    expect(await count('irl_catalog.dimension')).toBe('6');
    expect(await count('irl_catalog.statement')).toBe('48');
    expect(await count('irl_catalog.dimension_pair')).toBe('6');
    expect(await count('irl_catalog.scoring_parameters')).toBe('1');
  });

  it('is idempotent — running again does not duplicate rows', async () => {
    await runSeed();
    await runSeed();

    expect(await count('irl_catalog.dimension')).toBe('6');
    expect(await count('irl_catalog.statement')).toBe('48');
    expect(await count('irl_catalog.ordinal_intensity')).toBe('72');
    expect(await count('irl_catalog.portfolio_service')).toBe('12');
    expect(await count('irl_catalog.framework_version')).toBe('1');
    expect(await count('irl_catalog.consent_terms')).toBe('1');
  });

  it('preserves exactly 8 statements per dimension', async () => {
    await runSeed();

    const rows = await dataSource.query<{ code: string; cnt: string }[]>(
      `SELECT d.code, COUNT(s.id_statement)::text AS cnt
         FROM irl_catalog.dimension d
         JOIN irl_catalog.statement s ON s.id_dimension = d.id_dimension
        GROUP BY d.code
        ORDER BY d.code`,
    );

    expect(rows).toHaveLength(6);
    for (const r of rows) {
      expect(r.cnt).toBe('8');
    }
  });

  it('marks CRL, BRL and TmRL as susceptible to a critical state (RF-13)', async () => {
    await runSeed();

    const rows = await dataSource.query<{ code: string }[]>(
      `SELECT code FROM irl_catalog.dimension WHERE is_critical_dimension ORDER BY code`,
    );

    expect(rows.map((r) => r.code)).toEqual(['BRL', 'CRL', 'TmRL']);
  });

  it('applies a change of the routing configuration when seeding again', async () => {
    await runSeed();
    await dataSource.query(
      `UPDATE irl_catalog.scoring_parameters SET gap_weight = 9`,
    );
    await dataSource.query(
      `DELETE FROM irl_catalog.eligibility_rule WHERE code = 'ELG-02'`,
    );

    await runSeed();

    const [{ gap_weight }] = await dataSource.query<{ gap_weight: string }[]>(
      `SELECT gap_weight FROM irl_catalog.scoring_parameters`,
    );
    expect(Number(gap_weight)).toBe(1.5);
    expect(await count('irl_catalog.eligibility_rule')).toBe('3');
  });

  // The engine loads every service of the catalog: a service that left the
  // seed must leave the database, or it would keep being recommended.
  it('removes the services and rules that are no longer in the seed', async () => {
    await runSeed();
    const [{ id }] = await dataSource.query<{ id: number }[]>(
      `INSERT INTO irl_catalog.portfolio_service (name, is_active, adjustment_only, min_level, max_level)
       VALUES ('Mentoría', true, false, 1, 6) RETURNING id`,
    );
    await dataSource.query(
      `INSERT INTO irl_catalog.ordinal_intensity (id_service, id_dimension, id_calibration_label)
       SELECT $1, d.id_dimension, c.id FROM irl_catalog.dimension d, irl_catalog.calibration_label_value c
        WHERE c.label = 'primary'`,
      [id],
    );
    await dataSource.query(
      `INSERT INTO irl_catalog.exception_rule
         (code, predicate, action, id_target_service, target_adjustment_only, positions, declared_reason, priority_order)
       VALUES ('E-03-OLD', '{"field":"averageLevel","op":"<","value":3}', 'PROMOTE', $1, false, 1, 'x', 99)`,
      [id],
    );

    await runSeed();

    const names = await dataSource.query<{ name: string }[]>(
      `SELECT name FROM irl_catalog.portfolio_service ORDER BY id`,
    );
    expect(names.map((n) => n.name)).not.toContain('Mentoría');
    expect(await count('irl_catalog.portfolio_service')).toBe('12');
    expect(await count('irl_catalog.ordinal_intensity')).toBe('72');
    expect(await count('irl_catalog.exception_rule')).toBe('6');
  });

  it('refuses to remove a service a saved recommendation points to', async () => {
    await runSeed();
    const diagnosticId = randomUUID();
    const [{ id }] = await dataSource.query<{ id: number }[]>(
      `INSERT INTO irl_catalog.portfolio_service (name, is_active, adjustment_only, min_level, max_level)
       VALUES ('Formación', true, false, 1, 5) RETURNING id`,
    );
    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostic (id, cognito_user_id, state, id_framework_version)
       VALUES ($1, 'u', 'DEEP_ANALYSIS_COMPLETE', (SELECT id FROM irl_catalog.framework_version LIMIT 1))`,
      [diagnosticId],
    );
    const [{ id: idRecommendation }] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO irl_diagnostic.portfolio_recommendation
         (id_diagnostic, result_type, criterion_justification, generated_at, layer_1_excluded,
          ranking_before_exceptions, applied_exceptions, discarded_exceptions,
          ranking_after_exceptions, incomplete_characterization, facts_hash)
       VALUES ($1, 'RECOMMENDATION', 'x', now(), '[]', '[]', '[]', '[]', '[]', '[]', 'h') RETURNING id`,
      [diagnosticId],
    );
    await dataSource.query(
      `INSERT INTO irl_diagnostic.recommendation_rank (id_recommendation, id_service, service_snapshot, position, score)
       VALUES ($1, $2, 'Formación', 1, 3)`,
      [idRecommendation, id],
    );

    await expect(runSeed()).rejects.toThrow(
      /'Formación' left the seed but saved recommendations/,
    );

    await dataSource.query(
      `DELETE FROM irl_diagnostic.diagnostic WHERE id = $1`,
      [diagnosticId],
    );
    await runSeed();
    expect(await count('irl_catalog.portfolio_service')).toBe('12');
  });

  describe('the database keeps each kind of service in its own layer', () => {
    const serviceId = async (name: string): Promise<number> => {
      const [{ id }] = await dataSource.query<{ id: number }[]>(
        `SELECT id FROM irl_catalog.portfolio_service WHERE name = $1`,
        [name],
      );
      return id;
    };

    it('a scored service needs a level band', async () => {
      await runSeed();
      await expect(
        dataSource.query(
          `INSERT INTO irl_catalog.portfolio_service (name, is_active, adjustment_only)
           VALUES ('Sin banda', true, false)`,
        ),
      ).rejects.toThrow(/ck_portfolio_service_scored_band/);
    });

    it('INCLUDE cannot target a scored service, and needs the position to enter at', async () => {
      await runSeed();
      const scored = await serviceId('Reto Express');
      const adjustmentOnly = await serviceId('Chispa');
      await expect(
        dataSource.query(
          `INSERT INTO irl_catalog.exception_rule
             (code, predicate, action, id_target_service, target_adjustment_only, positions, declared_reason, priority_order)
           VALUES ('INC-X', '{}', 'INCLUDE', $1, false, 2, 'x', 90)`,
          [scored],
        ),
      ).rejects.toThrow(/ck_exception_rule_include_target/);
      await expect(
        dataSource.query(
          `INSERT INTO irl_catalog.exception_rule
             (code, predicate, action, id_target_service, target_adjustment_only, positions, declared_reason, priority_order)
           VALUES ('INC-X', '{}', 'INCLUDE', $1, true, NULL, 'x', 90)`,
          [adjustmentOnly],
        ),
      ).rejects.toThrow(/ck_exception_rule_positions/);
    });

    it('a ranking action may target an adjustment-only service, with its real kind', async () => {
      await runSeed();
      const id = await serviceId('Chispa');
      // Once included it is one more place of the ranking. Claiming it is
      // scored still breaks the composite foreign key.
      await expect(
        dataSource.query(
          `INSERT INTO irl_catalog.exception_rule
             (code, predicate, action, id_target_service, target_adjustment_only, positions, declared_reason, priority_order)
           VALUES ('E-X', '{}', 'FORCE', $1, false, NULL, 'x', 91)`,
          [id],
        ),
      ).rejects.toThrow(/fk_exception_rule_service/);
      await dataSource.query(
        `INSERT INTO irl_catalog.exception_rule
           (code, predicate, action, id_target_service, target_adjustment_only, positions, declared_reason, priority_order)
         VALUES ('E-X', '{}', 'FORCE', $1, true, NULL, 'x', 91)`,
        [id],
      );
      await dataSource.query(
        `DELETE FROM irl_catalog.exception_rule WHERE code = 'E-X'`,
      );
    });

    it('an exclusion cannot target an adjustment-only service', async () => {
      await runSeed();
      const id = await serviceId('Alianza Residente');
      await expect(
        dataSource.query(
          `INSERT INTO irl_catalog.eligibility_rule (code, id_service, predicate, exclusion_message)
           VALUES ('ELG-X', $1, '{}', 'x')`,
          [id],
        ),
      ).rejects.toThrow(/fk_eligibility_rule_service/);
      await expect(
        dataSource.query(
          `INSERT INTO irl_catalog.eligibility_rule
             (code, id_service, predicate, exclusion_message, service_adjustment_only)
           VALUES ('ELG-X', $1, '{}', 'x', true)`,
          [id],
        ),
      ).rejects.toThrow(/ck_eligibility_rule_scored_service/);
    });
  });

  it('refuses to rewrite the statements of a framework version a diagnostic uses', async () => {
    await runSeed();
    const diagnosticId = '5e0eebc9-9c0b-4ef8-bb6d-6bb9bd380a19';
    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostic (id, cognito_user_id, state, id_framework_version)
       SELECT $1, 'u', 'STARTED', id FROM irl_catalog.framework_version LIMIT 1`,
      [diagnosticId],
    );
    await dataSource.query(
      `UPDATE irl_catalog.statement SET text_es = 'Texto reescrito'
        WHERE id_statement = (SELECT min(id_statement) FROM irl_catalog.statement)`,
    );

    try {
      await expect(runSeed()).rejects.toThrow(/new framework version/);
    } finally {
      await dataSource.query(
        `DELETE FROM irl_diagnostic.diagnostic WHERE id = $1`,
        [diagnosticId],
      );
      await runSeed();
    }
  });

  it('the database refuses overlapping conversion ranges within a version', async () => {
    await runSeed();

    await expect(
      dataSource.query(
        `UPDATE irl_catalog.conversion_range SET avg_max = 1.50 WHERE irl_level = 1`,
      ),
    ).rejects.toThrow(/ex_conversion_range_overlap/);
  });
});

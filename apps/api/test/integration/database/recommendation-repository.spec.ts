import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { InitialSchema1747526400001 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518001-InitialSchema.js';
import type { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { PortfolioRecommendationOrm } from '../../../src/modules/routing/infrastructure/database/orm-entities/portfolio-recommendation.orm-entity.js';
import { RecommendationAlternativeOrm } from '../../../src/modules/routing/infrastructure/database/orm-entities/recommendation-alternative.orm-entity.js';
import { LayerTraceOrm } from '../../../src/modules/routing/infrastructure/database/orm-entities/layer-trace.orm-entity.js';
import { TypeOrmRecommendationRepository } from '../../../src/modules/routing/infrastructure/database/repositories/typeorm-recommendation.repository.js';
import { Recommendation } from '../../../src/modules/routing/domain/entities/recommendation.aggregate.js';
import { Uuid } from '../../../src/shared/kernel/domain/value-objects/uuid.vo.js';
import type { ScoredCandidate } from '../../../src/modules/routing/domain/value-objects/scored-candidate.vo.js';

/**
 * Integration tests of the recommendation repository.
 *
 * The first one is what matters: **it checks the write is atomic**. A
 * docstring promising atomicity is not enough, so here it is checked by
 * cutting the write halfway and confirming nothing is left.
 *
 * It also covers the guarantee the database holds by construction: a
 * single recommendation per diagnostic.
 */
describe('Recomendación — persistencia (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let repo: TypeOrmRecommendationRepository;
  let ormRepo: Repository<PortfolioRecommendationOrm>;
  let idService: number;
  let diagnosticId: string;

  const candidate = (
    id: number,
    name: string,
    total: number,
  ): ScoredCandidate => ({
    idService: id,
    serviceName: name,
    contributions: {
      bottleneck: { value: 0, details: [] },
      gaps: { value: 0, details: [] },
      imbalances: { value: 0, details: [] },
      stageAffinity: { value: 0, matches: false },
      rangePenalty: { value: 0, applied: false },
    },
    total,
  });

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();

    dataSource = new DataSource({
      type: 'postgres',
      host: container.getHost(),
      port: container.getPort(),
      username: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
      entities: [
        PortfolioRecommendationOrm,
        RecommendationAlternativeOrm,
        LayerTraceOrm,
      ],
      migrations: [InitialSchema1747526400001],
      migrationsTableName: 'typeorm_migrations',
    });

    await dataSource.initialize();
    await dataSource.runMigrations();

    ormRepo = dataSource.getRepository(PortfolioRecommendationOrm);
    repo = new TypeOrmRecommendationRepository(ormRepo);

    // Minimum configuration to satisfy the foreign keys.
    [{ id: idService }] = await dataSource.query(
      `INSERT INTO irl_catalog.portfolio_service (name, is_active)
       VALUES ('Consultoría', true) RETURNING id`,
    );
    await dataSource.query(
      `INSERT INTO irl_catalog.portfolio_service (name, is_active)
       VALUES ('Mentoría', true)`,
    );
  }, 120_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    await container?.stop();
  });

  beforeEach(async () => {
    diagnosticId = randomUUID();
    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostic
         (id, cognito_user_id, state, irl_framework_version)
       VALUES ($1,'u','PROFILE_GENERATED','KTH-IRL-1.0')`,
      [diagnosticId],
    );
  });

  function recommendation(): Recommendation {
    const primary = candidate(idService, 'Consultoría', 5.55);
    const alternate = candidate(idService + 1, 'Mentoría', 3.8);
    return Recommendation.create({
      diagnosticId: Uuid.create(diagnosticId),
      finalRanking: [primary, alternate],
      minimumThreshold: 2.5,
      alternativesCount: 2,
      justification: 'porque sí',
      noRecommendationReason: null,
      trace: {
        layer1Excluded: [],
        rankingBeforeExceptions: [primary, alternate],
        appliedExceptions: [],
        discardedExceptions: [],
        rankingAfterExceptions: [primary, alternate],
        incompleteCharacterization: [],
        factsHash: 'a'.repeat(64),
      },
      generatedAt: new Date(),
    });
  }

  it('persiste recomendación, alternatives y trace, y las recupera íntegras', async () => {
    await repo.save(recommendation());

    const read = await repo.findByDiagnosticId(diagnosticId);
    expect(read?.primary?.serviceName).toBe('Consultoría');
    expect(read?.primary?.total).toBeCloseTo(5.55, 3);
    expect(read?.alternatives.map((a) => a.serviceName)).toEqual(['Mentoría']);
    expect(read?.trace.factsHash).toBe('a'.repeat(64));
  });

  it('no deja nada escrito si la transacción falla a mitad de camino', async () => {
    // The third write (the trace) is broken by forcing a length failure
    // on `facts_hash` (varchar(64)). If the transaction did not wrap all
    // three, the recommendation row and its alternative would be orphaned:
    // a recommendation without a trace cannot be explained, which is exactly
    // what this module promises to avoid.
    const primary = candidate(idService, 'Consultoría', 5.55);
    const alternate = candidate(idService + 1, 'Mentoría', 3.8);
    const broken = Recommendation.create({
      diagnosticId: Uuid.create(diagnosticId),
      finalRanking: [primary, alternate],
      minimumThreshold: 2.5,
      alternativesCount: 2,
      justification: 'porque sí',
      noRecommendationReason: null,
      trace: {
        layer1Excluded: [],
        rankingBeforeExceptions: [primary, alternate],
        appliedExceptions: [],
        discardedExceptions: [],
        rankingAfterExceptions: [primary, alternate],
        incompleteCharacterization: [],
        factsHash: 'a'.repeat(65),
      },
      generatedAt: new Date(),
    });

    await expect(repo.save(broken)).rejects.toThrow();

    const [{ count: recs }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_diagnostic.portfolio_recommendation
        WHERE id_diagnostic = $1`,
      [diagnosticId],
    );
    // Scoped to this diagnostic: the previous cases leave their own rows
    // and a global count would include them too.
    const [{ count: alts }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count
         FROM irl_diagnostic.recommendation_alternative a
         JOIN irl_diagnostic.portfolio_recommendation r
           ON r.id = a.id_recommendation
        WHERE r.id_diagnostic = $1`,
      [diagnosticId],
    );
    const [{ count: traces }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count
         FROM irl_diagnostic.layer_trace t
         JOIN irl_diagnostic.portfolio_recommendation r
           ON r.id = t.id_recommendation
        WHERE r.id_diagnostic = $1`,
      [diagnosticId],
    );

    expect(recs).toBe('0');
    expect(alts).toBe('0');
    expect(traces).toBe('0');
  });

  it('regenerar reemplaza por completo en vez de acumular', async () => {
    await repo.save(recommendation());
    await repo.save(recommendation());

    const [{ count }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_diagnostic.portfolio_recommendation
        WHERE id_diagnostic = $1`,
      [diagnosticId],
    );
    expect(count).toBe('1');
  });

  it('la base de datos impide dos recommendations para el mismo diagnóstico', async () => {
    await repo.save(recommendation());

    await expect(
      dataSource.query(
        `INSERT INTO irl_diagnostic.portfolio_recommendation
           (id_diagnostic, result_type,
            service_snapshot, criterion_justification, generated_at)
         VALUES ($1, 'NO_RECOMMENDATION', NULL, 'otra', now())`,
        [diagnosticId],
      ),
    ).rejects.toThrow(/uq_portfolio_recommendation_diagnostic|duplicate key/);
  });

  it('rechaza una recomendación incoherente: sin service pero de type RECOMENDACION', async () => {
    await expect(
      dataSource.query(
        `INSERT INTO irl_diagnostic.portfolio_recommendation
           (id_diagnostic, result_type,
            id_primary_service, primary_score, service_snapshot,
            criterion_justification, generated_at)
         VALUES ($1, 'RECOMMENDATION', NULL, NULL, NULL, NULL, now())`,
        [diagnosticId],
      ),
    ).rejects.toThrow(/ck_portfolio_recommendation_coherence/);
  });
});

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { InitialSchema1747526400001 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518001-InitialSchema.js';
import type { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { PortfolioRecommendationOrm } from '../../../src/modules/routing/infrastructure/database/orm-entities/portfolio-recommendation.orm-entity.js';
import { RecommendationRankOrm } from '../../../src/modules/routing/infrastructure/database/orm-entities/recommendation-rank.orm-entity.js';
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
  let idAdjustmentOnly: number;
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
      entities: [PortfolioRecommendationOrm, RecommendationRankOrm],
      migrations: [InitialSchema1747526400001],
      migrationsTableName: 'typeorm_migrations',
    });

    await dataSource.initialize();
    await dataSource.runMigrations();
    // The diagnostics below point to a framework version.
    await dataSource.query(
      `INSERT INTO irl_catalog.framework_version (code, published_at) VALUES ('KTH-IRL-1.0', now())`,
    );

    ormRepo = dataSource.getRepository(PortfolioRecommendationOrm);
    repo = new TypeOrmRecommendationRepository(ormRepo);

    // Minimum configuration to satisfy the foreign keys.
    [{ id: idService }] = await dataSource.query(
      `INSERT INTO irl_catalog.portfolio_service (name, is_active, adjustment_only, min_level, max_level)
       VALUES ('Consultoría Experta', true, false, 1, 9) RETURNING id`,
    );
    await dataSource.query(
      `INSERT INTO irl_catalog.portfolio_service (name, is_active, adjustment_only, min_level, max_level)
       VALUES ('Reto Express', true, false, 1, 9)`,
    );
    [{ id: idAdjustmentOnly }] = await dataSource.query(
      `INSERT INTO irl_catalog.portfolio_service (name, is_active, adjustment_only)
       VALUES ('Academia a la Medida', true, true) RETURNING id`,
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
         (id, cognito_user_id, state, id_framework_version)
       VALUES ($1,'u','PROFILE_GENERATED',(SELECT id FROM irl_catalog.framework_version WHERE code = 'KTH-IRL-1.0'))`,
      [diagnosticId],
    );
  });

  function recommendation(): Recommendation {
    const primary = candidate(idService, 'Consultoría Experta', 5.55);
    const alternate = candidate(idService + 1, 'Reto Express', 3.8);
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
    expect(read?.primary?.serviceName).toBe('Consultoría Experta');
    expect(
      read?.primary && 'total' in read.primary ? read.primary.total : null,
    ).toBeCloseTo(5.55, 3);
    expect(read?.alternatives.map((a) => a.serviceName)).toEqual([
      'Reto Express',
    ]);
    expect(read?.trace.factsHash).toBe('a'.repeat(64));
  });

  it('guarda un servicio incluido por un ajuste sin puntaje, con su regla, y lo recupera', async () => {
    const primary = candidate(idService, 'Consultoría Experta', 5.55);
    const included = {
      idService: idAdjustmentOnly,
      serviceName: 'Academia a la Medida',
      includedBy: {
        ruleCode: 'INC-02',
        declaredReason: 'formar al propio equipo',
      },
    };
    await repo.save(
      Recommendation.create({
        diagnosticId: Uuid.create(diagnosticId),
        finalRanking: [primary, included],
        minimumThreshold: 2.5,
        alternativesCount: 2,
        justification: 'porque sí',
        noRecommendationReason: null,
        trace: {
          layer1Excluded: [],
          rankingBeforeExceptions: [primary],
          appliedExceptions: [],
          discardedExceptions: [],
          rankingAfterExceptions: [primary, included],
          incompleteCharacterization: [],
          factsHash: 'a'.repeat(64),
        },
        generatedAt: new Date(),
      }),
    );

    const ranks = await dataSource.query<
      {
        position: number;
        score: string | null;
        included_by_rule: string | null;
      }[]
    >(
      `SELECT k.position, k.score, k.included_by_rule
         FROM irl_diagnostic.recommendation_rank k
         JOIN irl_diagnostic.portfolio_recommendation r ON r.id = k.id_recommendation
        WHERE r.id_diagnostic = $1 ORDER BY k.position`,
      [diagnosticId],
    );
    expect(ranks).toEqual([
      { position: 1, score: '5.550', included_by_rule: null },
      { position: 2, score: null, included_by_rule: 'INC-02' },
    ]);
    const read = await repo.findByDiagnosticId(diagnosticId);
    expect(read?.alternatives).toEqual([included]);
  });

  it('la base exige que un puesto tenga puntaje o la regla que lo incluyó, no ambos ni ninguno', async () => {
    await repo.save(recommendation());
    const [{ id }] = await dataSource.query<{ id: string }[]>(
      `SELECT id FROM irl_diagnostic.portfolio_recommendation WHERE id_diagnostic = $1`,
      [diagnosticId],
    );

    for (const [score, rule] of [
      [null, null],
      [3, 'INC-02'],
    ] as const) {
      await expect(
        dataSource.query(
          `INSERT INTO irl_diagnostic.recommendation_rank
             (id_recommendation, id_service, service_snapshot, position, score, included_by_rule)
           VALUES ($1, $2, 'x', 9, $3, $4)`,
          [id, idAdjustmentOnly, score, rule],
        ),
      ).rejects.toThrow(/ck_recommendation_rank_origin/);
    }
  });

  it('guarda el ranking con el servicio recomendado en la posición 1', async () => {
    await repo.save(recommendation());

    const ranks = await dataSource.query<
      { position: number; service_snapshot: string }[]
    >(
      `SELECT k.position, k.service_snapshot
         FROM irl_diagnostic.recommendation_rank k
         JOIN irl_diagnostic.portfolio_recommendation r ON r.id = k.id_recommendation
        WHERE r.id_diagnostic = $1
        ORDER BY k.position`,
      [diagnosticId],
    );
    expect(ranks).toEqual([
      { position: 1, service_snapshot: 'Consultoría Experta' },
      { position: 2, service_snapshot: 'Reto Express' },
    ]);
  });

  it('no deja nada escrito si la transacción falla a mitad de camino', async () => {
    // The ranking insert is broken with a service that does not exist
    // (`fk_recommendation_rank_service`). If the transaction did not wrap
    // both writes, the recommendation row would stay without its ranking.
    const primary = candidate(999_999, 'Inexistente', 5.55);
    const broken = Recommendation.create({
      diagnosticId: Uuid.create(diagnosticId),
      finalRanking: [primary],
      minimumThreshold: 2.5,
      alternativesCount: 2,
      justification: 'porque sí',
      noRecommendationReason: null,
      trace: {
        layer1Excluded: [],
        rankingBeforeExceptions: [primary],
        appliedExceptions: [],
        discardedExceptions: [],
        rankingAfterExceptions: [primary],
        incompleteCharacterization: [],
        factsHash: 'a'.repeat(64),
      },
      generatedAt: new Date(),
    });

    await expect(repo.save(broken)).rejects.toThrow();

    const [{ count: recs }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_diagnostic.portfolio_recommendation
        WHERE id_diagnostic = $1`,
      [diagnosticId],
    );
    expect(recs).toBe('0');
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
           (id_diagnostic, result_type, criterion_justification, generated_at,
            layer_1_excluded, ranking_before_exceptions, applied_exceptions,
            discarded_exceptions, ranking_after_exceptions, incomplete_characterization, facts_hash)
         VALUES ($1, 'NO_RECOMMENDATION', 'otra', now(), '[]', '[]', '[]', '[]', '[]', '[]', 'h')`,
        [diagnosticId],
      ),
    ).rejects.toThrow(/uq_portfolio_recommendation_diagnostic|duplicate key/);
  });

  it('exige la justificación o el motivo de no recomendar', async () => {
    await expect(
      dataSource.query(
        `INSERT INTO irl_diagnostic.portfolio_recommendation
           (id_diagnostic, result_type, criterion_justification, generated_at,
            layer_1_excluded, ranking_before_exceptions, applied_exceptions,
            discarded_exceptions, ranking_after_exceptions, incomplete_characterization, facts_hash)
         VALUES ($1, 'RECOMMENDATION', NULL, now(), '[]', '[]', '[]', '[]', '[]', '[]', 'h')`,
        [diagnosticId],
      ),
    ).rejects.toThrow(/criterion_justification/);
  });
});

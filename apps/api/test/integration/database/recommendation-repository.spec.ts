import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import type { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { InitialSchema1747526400001 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518001-InitialSchema.js';
import { CatalogConversionAndPairs1747526400002 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518002-CatalogConversionAndPairs.js';
import { RemainingCatalogTables1747526400003 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518003-RemainingCatalogTables.js';
import { RemainingDiagnosticTables1747526400004 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518004-RemainingDiagnosticTables.js';
import { RemoveSingleRuleRoutingModel1747526400005 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518005-RemoveSingleRuleRoutingModel.js';
import { ExtendDiagnosticStateCheck1747526400006 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518006-ExtendDiagnosticStateCheck.js';
import { RoutingCalibration1747526400007 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518007-RoutingCalibration.js';
import { RoutingConfigurationVersion1747526400008 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518008-RoutingConfigurationVersion.js';
import { RoutingConfigurationDraft1747526400009 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518009-RoutingConfigurationDraft.js';
import { RecommendationResultAndTrace1747526400010 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518010-RecommendationResultAndTrace.js';
import { InitiativeCharacterization1747526400011 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518011-InitiativeCharacterization.js';
import { RoadmapDependencyGraph1747526400012 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518012-RoadmapDependencyGraph.js';
import { EnglishCatalogNaming1747526400013 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518013-EnglishCatalogNaming.js';
import { EnglishAnswerNaming1747526400014 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518014-EnglishAnswerNaming.js';
import { EnglishMaturityProfileNaming1747526400015 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518015-EnglishMaturityProfileNaming.js';
import { EnglishRoadmapGraphNaming1747526400016 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518016-EnglishRoadmapGraphNaming.js';
import { EnglishDiagnosticNaming1747526400017 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518017-EnglishDiagnosticNaming.js';
import { EnglishPortfolioRoutingNaming1747526400018 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518018-EnglishPortfolioRoutingNaming.js';
import { EnglishInitiativeConsentNaming1747526400020 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518020-EnglishInitiativeConsentNaming.js';
import { RetireRoutingConfigurationVersioning1747526400021 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518021-RetireRoutingConfigurationVersioning.js';
import { PortfolioRecommendationOrm } from '../../../src/modules/routing/infrastructure/database/orm-entities/portfolio-recommendation.orm-entity.js';
import { RecommendationAlternativeOrm } from '../../../src/modules/routing/infrastructure/database/orm-entities/recommendation-alternative.orm-entity.js';
import { LayerTraceOrm } from '../../../src/modules/routing/infrastructure/database/orm-entities/layer-trace.orm-entity.js';
import { TypeOrmRecommendationRepository } from '../../../src/modules/routing/infrastructure/database/repositories/typeorm-recommendation.repository.js';
import { Recommendation } from '../../../src/modules/routing/domain/entities/recommendation.aggregate.js';
import { Uuid } from '../../../src/shared/kernel/domain/value-objects/uuid.vo.js';
import type { ScoredCandidate } from '../../../src/modules/routing/domain/value-objects/scored-candidate.vo.js';

/**
 * Pruebas de integración del repositorio de recomendaciones.
 *
 * La primera es la que importa: **verifica que la escritura sea atómica**.
 * El puerto de perfil de madurez ya promete atomicidad en su docstring y
 * su caso de uso la rompe con un `Promise.all`; documentar el contrato no
 * basta, así que aquí se comprueba cortando la escritura a la mitad y
 * confirmando que no queda nada.
 *
 * También cubre la garantía que sostiene la base de datos por
 * construcción: una sola recomendación por diagnóstico.
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
      migrations: [
        InitialSchema1747526400001,
        CatalogConversionAndPairs1747526400002,
        RemainingCatalogTables1747526400003,
        RemainingDiagnosticTables1747526400004,
        RemoveSingleRuleRoutingModel1747526400005,
        ExtendDiagnosticStateCheck1747526400006,
        RoutingCalibration1747526400007,
        RoutingConfigurationVersion1747526400008,
        RoutingConfigurationDraft1747526400009,
        RecommendationResultAndTrace1747526400010,
        InitiativeCharacterization1747526400011,
        RoadmapDependencyGraph1747526400012,
        EnglishCatalogNaming1747526400013,
        EnglishAnswerNaming1747526400014,
        EnglishMaturityProfileNaming1747526400015,
        EnglishRoadmapGraphNaming1747526400016,
        EnglishDiagnosticNaming1747526400017,
        EnglishPortfolioRoutingNaming1747526400018,
        EnglishInitiativeConsentNaming1747526400020,
        RetireRoutingConfigurationVersioning1747526400021,
      ],
      migrationsTableName: 'typeorm_migrations',
    });

    await dataSource.initialize();
    await dataSource.runMigrations();

    ormRepo = dataSource.getRepository(PortfolioRecommendationOrm);
    repo = new TypeOrmRecommendationRepository(ormRepo);

    // Configuración mínima para satisfacer las claves foráneas.
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
         (id, keycloak_user_id, state, irl_framework_version)
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
    expect(read?.alternatives.map((a) => a.serviceName)).toEqual([
      'Mentoría',
    ]);
    expect(read?.trace.factsHash).toBe('a'.repeat(64));
  });

  it('no deja nada escrito si la transacción falla a mitad de camino', async () => {
    // Se rompe la tercera escritura (la traza) forzando un fallo de
    // longitud en `facts_hash` (varchar(64)). Si la transacción no
    // envolviera las tres, la fila de recomendación y su alternativa
    // quedarían huérfanas: una recomendación sin traza no se puede
    // explicar, que es exactamente lo que este módulo promete evitar.
    const primary = candidate(idService, 'Consultoría', 5.55);
    const alternate = candidate(idService + 1, 'Mentoría', 3.8);
    const rota = Recommendation.create({
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

    await expect(repo.save(rota)).rejects.toThrow();

    const [{ count: recs }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_diagnostic.portfolio_recommendation
        WHERE id_diagnostic = $1`,
      [diagnosticId],
    );
    // Acotado a este diagnóstico: los casos anteriores dejan sus propias
    // filas y un conteo global las contaría también.
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

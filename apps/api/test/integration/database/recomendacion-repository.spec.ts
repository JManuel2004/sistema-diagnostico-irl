import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import type { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { InitialSchema1747526400001 } from '../../../src/infrastructure/database/migrations/20260518001-InitialSchema.js';
import { CatalogConversionAndPairs1747526400002 } from '../../../src/infrastructure/database/migrations/20260518002-CatalogConversionAndPairs.js';
import { RemainingCatalogTables1747526400003 } from '../../../src/infrastructure/database/migrations/20260518003-RemainingCatalogTables.js';
import { RemainingDiagnosticTables1747526400004 } from '../../../src/infrastructure/database/migrations/20260518004-RemainingDiagnosticTables.js';
import { RemoveSingleRuleRoutingModel1747526400005 } from '../../../src/infrastructure/database/migrations/20260518005-RemoveSingleRuleRoutingModel.js';
import { ExtendDiagnosticStateCheck1747526400006 } from '../../../src/infrastructure/database/migrations/20260518006-ExtendDiagnosticStateCheck.js';
import { RoutingCalibration1747526400007 } from '../../../src/infrastructure/database/migrations/20260518007-RoutingCalibration.js';
import { RoutingConfigurationVersion1747526400008 } from '../../../src/infrastructure/database/migrations/20260518008-RoutingConfigurationVersion.js';
import { RoutingConfigurationDraft1747526400009 } from '../../../src/infrastructure/database/migrations/20260518009-RoutingConfigurationDraft.js';
import { RecommendationResultAndTrace1747526400010 } from '../../../src/infrastructure/database/migrations/20260518010-RecommendationResultAndTrace.js';
import { InitiativeCharacterization1747526400011 } from '../../../src/infrastructure/database/migrations/20260518011-InitiativeCharacterization.js';
import { RecomendacionPortafolioOrm } from '../../../src/modules/portfolio-routing/infrastructure/persistence/recomendacion-portafolio.orm-entity.js';
import { AlternativaRecomendacionOrm } from '../../../src/modules/portfolio-routing/infrastructure/persistence/alternativa-recomendacion.orm-entity.js';
import { TrazaCapasOrm } from '../../../src/modules/portfolio-routing/infrastructure/persistence/traza-capas.orm-entity.js';
import { TypeOrmRecomendacionRepository } from '../../../src/modules/portfolio-routing/infrastructure/persistence/typeorm-recomendacion.repository.js';
import { Recomendacion } from '../../../src/modules/portfolio-routing/domain/entities/recomendacion.aggregate.js';
import { Uuid } from '../../../src/shared-kernel/domain/value-objects/uuid.vo.js';
import type { CandidatoPuntuado } from '../../../src/modules/portfolio-routing/domain/value-objects/candidato-puntuado.vo.js';

/**
 * Pruebas de integración del repositorio de recomendaciones.
 *
 * La primera es la que importa: **verifica que la escritura sea atómica**.
 * El puerto de perfil de madurez ya promete atomicidad en su docstring y
 * su caso de uso la rompe con un `Promise.all`; documentar el contrato no
 * basta, así que aquí se comprueba cortando la escritura a la mitad y
 * confirmando que no queda nada.
 *
 * También cubre las garantías que sostiene la base de datos por
 * construcción: una sola versión vigente, y una sola recomendación por
 * diagnóstico.
 */
describe('Recomendación — persistencia (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let repo: TypeOrmRecomendacionRepository;
  let ormRepo: Repository<RecomendacionPortafolioOrm>;
  let idVersion: string;
  let idCalibracion: string;
  let idParametros: string;
  let idServicio: number;
  let diagnosticId: string;

  const candidato = (
    id: number,
    nombre: string,
    total: number,
  ): CandidatoPuntuado => ({
    idServicio: id,
    nombreServicio: nombre,
    aportes: {
      cuelloBotella: { valor: 0, detalle: [] },
      brechas: { valor: 0, detalle: [] },
      desequilibrios: { valor: 0, detalle: [] },
      afinidadEtapa: { valor: 0, coincide: false },
      penalizacionRango: { valor: 0, aplicada: false },
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
        RecomendacionPortafolioOrm,
        AlternativaRecomendacionOrm,
        TrazaCapasOrm,
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
      ],
      migrationsTableName: 'typeorm_migrations',
    });

    await dataSource.initialize();
    await dataSource.runMigrations();

    ormRepo = dataSource.getRepository(RecomendacionPortafolioOrm);
    repo = new TypeOrmRecomendacionRepository(ormRepo);

    // Configuración mínima para satisfacer las claves foráneas.
    [{ id_snapshot_calibracion: idCalibracion }] = await dataSource.query(
      `INSERT INTO irl_catalog.snapshot_calibracion (numero, autor_id, estado)
       VALUES (1, 't', 'PUBLICADO') RETURNING id_snapshot_calibracion`,
    );
    [{ id_snapshot_parametros: idParametros }] = await dataSource.query(
      `INSERT INTO irl_catalog.snapshot_parametros
         (numero, autor_id, peso_cuello_botella, peso_brecha,
          peso_desequilibrio_moderado, peso_desequilibrio_critico,
          peso_afinidad_etapa, penalizacion_fuera_rango, umbral_minimo,
          n_alternativas, estado)
       VALUES (1,'t',3,1.5,0.5,1,0.8,2,2.5,2,'PUBLICADO')
       RETURNING id_snapshot_parametros`,
    );
    [{ id_version_configuracion: idVersion }] = await dataSource.query(
      `INSERT INTO irl_catalog.version_configuracion
         (numero, autor_id, id_snapshot_calibracion, id_snapshot_parametros, estado)
       VALUES (1,'t',$1,$2,'VIGENTE') RETURNING id_version_configuracion`,
      [idCalibracion, idParametros],
    );
    [{ id_servicio: idServicio }] = await dataSource.query(
      `INSERT INTO irl_catalog.servicio_portafolio (nombre, activo)
       VALUES ('Consultoría', true) RETURNING id_servicio`,
    );
    await dataSource.query(
      `INSERT INTO irl_catalog.servicio_portafolio (nombre, activo)
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
      `INSERT INTO irl_diagnostic.diagnostico
         (id_diagnostico, keycloak_user_id, estado, version_marco_irl)
       VALUES ($1,'u','PERFIL_GENERADO','KTH-IRL-1.0')`,
      [diagnosticId],
    );
  });

  function recomendacion(): Recomendacion {
    const principal = candidato(idServicio, 'Consultoría', 5.55);
    const alterna = candidato(idServicio + 1, 'Mentoría', 3.8);
    return Recomendacion.create({
      diagnosticId: Uuid.create(diagnosticId),
      idVersionConfiguracion: idVersion,
      idSnapshotCalibracion: idCalibracion,
      idSnapshotParametros: idParametros,
      rankingFinal: [principal, alterna],
      umbralMinimo: 2.5,
      nAlternativas: 2,
      justificacion: 'porque sí',
      motivoSinRecomendacion: null,
      traza: {
        excluidosCapa1: [],
        rankingPreExcepcion: [principal, alterna],
        excepcionesActivadas: [],
        excepcionesDescartadas: [],
        rankingPostExcepcion: [principal, alterna],
        caracterizacionIncompleta: [],
        hashHechos: 'a'.repeat(64),
      },
      generadaEn: new Date(),
    });
  }

  it('persiste recomendación, alternativas y traza, y las recupera íntegras', async () => {
    await repo.save(recomendacion());

    const leida = await repo.findByDiagnosticId(diagnosticId);
    expect(leida?.principal?.nombreServicio).toBe('Consultoría');
    expect(leida?.principal?.total).toBeCloseTo(5.55, 3);
    expect(leida?.alternativas.map((a) => a.nombreServicio)).toEqual([
      'Mentoría',
    ]);
    expect(leida?.traza.hashHechos).toBe('a'.repeat(64));
  });

  it('no deja nada escrito si la transacción falla a mitad de camino', async () => {
    // Se rompe la tercera escritura (la traza) forzando un fallo de clave
    // foránea. Si la transacción no envolviera las tres, la fila de
    // recomendación y su alternativa quedarían huérfanas: una
    // recomendación sin traza no se puede explicar, que es exactamente lo
    // que este módulo promete evitar.
    const rota = recomendacion();
    Object.defineProperty(rota, 'idSnapshotCalibracion', {
      value: '999999',
      writable: false,
    });

    await expect(repo.save(rota)).rejects.toThrow();

    const [{ count: recs }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_diagnostic.recomendacion_portafolio
        WHERE id_diagnostico = $1`,
      [diagnosticId],
    );
    // Acotado a este diagnóstico: los casos anteriores dejan sus propias
    // filas y un conteo global las contaría también.
    const [{ count: alts }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count
         FROM irl_diagnostic.alternativa_recomendacion a
         JOIN irl_diagnostic.recomendacion_portafolio r
           ON r.id_recomendacion = a.id_recomendacion
        WHERE r.id_diagnostico = $1`,
      [diagnosticId],
    );
    const [{ count: trazas }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count
         FROM irl_diagnostic.traza_capas t
         JOIN irl_diagnostic.recomendacion_portafolio r
           ON r.id_recomendacion = t.id_recomendacion
        WHERE r.id_diagnostico = $1`,
      [diagnosticId],
    );

    expect(recs).toBe('0');
    expect(alts).toBe('0');
    expect(trazas).toBe('0');
  });

  it('regenerar reemplaza por completo en vez de acumular', async () => {
    await repo.save(recomendacion());
    await repo.save(recomendacion());

    const [{ count }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_diagnostic.recomendacion_portafolio
        WHERE id_diagnostico = $1`,
      [diagnosticId],
    );
    expect(count).toBe('1');
  });

  it('la base de datos impide dos recomendaciones para el mismo diagnóstico', async () => {
    await repo.save(recomendacion());

    await expect(
      dataSource.query(
        `INSERT INTO irl_diagnostic.recomendacion_portafolio
           (id_diagnostico, id_version_configuracion, resultado_tipo,
            servicio_snapshot, justificacion_criterio, fecha_generacion)
         VALUES ($1, $2, 'SIN_RECOMENDACION', NULL, 'otra', now())`,
        [diagnosticId, idVersion],
      ),
    ).rejects.toThrow(/uq_recomendacion_diagnostico|duplicate key/);
  });

  it('la base de datos impide dos versiones de configuración vigentes', async () => {
    // Garantía por construcción: sobrevive a una condición de carrera en
    // la publicación sin depender de que el código ordene bien.
    await expect(
      dataSource.query(
        `INSERT INTO irl_catalog.version_configuracion
           (numero, autor_id, id_snapshot_calibracion, id_snapshot_parametros, estado)
         VALUES (99,'t',$1,$2,'VIGENTE')`,
        [idCalibracion, idParametros],
      ),
    ).rejects.toThrow(/ux_version_unica_vigente|duplicate key/);
  });

  it('rechaza una recomendación incoherente: sin servicio pero de tipo RECOMENDACION', async () => {
    await expect(
      dataSource.query(
        `INSERT INTO irl_diagnostic.recomendacion_portafolio
           (id_diagnostico, id_version_configuracion, resultado_tipo,
            id_servicio_principal, puntaje_principal, servicio_snapshot,
            justificacion_criterio, fecha_generacion)
         VALUES ($1, $2, 'RECOMENDACION', NULL, NULL, NULL, NULL, now())`,
        [diagnosticId, idVersion],
      ),
    ).rejects.toThrow(/ck_recomendacion_coherencia/);
  });
});

import { beforeAll, afterAll, describe, expect, it } from '@jest/globals';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { roadmapResponseSchema } from '@innlab/contracts';
import { AppModule } from '../../../../src/app.module.js';
import { configureApp } from '../../../../src/infrastructure/http/configure-app.js';

/**
 * E2E — roadmap de escalamiento para el perfil de AgroConecta.
 *
 * Requiere la base migrada y sembrada:
 *   pnpm --filter @innlab/api db:migration:run && db:seed
 *
 * Sigue el patrón de las demás suites e2e (AppModule real + supertest
 * contra la base configurada). Crea su propio diagnóstico con un UUID
 * aleatorio y lo borra al terminar: las suites e2e corren en procesos
 * separados y comparten base, así que ninguna puede asumir que es la
 * única escribiendo.
 *
 * Las 48 respuestas producen exactamente el perfil del caso mediante la
 * tabla de conversión SA-06:
 *
 *   TRL  suma 25 → 3.125 → IRL 6      IPRL suma  9 → 1.125 → IRL 1
 *   CRL  suma 19 → 2.375 → IRL 4      TmRL suma 22 → 2.750 → IRL 5
 *   BRL  suma 16 → 2.000 → IRL 3      FRL  suma 12 → 1.500 → IRL 2
 */
const RESPUESTAS_POR_DIMENSION: Record<string, number[]> = {
  TRL: [4, 3, 3, 3, 3, 3, 3, 3],
  CRL: [3, 2, 2, 2, 2, 2, 3, 3],
  BRL: [2, 2, 2, 2, 2, 2, 2, 2],
  IPRL: [2, 1, 1, 1, 1, 1, 1, 1],
  TmRL: [3, 3, 3, 3, 3, 3, 2, 2],
  FRL: [2, 2, 2, 2, 1, 1, 1, 1],
};

describe('Roadmap de escalamiento (e2e) — AgroConecta', () => {
  let app: NestFastifyApplication;
  let dataSource: DataSource;
  let diagnosticId: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({ logger: false }),
    );
    configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    dataSource = app.get(DataSource);
    diagnosticId = randomUUID();

    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostico
         (id_diagnostico, keycloak_user_id, estado, version_marco_irl)
       VALUES ($1, 'usuario-e2e-roadmap', 'CUESTIONARIO_EN_CURSO', 'KTH-IRL-1.0')`,
      [diagnosticId],
    );

    const afirmaciones = await dataSource.query<
      { id_afirmacion: string; codigo: string; numero_en_dimension: number }[]
    >(
      `SELECT a.id_afirmacion, d.codigo, a.numero_en_dimension
         FROM irl_catalog.afirmacion a
         JOIN irl_catalog.dimension d ON d.id_dimension = a.id_dimension
        ORDER BY d.orden, a.numero_en_dimension`,
    );

    const answers = afirmaciones.map((a) => ({
      statementId: String(a.id_afirmacion),
      value: RESPUESTAS_POR_DIMENSION[a.codigo][a.numero_en_dimension - 1],
    }));

    await request(app.getHttpServer())
      .post(`/api/v1/diagnosticos/${diagnosticId}/finalizar-inicial`)
      .send({ answers })
      .expect(201);
  }, 60_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(
        `DELETE FROM irl_diagnostic.diagnostico WHERE id_diagnostico = $1`,
        [diagnosticId],
      );
    }
    await app?.close();
  });

  it('el perfil de partida es el de AgroConecta', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/diagnosticos/${diagnosticId}/perfil`)
      .expect(200);

    const perfil = res.body as {
      dimensionResults: { dimensionCode: string; irlLevel: number }[];
    };
    expect(
      Object.fromEntries(
        perfil.dimensionResults.map((r) => [r.dimensionCode, r.irlLevel]),
      ),
    ).toEqual({ TRL: 6, CRL: 4, BRL: 3, IPRL: 1, TmRL: 5, FRL: 2 });
  });

  it('GET /roadmap devuelve dos fases con el orden de dependencias esperado', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/diagnosticos/${diagnosticId}/roadmap`)
      .expect(200);

    const roadmap = roadmapResponseSchema.parse(res.body);

    expect(roadmap.phases).toHaveLength(2);

    // Fase 1: Modelo de Negocio y Propiedad Intelectual, en paralelo.
    expect(roadmap.phases[0].order).toBe(1);
    expect(roadmap.phases[0].dimensions.map((d) => d.dimensionCode)).toEqual([
      'BRL',
      'IPRL',
    ]);

    // Fase 2: Financiamiento, que dependía de ambas.
    expect(roadmap.phases[1].order).toBe(2);
    expect(roadmap.phases[1].dimensions.map((d) => d.dimensionCode)).toEqual([
      'FRL',
    ]);
  });

  it('excluye Tecnología, Cliente y Equipo, y lo dice explícitamente', () => {
    return request(app.getHttpServer())
      .get(`/api/v1/diagnosticos/${diagnosticId}/roadmap`)
      .expect(200)
      .expect((res) => {
        const roadmap = roadmapResponseSchema.parse(res.body);

        expect([...roadmap.dimensionsWithoutIntervention].sort()).toEqual([
          'CRL',
          'TRL',
          'TmRL',
        ]);

        const intervenidas = roadmap.phases.flatMap((f) =>
          f.dimensions.map((d) => d.dimensionCode),
        );
        expect(intervenidas).not.toContain('TRL');
        expect(intervenidas).not.toContain('CRL');
        expect(intervenidas).not.toContain('TmRL');
      });
  });

  it('lleva las tres dimensiones intervenidas hasta el nivel 4', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/diagnosticos/${diagnosticId}/roadmap`)
      .expect(200);
    const roadmap = roadmapResponseSchema.parse(res.body);

    const metas = Object.fromEntries(
      roadmap.phases.flatMap((f) =>
        f.dimensions.map((d) => [
          d.dimensionCode,
          { de: d.currentLevel, a: d.targetLevel },
        ]),
      ),
    );

    expect(metas).toEqual({
      BRL: { de: 3, a: 4 },
      IPRL: { de: 1, a: 4 },
      FRL: { de: 2, a: 4 },
    });
  });

  it('expone qué desbloquea cada dimensión, para que el orden sea refutable', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/diagnosticos/${diagnosticId}/roadmap`)
      .expect(200);
    const roadmap = roadmapResponseSchema.parse(res.body);

    const habilita = Object.fromEntries(
      roadmap.phases.flatMap((f) =>
        f.dimensions.map((d) => [d.dimensionCode, d.enables]),
      ),
    );

    expect(habilita).toEqual({ BRL: ['FRL'], IPRL: ['FRL'], FRL: [] });
  });

  it('un diagnóstico sin perfil calculado devuelve 409, no 404', async () => {
    const otro = randomUUID();
    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostico
         (id_diagnostico, keycloak_user_id, estado, version_marco_irl)
       VALUES ($1, 'usuario-e2e-roadmap', 'CUESTIONARIO_EN_CURSO', 'KTH-IRL-1.0')`,
      [otro],
    );

    try {
      await request(app.getHttpServer())
        .get(`/api/v1/diagnosticos/${otro}/roadmap`)
        .expect(409);
    } finally {
      await dataSource.query(
        `DELETE FROM irl_diagnostic.diagnostico WHERE id_diagnostico = $1`,
        [otro],
      );
    }
  });
});

import { beforeAll, afterAll, describe, expect, it } from '@jest/globals';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import {
  recomendacionResponseSchema,
  trazaCapasResponseSchema,
} from '@innlab/contracts';
import { AppModule } from '../../../../src/app.module.js';
import { configureApp } from '../../../../src/infrastructure/http/configure-app.js';

/**
 * E2E — recorrido completo de enrutamiento al portafolio para AgroConecta.
 *
 * Requiere la base de datos real, migrada y sembrada:
 *   pnpm --filter @innlab/api db:migration:run && db:seed
 *
 * Sigue el patrón de la suite e2e existente (`AppModule` real + supertest
 * contra la base configurada), no Testcontainers. Migrarla sería una
 * mejora, pero cambiar el patrón de las pruebas e2e es una decisión
 * aparte de este trabajo.
 *
 * Las 48 respuestas están calculadas para producir exactamente el perfil
 * del caso. Con 8 respuestas por dimensión y la tabla de conversión SA-06:
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

describe('Enrutamiento de portafolio (e2e) — AgroConecta', () => {
  let app: NestFastifyApplication;
  let dataSource: DataSource;
  let diagnosticId: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Mismo adaptador y mismo pipeline que `main.ts`. El harness anterior
    // montaba la app con el adaptador Express por defecto y sin filtros de
    // excepción, así que no ejercía el pipeline que se despliega.
    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({ logger: false }),
    );
    configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    dataSource = app.get(DataSource);
    diagnosticId = randomUUID();

    // ── Diagnóstico y caracterización de la iniciativa ────────────────
    //
    // Se insertan directamente porque el registro de iniciativa (RF-04 /
    // HU-06) no tiene endpoint. En cuanto exista, este bloque se sustituye
    // por las llamadas HTTP correspondientes.
    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostico
         (id_diagnostico, keycloak_user_id, estado, version_marco_irl)
       VALUES ($1, 'usuario-e2e', 'CUESTIONARIO_EN_CURSO', 'KTH-IRL-1.0')`,
      [diagnosticId],
    );

    await dataSource.query(
      `INSERT INTO irl_catalog.sector (nombre, activo)
       VALUES ('Agroindustria', true)
       ON CONFLICT (nombre) DO NOTHING`,
    );

    await dataSource.query(
      `INSERT INTO irl_diagnostic.iniciativa
         (id_iniciativa, id_diagnostico, id_sector, nombre, descripcion_breve,
          id_etapa, tamano_equipo, vinculacion_academica)
       SELECT $1, $2, s.id_sector, 'AgroConecta',
              'Plataforma de trazabilidad y comercialización de café',
              e.id_etapa, 3, false
         FROM irl_catalog.sector s, irl_catalog.etapa_iniciativa e
        WHERE s.nombre = 'Agroindustria' AND e.codigo = 'validacion'`,
      [randomUUID(), diagnosticId],
    );

    // ── Cuestionario + perfil de madurez ──────────────────────────────
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
    const niveles = Object.fromEntries(
      perfil.dimensionResults.map((r) => [r.dimensionCode, r.irlLevel]),
    );
    expect(niveles).toEqual({
      TRL: 6,
      CRL: 4,
      BRL: 3,
      IPRL: 1,
      TmRL: 5,
      FRL: 2,
    });
  });

  it('POST /recomendacion devuelve Consultoría con sus dos alternativas', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/diagnosticos/${diagnosticId}/recomendacion`)
      .expect(201);

    const dto = recomendacionResponseSchema.parse(res.body);

    expect(dto.resultadoTipo).toBe('RECOMENDACION');
    expect(dto.principal?.nombre).toBe('Consultoría');
    expect(dto.principal?.puntaje).toBeCloseTo(5.55, 3);
    expect(dto.alternativas.map((a) => a.nombre)).toEqual([
      'Mentoría',
      'Proyectos Integradores',
    ]);
    expect(dto.alternativas.map((a) => a.posicion)).toEqual([2, 3]);
  });

  it('la justificación cita el motivo declarado del ajuste que decidió el puesto', () => {
    return request(app.getHttpServer())
      .get(`/api/v1/diagnosticos/${diagnosticId}/recomendacion`)
      .expect(200)
      .expect((res) => {
        const dto = recomendacionResponseSchema.parse(res.body);
        expect(dto.justificacion).toContain('riesgo legal crítico');
      });
  });

  it('GET /recomendacion/traza expone las tres capas y atribuye el resultado a E-01', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/diagnosticos/${diagnosticId}/recomendacion/traza`)
      .expect(200);

    const traza = trazaCapasResponseSchema.parse(res.body);

    // Capa 1
    expect(traza.excluidosCapa1.map((e) => e.nombre)).toEqual([
      'Proyectos de Grado',
    ]);

    // Capa 2 — el ranking del cálculo puro, antes de cualquier ajuste
    expect(traza.rankingPreExcepcion.map((r) => r.nombre)).toEqual([
      'Consultoría',
      'Mentoría',
      'Proyectos Integradores',
      'Formación',
      'Retos en el Aula',
    ]);

    // Capa 3 — qué ajuste se activó, cuál no, y por qué
    expect(traza.excepcionesActivadas.map((e) => e.codigo)).toEqual(['E-01']);
    expect(traza.excepcionesDescartadas.map((e) => e.codigo)).toEqual([
      'E-02',
      'E-03',
    ]);
    expect(traza.excepcionesActivadas[0].rankingAntes[0].nombre).toBe(
      'Consultoría',
    );
    expect(traza.excepcionesActivadas[0].rankingDespues[0].nombre).toBe(
      'Consultoría',
    );

    // Consultoría ganó el cálculo y además fue fijada: el resultado NO se
    // debe a que un ajuste desplazara al ganador.
    expect(traza.ajustadoPorExcepcion).toBe(false);

    // La caracterización está completa en este caso, así que no hay
    // degradación silenciosa que anotar.
    expect(traza.caracterizacionIncompleta).toEqual([]);

    expect(traza.versionConfiguracion).toBe(1);
    expect(traza.hashHechos).toHaveLength(64);
  });

  it('regenerar la recomendación es idempotente y no acumula filas', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/diagnosticos/${diagnosticId}/recomendacion`)
      .expect(201);

    const [{ count }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count
         FROM irl_diagnostic.recomendacion_portafolio
        WHERE id_diagnostico = $1`,
      [diagnosticId],
    );
    expect(count).toBe('1');
  });

  it('un diagnóstico sin recomendación generada devuelve 409, no 404', async () => {
    const otro = randomUUID();
    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostico
         (id_diagnostico, keycloak_user_id, estado, version_marco_irl)
       VALUES ($1, 'usuario-e2e', 'CUESTIONARIO_EN_CURSO', 'KTH-IRL-1.0')`,
      [otro],
    );

    try {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/diagnosticos/${otro}/recomendacion`)
        .expect(409);
      expect((res.body as { code: string }).code).toBe(
        'ROUTING_RECOMMENDATION_NOT_GENERATED',
      );
    } finally {
      await dataSource.query(
        `DELETE FROM irl_diagnostic.diagnostico WHERE id_diagnostico = $1`,
        [otro],
      );
    }
  });
});

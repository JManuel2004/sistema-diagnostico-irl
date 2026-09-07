import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../../../../src/app.module.js';
import { configureApp } from '../../../../src/infrastructure/http/configure-app.js';
import { questionnaireStructureSchema } from '@innlab/contracts';

/**
 * E2E test suite: `GET /api/v1/catalogo/cuestionario` — questionnaire structure endpoint.
 *
 * HU-07 acceptance criteria:
 *  AC-1: Exactly 6 dimensions, each with exactly 8 statements.
 *  AC-2: Dimensions returned in stable order.
 *  AC-3: Statements within each dimension in stable order (secuencia 1..8).
 *  AC-6: Endpoint is idempotent and reads cleanly.
 *
 * Non-functional:
 *  NF-1: Response under 500ms at p95 (conservative baseline).
 *  NF-2: Endpoint is read-only and idempotent.
 */
describe('GET /api/v1/catalogo/cuestionario (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    // Build the test module using the real AppModule to get all wiring
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({ logger: false }),
    );
    configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    // Note: This test assumes the database is available via the configured
    // connection string (e.g., docker-compose or local DB). The integration
    // tests use Testcontainers; this test uses the real DB.
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  describe('Questionnaire structure endpoint', () => {
    it('returns 200 with the complete questionnaire structure', async () => {
      const start = Date.now();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await request(app.getHttpServer()).get(
        '/api/v1/catalogo/cuestionario',
      );
      const elapsed = Date.now() - start;

      // AC-6: Returns 200
      expect(response.status).toBe(200);

      // Response body parses with the contract schema
      const parsed = questionnaireStructureSchema.parse(response.body);

      // AC-1: Exactly 6 dimensions
      expect(parsed.dimensions).toHaveLength(6);

      // AC-1: Each dimension has exactly 8 statements
      for (const dimension of parsed.dimensions) {
        expect(dimension.statements).toHaveLength(8);
      }

      // AC-2: Dimensions are in a stable order (framework order: TRL → CRL → BRL → IPRL → TmRL → FRL)
      const codes = parsed.dimensions.map((d) => d.code);
      expect(codes).toEqual(['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL']);

      // AC-3: Statements within each dimension are ordered by sequence (1..8)
      for (const dimension of parsed.dimensions) {
        const sequences = dimension.statements.map((s) => s.sequence);
        expect(sequences).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      }

      // NF-1: Response completes in under 2000ms (sanity baseline for local/CI)
      expect(elapsed).toBeLessThan(2000);
    });

    it('returns consistent results on multiple calls (idempotency)', async () => {
      // Call the endpoint twice and verify the responses are identical
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response1 = await request(app.getHttpServer()).get(
        '/api/v1/catalogo/cuestionario',
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response2 = await request(app.getHttpServer()).get(
        '/api/v1/catalogo/cuestionario',
      );

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Bodies should be identical (same questionnaire structure, same seed)
      expect(response1.body).toEqual(response2.body);
    });

    it('response body contains required fields in each dimension', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await request(app.getHttpServer()).get(
        '/api/v1/catalogo/cuestionario',
      );
      const parsed = questionnaireStructureSchema.parse(response.body);

      for (const dimension of parsed.dimensions) {
        // Required fields per the schema
        expect(dimension).toHaveProperty('code');
        expect(dimension).toHaveProperty('name');
        expect(dimension).toHaveProperty('description');
        expect(dimension).toHaveProperty('sequence');
        expect(dimension).toHaveProperty('statements');

        // Validate types
        expect(typeof dimension.code).toBe('string');
        expect(typeof dimension.name).toBe('string');
        expect(typeof dimension.description).toBe('string');
        expect(typeof dimension.sequence).toBe('number');
        expect(Array.isArray(dimension.statements)).toBe(true);
      }
    });

    it('response body contains required fields in each statement', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await request(app.getHttpServer()).get(
        '/api/v1/catalogo/cuestionario',
      );
      const parsed = questionnaireStructureSchema.parse(response.body);

      for (const dimension of parsed.dimensions) {
        for (const statement of dimension.statements) {
          // Required fields per the schema
          expect(statement).toHaveProperty('id');
          expect(statement).toHaveProperty('dimensionCode');
          expect(statement).toHaveProperty('sequence');
          expect(statement).toHaveProperty('text');

          // Validate types
          expect(typeof statement.id).toBe('string');
          expect(typeof statement.dimensionCode).toBe('string');
          expect(typeof statement.sequence).toBe('number');
          expect(typeof statement.text).toBe('string');

          // Validate statement sequence is within 1..8
          expect(statement.sequence).toBeGreaterThanOrEqual(1);
          expect(statement.sequence).toBeLessThanOrEqual(8);

          // Validate text is not empty
          expect(statement.text.trim().length).toBeGreaterThan(0);
        }
      }
    });

    it('returns a versionMarco field for cache invalidation', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await request(app.getHttpServer()).get(
        '/api/v1/catalogo/cuestionario',
      );
      const parsed = questionnaireStructureSchema.parse(response.body);

      expect(parsed).toHaveProperty('versionMarco');
      expect(typeof parsed.versionMarco).toBe('string');
      expect(parsed.versionMarco.length).toBeGreaterThan(0);
    });
  });
});
